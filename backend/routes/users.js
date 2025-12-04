import express from "express";
import bcrypt from "bcrypt";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import authenticate from "../middleware/authenticate.js";
import requireClearance from "../middleware/requireClearance.js";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import path from "path";

const router = express.Router();
const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const avatarUploadPath = path.join(__dirname, "..", "uploads", "avatars");
const storage = multer.diskStorage({
    destination: avatarUploadPath,
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ storage });


// ---------------- VALIDATORS ----------------

function isValidUofTEmail(email) {
    return /^[A-Za-z0-9._%+-]+@mail\.utoronto\.ca$/.test(email);
}
function isValidUtorid(id) {
    return /^[A-Za-z0-9]{7,8}$/.test(id);
}

// ---------------- /users/me (PATCH) ----------------
// Clearance: Regular+
router.patch(
    "/me",
    authenticate,
    upload.single("avatarUrl"),
    async (req, res) => {
        try {
            const userId = req.user.id;

            // ----------------------------
            // STRICT ALLOWED FIELDS
            // ----------------------------
            const allowed = ["name", "email", "birthday", "avatar"];
            const bodyKeys = Object.keys(req.body);

            if (bodyKeys.length === 0 && !req.file) {
                return res.status(400).json({ error: "Missing fields in request 1" });
            }

            for (const key of bodyKeys) {
                if (!allowed.includes(key)) {
                    return res.status(400).json({ error: "Invalid fields in request" });
                }
            }

            const allEmpty = bodyKeys.every(key => {
                const value = req.body[key];
                return value === null || value === undefined || value === "";
            });

            if (allEmpty && !req.file) {
                return res.status(400).json({ error: "Missing fields in request 2" });
            }

            // ----------------------------
            // BUILD UPDATE DATA
            // ----------------------------
            const data = {};

            // -------- NAME --------
            if ("name" in req.body && req.body.name !== null) {
                const name = req.body.name.trim();
                if (name.length < 1 || name.length > 50) {
                    return res.status(400).json({ error: "Invalid name" });
                }
                data.name = name;
            }

            // -------- EMAIL --------
            if ("email" in req.body && req.body.email !== null) {
                const email = req.body.email.trim();
                const emailRegex = /^[A-Za-z0-9._%+-]+@mail\.utoronto\.ca$/;

                if (!emailRegex.test(email)) {
                    return res.status(400).json({ error: "Invalid UofT email" });
                }

                data.email = email;
            }

            // -------- BIRTHDAY --------
            if ("birthday" in req.body) {
                const raw = req.body.birthday;

                // If null → do NOT update birthday (skip)
                if (raw === null) {
                    // do nothing (don't put anything in data)
                } else {
                    // Must be string
                    if (typeof raw !== "string" || raw.trim() === "") {
                        return res.status(400).json({ error: "Invalid birthday format" });
                    }

                    // Must match YYYY-MM-DD
                    const regex = /^\d{4}-\d{2}-\d{2}$/;
                    if (!regex.test(raw)) {
                        return res.status(400).json({ error: "Invalid birthday format" });
                    }

                    const d = new Date(raw);

                    // Reject invalid date (e.g. Feb 30)
                    if (isNaN(d.getTime())) {
                        return res.status(400).json({ error: "Invalid birthday format" });
                    }

                    // Round-trip check: ensure date is real
                    const iso = d.toISOString().split("T")[0];
                    if (iso !== raw) {
                        return res.status(400).json({ error: "Invalid birthday format" });
                    }

                    // Valid → update the date
                    data.birthday = d.toISOString();
                }
            }
            // -------- AVATAR UPLOAD --------
            if (req.file) {
                data.avatarUrl = req.file.filename;
            }

            // ----------------------------
            // UPDATE USER SAFELY
            // ----------------------------
            const updated = await prisma.user.update({
                where: { id: userId },
                data,
                select: {
                    id: true,
                    utorid: true,
                    name: true,
                    email: true,
                    birthday: true,
                    role: true,
                    points: true,
                    createdAt: true,
                    lastLogin: true,
                    verified: true,
                    suspicious: true,
                    avatarUrl: true
                }
            });

            // Convert from 1987-06-05T00:00:00.000Z → 1987-06-05
            if (updated.birthday) {
                updated.birthday = updated.birthday.toISOString().split("T")[0];
            }
            return res.status(200).json(updated);
        

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

// ---------------- /users (POST) -------------------
// Clearance: Cashier+  (manager, superuser)
router.post(
    "/",
    authenticate,
    requireClearance(["manager", "superuser"]),
    async (req, res) => {
        try {
            let { utorid, name, email, role, password } = req.body;

            // ---------- Required Fields ----------
            if (!utorid)
                return res.status(400).json({ message: "Utorid is required" });
            if (!name)
                return res.status(400).json({ message: "Name is required" });
            if (!email)
                return res.status(400).json({ message: "Email is required" });

            // ---------- Validation ----------
            if (!isValidUtorid(utorid))
                return res.status(400).json({ message: "Invalid utorid format" });

            if (name.length < 1 || name.length > 50)
                return res.status(400).json({ message: "Invalid name length" });

            if (!isValidUofTEmail(email))
                return res.status(400).json({ message: "Invalid UofT email" });

            // ---------- Unique Check ----------
            const existing = await prisma.user.findFirst({
                where: { OR: [{ utorid }, { email }] },
            });
            if (existing)
                return res.status(409).json({ error: "User already exists" });

            // ---------- ROLE ASSIGNMENT ----------
            // Default: regular
            let finalRole = "regular";

            // Managers can create: regular, cashier
            if (req.user.role === "manager") {
                if (role === "cashier") finalRole = "cashier";
            }

            // Superusers can create ANY role
            if (req.user.role === "superuser") {
                if (["regular", "cashier", "manager", "superuser"].includes(role)) {
                    finalRole = role;
                }
            }

            // ---------- PASSWORD HANDLING ----------
            let hashedPassword = null;
            if (password) {
                // Accept immediate password (super useful for admin-created accounts)
                hashedPassword = bcrypt.hashSync(password, 10);
            }

            // ---------- If no password → use resetToken workflow ----------
            let resetToken = null;
            let expiresAt = null;

            if (!hashedPassword) {
                resetToken = randomUUID();
                expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7);
                resetTokens.set(resetToken, { utorid, expiresAt });
            }

            // ---------- CREATE USER ----------
            const user = await prisma.user.create({
                data: {
                    utorid,
                    name,
                    email,
                    role: finalRole,
                    password: hashedPassword, // may be null
                    verified: !!hashedPassword, // auto-verified if password was set
                },
                select: {
                    id: true,
                    utorid: true,
                    name: true,
                    email: true,
                    role: true,
                    verified: true,
                },
            });

            // ---------- RESPONSE ----------
            if (hashedPassword) {
                // No need for reset token, user is ready
                return res.status(201).json(user);
            }

            // Otherwise return resetToken
            return res.status(201).json({
                ...user,
                resetToken,
                expiresAt: expiresAt.toISOString(),
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

// ---------------- /User (POST) -------------------
// Clearance: Cashier+
router.post(
    "/",
    authenticate,
    requireClearance(["cashier", "manager", "superuser"]),
    async (req, res) => {
        try {
            const { utorid, name, email } = req.body;

            if (!utorid)
                return res.status(400).json({ message: "Utorid is required" });
            if (!name)
                return res.status(400).json({ message: "Name is required" });
            if (!email)
                return res.status(400).json({ message: "Email is required" });

            if (!isValidUtorid(utorid))
                return res.status(400).json({ message: "Invalid utorid format" });

            if (name.length < 1 || name.length > 50)
                return res.status(400).json({ message: "Invalid name length" });

            if (!isValidUofTEmail(email))
                return res.status(400).json({ message: "Invalid UofT email" });

            const existing = await prisma.user.findFirst({
                where: { OR: [{ utorid }, { email }] },
            });

            if (existing)
                return res.status(409).json({ error: "User already exists" });

            const resetToken = randomUUID();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);
            resetTokens.set(resetToken, { utorid, expiresAt });
            const user = await prisma.user.create({
                data: { utorid, name, email },
                select: {
                    id: true,
                    utorid: true,
                    name: true,
                    email: true,
                    verified: true
                }
            });

            return res.status(201).json({
                ...user,
                resetToken,
                expiresAt: expiresAt.toISOString()
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);


// ---------------- /users (GET) ----------------
// Clearance: Manager+
router.get(
    "/",
    authenticate,
    requireClearance(["manager", "superuser"]),
    async (req, res) => {
        try {
            let {
                search,
                page = "1",
                limit = "10"
            } = req.query;

            // ------------------ VALIDATE PAGINATION ------------------
            page = Number(page);
            limit = Number(limit);

            if (
                !Number.isInteger(page) || page < 1 ||
                !Number.isInteger(limit) || limit < 1
            ) {
                return res.status(400).json({ error: "Invalid pagination" });
            }

            // ------------------ BUILD FILTERS ------------------
            const filters = {};

            if (typeof search === "string" && search.trim() !== "") {
                const query = search.trim();

                filters.OR = [
                    { name: { contains: query} },
                    { utorid: { contains: query} }
                ];
            }

            // ------------------ QUERY DATABASE ------------------
            const count = await prisma.user.count({ where: filters });

            const users = await prisma.user.findMany({
                where: filters,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { id: "asc" },
                select: {
                    id: true,
                    utorid: true,
                    name: true,
                    email: true,
                    role: true,
                    points: true,
                    verified: true,
                    suspicious: true,
                    birthday: true,
                    avatarUrl: true,
                    createdAt: true,
                    lastLogin: true
                }
            });

            return res.status(200).json({ count, results: users });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);


// --------------- /users/me (GET) ----------------
router.get(
    "/me",
    authenticate,
    async (req, res) => {
        try {
            const userId = req.user.id;

            // SELECT only safe fields + fetch transactions separately
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    utorid: true,
                    name: true,
                    email: true,
                    birthday: true,
                    role: true,
                    points: true,
                    createdAt: true,
                    lastLogin: true,
                    verified: true,
                    suspicious: true,
                    avatarUrl: true
                }
            });

            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            // Fetch promotions WITHOUT loading password through user include
            const transactions = await prisma.transaction.findMany({
                where: { userId },
                select: {
                    promotions: {
                        select: {
                            id: true,
                            name: true,
                            minSpending: true,
                            rate: true,
                            points: true
                        }
                    }
                }
            });

            const promotions = transactions.flatMap(t => t.promotions);

            return res.json({
                ...user,
                promotions: promotions.map(p => ({
                    id: p.id,
                    name: p.name,
                    minSpending: p.minSpending,
                    rate: p.rate,
                    points: p.points
                }))
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

// ---------------- /users/me/password (PATCH) ----------------
// Clearance: Regular+
router.patch(
    "/me/password",
    authenticate,
    async (req, res) => {
        try {
            const userId = req.user.id;

            const { old, new: newPw } = req.body;

            // Missing fields
            if (!old || !newPw) {
                return res.status(400).json({ error: "Missing fields" });
            }

            const allowed = ["old", "new"];
            for (const key of Object.keys(req.body)) {
                if (!allowed.includes(key)) {
                    return res.status(400).json({ error: "Invalid fields in request" });
                }
            }

            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            const match = await bcrypt.compare(old, user.password);
            if (!match) {
                return res.status(403).json({ error: "Old password does not match" });
            }

            // Validate new password strength
            const pw = newPw;
            const validPassword =
                pw.length >= 8 &&
                pw.length <= 20 &&
                /[A-Z]/.test(pw) &&
                /[a-z]/.test(pw) &&
                /[0-9]/.test(pw) &&
                /[^A-Za-z0-9]/.test(pw);

            if (!validPassword) {
                return res.status(400).json({ error: "Weak password" });
            }

            // Hash and update password
            const hashed = await bcrypt.hash(newPw, 10);

            await prisma.user.update({
                where: { id: userId },
                data: {
                    password: hashed
                }
            });

            return res.status(200).json({});

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

// ---------------- /users/:userId (GET) ----------------
// Clearance: Cashier+
router.get(
    "/:userId",
    authenticate,
    requireClearance(["cashier", "manager", "superuser"]),
    async (req, res) => {
        try {
            const id = Number(req.params.userId);

            // Validate userId
            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({ error: "Invalid userId" });
            }

            // --------- Load ONLY the user (NO nested includes) ---------
            const user = await prisma.user.findUnique({
                where: { id },
                select: {
                    id: true,
                    utorid: true,
                    name: true,
                    email: true,
                    birthday: true,
                    role: true,
                    points: true,
                    createdAt: true,
                    lastLogin: true,
                    verified: true,
                    suspicious: true,
                    avatarUrl: true
                }
            });

            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            // --------- Cashier access restriction (Case 29 fix) ---------
            // Cashiers can only view REGULAR users
            if (req.user.role === "cashier") {
                if (user.role !== "regular") {
                    return res.status(403).json({ error: "Cashiers cannot view this user" });
                }
            }

            // Fetch all transactions for THIS user (separate safe query)
            const transactions = await prisma.transaction.findMany({
                where: { userId: id },
                include: { promotions: true }
            });

            // Fetch all promotions in the system
            const allPromotions = await prisma.promotion.findMany();

            const now = new Date();

            // Filter usable one-time promotions
            const availablePromos = allPromotions.filter(promo => {
                if (promo.type !== "onetime") return false;

                const start = new Date(promo.startTime);
                const end = new Date(promo.endTime);

                const active = start <= now && end >= now;
                if (!active) return false;

                const used = transactions.some(t =>
                    t.promotions.some(p => p.id === promo.id)
                );
                if (used) return false;

                return true;
            });

            const promotionOutput = availablePromos.map(p => ({
                id: p.id,
                name: p.name,
                minSpending: p.minSpending,
                rate: p.rate,
                points: p.points
            }));

            // -----------------------------------------------------
            // Cashier view (limited)
            // -----------------------------------------------------
            if (req.user.role === "cashier") {
                return res.json({
                    id: user.id,
                    utorid: user.utorid,
                    name: user.name,
                    points: user.points,
                    verified: user.verified,
                    promotions: promotionOutput
                });
            }

            // -----------------------------------------------------
            // Manager / Superuser view (full)
            // -----------------------------------------------------
            return res.json({
                id: user.id,
                utorid: user.utorid,
                name: user.name,
                email: user.email,
                birthday: user.birthday,
                role: user.role,
                points: user.points,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin,
                verified: user.verified,
                suspicious: user.suspicious,
                avatarUrl: user.avatarUrl,
                promotions: promotionOutput
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

// ------------- /users/:userId (PATCH) -------------
// Clearance: Manager+
router.patch(
    "/:userId",
    authenticate,
    requireClearance(["manager", "superuser"]),
    async (req, res) => {
        try {
            const id = Number(req.params.userId);
            // Validate userId
            if (!req.params.userId || isNaN(id) || id <= 0) {
                return res.status(400).json({ error: "Invalid userId" });
            }

            // Load target user
            const user = await prisma.user.findUnique({ where: { id } });
            if (!user) return res.status(404).json({ error: "User not found" });

            // Allowed fields
            const allowed = ["email", "verified", "suspicious", "role"];
            const bodyKeys = Object.keys(req.body);

            if (bodyKeys.length === 0) {
                return res.status(400).json({ error: "Empty payload" });
            }
            if (bodyKeys.some(k => !allowed.includes(k))) {
                return res.status(400).json({ error: "Invalid fields in request" });
            }

            // -------------------------------------------------------
            // (Markus treats null as "do not update")
            // -------------------------------------------------------
            for (const key of Object.keys(req.body)) {
                if (req.body[key] === null || req.body[key] === "null") {
                    delete req.body[key];
                }
            }

            // Recompute bodyKeys after null removal
            const cleanKeys = Object.keys(req.body);

            // Manager-specific restrictions
            if (req.user.role === "manager") {

                // Cannot modify other managers or superusers
                if (user.role === "manager" || user.role === "superuser") {
                    return res.status(403).json({ error: "Managers cannot modify this user" });
                }
            }

            // Build update payload
            const updateData = {};

            // ---------------- EMAIL ----------------
            if ("email" in req.body) {
                const email = req.body.email;
                if (typeof email !== "string" || !email.endsWith("@mail.utoronto.ca")) {
                    return res.status(400).json({ error: "Invalid email" });
                }

                // Check uniqueness
                const existing = await prisma.user.findUnique({ where: { email } });
                if (existing && existing.id !== id) {
                    return res.status(409).json({ error: "Email already in use" });
                }

                updateData.email = email;
            }

            // ---------------- VERIFIED ----------------
            if ("verified" in req.body) {
                const v = req.body.verified;
                if (v === true || v === "true") {
                    updateData.verified = true;
                } else {
                    return res.status(400).json({ error: "verified must always be true" });
                }
            }

            // ---------------- SUSPICIOUS ----------------
            if ("suspicious" in req.body) {
                const s = req.body.suspicious;
                if (s === true || s === "true") {
                    updateData.suspicious = true;
                } else if (s === false || s === "false") {
                    updateData.suspicious = false;
                } else {
                    return res.status(400).json({ error: "Invalid suspicious value" });
                }
            }

            // ---------------- ROLE ----------------
            if ("role" in req.body) {
                const role = req.body.role;

                const managerAllowed = ["regular", "cashier"];
                const superAllowed = ["regular", "cashier", "manager", "superuser"];

                if (req.user.role === "manager") {
                    if (!managerAllowed.includes(role)) {
                        return res.status(403).json({ error: "Managers cannot assign this role" });
                    }

                    if (role === "cashier" && (user.suspicious === true || updateData.suspicious === true)) {
                        return res.status(400).json({
                            error: "Suspicious users cannot be promoted to cashier"
                        });
                    }
                }

                if (req.user.role === "superuser" && !superAllowed.includes(role)) {
                    return res.status(400).json({ error: "Invalid role" });
                }

                updateData.role = role;
            }

            // Apply update
            await prisma.user.update({
                where: { id },
                data: updateData
            });

            // Fetch updated record
            const updated = await prisma.user.findUnique({ where: { id } });

            // Build response with base fields + changed fields
            const response = {
                id: updated.id,
                utorid: updated.utorid,
                name: updated.name
            };

            for (const key of cleanKeys) {
                response[key] = updated[key];
            }

            return res.status(200).json(response);

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

// ---------------- /users/me/transactions (POST) ----------------
// Clearance: Regular+
router.post(
    "/me/transactions",
    authenticate,
    async (req, res) => {
        try {
            // ---- Validate body ----
            const allowed = ["type", "amount", "remark"];
            const keys = Object.keys(req.body);
            if (keys.some(k => !allowed.includes(k))) {
                return res.status(400).json({ error: "Invalid fields in request" });
            }

            const { type, amount, remark = "" } = req.body;

            // Must be redemption only
            if (type !== "redemption") {
                return res.status(400).json({ error: "Invalid transaction type" });
            }

            if (!Number.isInteger(amount) || amount <= 0) {
                return res.status(400).json({ error: "Invalid amount" });
            }

            // Load user
            const user = await prisma.user.findUnique({
                where: { id: req.user.id }
            });

            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            if (!user.verified) {
                return res.status(403).json({ error: "User not verified" });
            }

            if (user.points < amount) {
                return res.status(400).json({ error: "Insufficient points" });
            }

            // ---- Create redemption transaction ----
            const tx = await prisma.transaction.create({
                data: {
                    type: "redemption",
                    amount: -amount,       // negative in DB
                    spent: null,
                    relatedId: null,
                    remark,
                    suspicious: false,     // user self-redemption is never suspicious
                    createdBy: user.utorid,
                    user: { connect: { id: user.id } }
                }
            });

            return res.status(201).json({
                id: tx.id,
                utorid: user.utorid,
                type: tx.type,
                amount: amount,           // positive in response
                relatedId: null,
                remark: tx.remark ?? "",
                processedBy: null,
                createdBy: tx.createdBy
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

// ---------------- /users/me/transactions (GET) ----------------
// Clearance: Regular+
router.get(
    "/me/transactions",
    authenticate,
    requireClearance(["regular", "cashier", "manager", "superuser"]),
    async (req, res) => {
        try {
            const {
                type,
                relatedId,
                promotionId,
                amount,
                operator,
                page = 1,
                limit = 10
            } = req.query;

            const userId = req.user.id;
            const filters = { userId };

            // ---- type filter ----
            if (type) filters.type = type;

            // ---- relatedId filter ----
            if (relatedId) {
                const r = Number(relatedId);
                if (isNaN(r) || r <= 0) {
                    return res.status(400).json({ error: "Invalid relatedId" });
                }
                filters.relatedId = r;
            }

            // ---- promotionId filter ----
            if (promotionId) {
                filters.promotions = {
                    some: { id: Number(promotionId) }
                };
            }

            // ---- amount filter ----
            if (amount !== undefined) {
                const val = Number(amount);
                if (isNaN(val)) {
                    return res.status(400).json({ error: "Invalid amount" });
                }

                const validOps = ["gte", "lte"];
                if (!operator || !validOps.includes(operator)) {
                    return res.status(400).json({ error: "Invalid operator" });
                }

                filters.amount = { [operator]: val };
            }

            // ---- Count ----
            const count = await prisma.transaction.count({ where: filters });

            // ---- List ----
            const txs = await prisma.transaction.findMany({
                where: filters,
                skip: (page - 1) * limit,
                take: Number(limit),
                orderBy: { id: "asc" },
                include: { promotions: true }
            });

            // ---- Format results ----
            const results = txs.map(t => ({
                id: t.id,
                amount: t.amount,
                spent: t.spent ?? undefined,
                type: t.type,
                relatedId: t.relatedId ?? undefined,
                promotionIds: t.promotions.map(p => p.id),
                remark: t.remark ?? "",
                createdBy: t.createdBy,
                createdAt: t.createdAt
            }));

            return res.json({ count, results });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

// ---------------- /users/:userId/transactions (POST) ----------------
// Clearance: Regular+
router.post(
    "/:userId/transactions",
    authenticate,
    requireClearance(["regular", "cashier", "manager", "superuser"]),
    async (req, res) => {
        try {
            const rawRecipient = req.params.userId;

            // Accept either a numeric internal id OR a utorid string.
            // If numeric -> resolve by id, otherwise if a valid utorid -> resolve by utorid.
            let recipient = null;

            if (/^\d+$/.test(String(rawRecipient))) {
                const recipientId = Number(rawRecipient);
                if (recipientId <= 0) return res.status(400).json({ error: "Invalid userId" });
                recipient = await prisma.user.findUnique({ where: { id: recipientId } });
            } else if (isValidUtorid(rawRecipient)) {
                recipient = await prisma.user.findUnique({ where: { utorid: rawRecipient } });
            } else {
                return res.status(400).json({ error: "Invalid user identifier" });
            }

            if (!recipient) {
                return res.status(404).json({ error: "Recipient not found" });
            }

            // ---- Validate body fields ----
            const allowed = ["type", "amount", "remark"];
            const keys = Object.keys(req.body);
            if (keys.some(k => !allowed.includes(k))) {
                return res.status(400).json({ error: "Invalid fields in request" });
            }

            const { type, amount, remark = "" } = req.body;

            if (!type || amount === undefined) {
                return res.status(400).json({ error: "Missing fields" });
            }

            if (type !== "transfer") {
                return res.status(400).json({ error: "Invalid transaction type" });
            }

            if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
                return res.status(400).json({ error: "Invalid amount" });
            }

            if (typeof remark !== "string") {
                return res.status(400).json({ error: "Invalid remark" });
            }

            // ---- Load sender & recipient ----
            const sender = await prisma.user.findUnique({ where: { id: req.user.id } });
            if (!sender) {
                return res.status(401).json({ error: "Sender not found" });
            }

            // ---- Business rules ----
            if (!sender.verified) {
                return res.status(403).json({ error: "Sender not verified" });
            }

            if (sender.points < amount) {
                return res.status(400).json({ error: "Insufficient points" });
            }

            // ---- Perform transfer atomically ----
            const senderTx = await prisma.$transaction(async (tx) => {
                // Update points
                await tx.user.update({
                    where: { id: sender.id },
                    data: { points: sender.points - amount }
                });

                await tx.user.update({
                    where: { id: recipient.id },
                    data: { points: recipient.points + amount }
                });

                // Sender transaction (negative amount)
                const sTx = await tx.transaction.create({
                    data: {
                        type: "transfer",
                        amount: -amount,
                        spent: null,
                        remark,
                        createdBy: sender.utorid,
                        relatedId: recipient.id,
                        user: { connect: { id: sender.id } }
                    }
                });

                // Recipient transaction (positive amount)
                await tx.transaction.create({
                    data: {
                        type: "transfer",
                        amount: amount,
                        spent: null,
                        remark,
                        createdBy: sender.utorid,
                        relatedId: sender.id,
                        user: { connect: { id: recipient.id } }
                    }
                });

                return sTx;
            });

            // ---- Response ----
            return res.status(201).json({
                id: senderTx.id,
                sender: sender.utorid,
                recipient: recipient.utorid,
                type: "transfer",
                sent: amount,     // positive, as in spec
                remark,
                createdBy: sender.utorid
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

export default router;