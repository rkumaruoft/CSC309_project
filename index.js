#!/usr/bin/env node
'use strict';

const port = (() => {
    const args = process.argv;

    if (args.length !== 3) {
        console.error("usage: node index.js port");
        process.exit(1);
    }

    const num = parseInt(args[2], 10);
    if (isNaN(num)) {
        console.error("error: argument must be an integer.");
        process.exit(1);
    }

    return num;
})();

const multer = require("multer");
const upload = multer({ dest: "uploads/avatars/" });
const express = require("express");
const bcrypt = require('bcrypt');
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const resetRateLimit = new Map();   // ip -> timestamp
const resetTokens = new Map();      // token -> { utorid, expiresAt } 
const dotenv = require("dotenv");
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use("/uploads", express.static("uploads"));


// Authentication and Clearence
async function authenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: "Missing Authorization header" });

    const token = header.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user) return res.status(401).json({ error: "User not found" });
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }
}

function requireClearance(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: "Not authenticated" });
        if (!allowedRoles.includes(req.user.role))
            return res.status(403).json({ error: "Forbidden" });
        next();
    };
}


// ---------------- VALIDATORS ----------------

function isValidUofTEmail(email) {
    return /^[A-Za-z0-9._%+-]+@mail\.utoronto\.ca$/.test(email);
}
function isValidUtorid(id) {
    return /^[A-Za-z0-9]{7,8}$/.test(id);
}

// ---------------- /auth/tokens (POST) ----------------
app.post("/auth/tokens", async (req, res) => {
    try {
        const { utorid, password } = req.body;

        if (!utorid || !password) {
            return res.status(400).json({ message: "Missing utorid or password" });
        }

        const user = await prisma.user.findUnique({
            where: { utorid }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.password) {
            return res.status(401).json({ message: "Account not activated" });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ message: "Incorrect password" });
        }

        // Update lastLogin
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date().toISOString() }
        });

        const token = jwt.sign(
            { id: user.id, role: user.role },
            JWT_SECRET,
            { expiresIn: "2h" }
        );

        const expires = new Date(Date.now() + 2 * 60 * 60 * 1000);

        return res.json({
            token,
            expiresAt: expires.toISOString()
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});

// ---------------- /auth/resets (POST) ----------------
app.post("/auth/resets", async (req, res) => {
    try {
        // ------------------ PAYLOAD VALIDATION ------------------
        const allowed = ["utorid"];
        if (Object.keys(req.body).some(k => !allowed.includes(k))) {
            return res.status(400).json({ error: "Invalid fields in request" });
        }

        const { utorid } = req.body;
        if (!utorid) {
            return res.status(400).json({ error: "Missing utorid" });
        }

        // ------------------ RATE LIMIT PER UTORID ------------------
        const now = Date.now();
        const last = resetRateLimit.get(utorid);
        if (last && now - last < 60 * 1000) {
            return res.status(429).json({ error: "Too Many Requests" });
        }

        resetRateLimit.set(utorid, now);

        // ------------------ GENERATE TOKEN ------------------
        const resetToken = randomUUID();
        const expiresAt = new Date(Date.now() + 3600000);

        // ------------------ CHECK USER EXISTS ------------------
        const user = await prisma.user.findUnique({ where: { utorid } });

        if (user) {
            resetTokens.set(resetToken, { utorid, expiresAt });
        } else {
            // If user does not exist, do not create token
            // return 404
            return res.status(404).json({ message: "User not found" });
        }

        // ------------------ ALWAYS RETURN STRING TOKEN ------------------
        return res.status(202).json({
            expiresAt: expiresAt.toISOString(),
            resetToken
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});


// ---------------- /auth/resets/:resetToken (POST) ----------------
app.post("/auth/resets/:resetToken", async (req, res) => {
    try {
        const { resetToken } = req.params;

        // 1. Token must exist
        const entry = resetTokens.get(resetToken);
        if (!entry) {
            return res.status(404).json({ error: "Reset token does not exist" });
        }

        const { utorid, expiresAt } = entry;

        // 2. Token expired → MUST return 410 (and then delete)
        if (new Date() >= expiresAt) {
            resetTokens.delete(resetToken);
            return res.status(410).json({ error: "Reset token expired" });
        }

        // 3. Payload validation
        const allowed = ["utorid", "password"];
        if (Object.keys(req.body).some(k => !allowed.includes(k))) {
            return res.status(400).json({ error: "Invalid fields in request" });
        }

        const { utorid: bodyUtorid, password } = req.body;
        if (!bodyUtorid || !password) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // 4. Utorid mismatch → 401
        if (bodyUtorid !== utorid) {
            return res.status(401).json({ error: "Utorid mismatch" });
        }

        // 5. Password strength
        const strong =
            password.length >= 8 &&
            password.length <= 20 &&
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /[0-9]/.test(password) &&
            /[^A-Za-z0-9]/.test(password);

        if (!strong) {
            return res.status(400).json({ error: "Weak password" });
        }

        // 6. Update password
        const hashed = await bcrypt.hash(password, 10);
        await prisma.user.update({
            where: { utorid },
            data: { password: hashed }
        });

        resetTokens.delete(resetToken);
        return res.status(200).json({});

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});


// ---------------- /User (POST) -------------------
// Clearance: Cashier+
app.post(
    "/users",
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
app.get(
    "/users",
    authenticate,
    requireClearance(["manager", "superuser"]),
    async (req, res) => {
        try {
            let { name, role, verified, activated, page = "1", limit = "10" } = req.query;

            // ------------------ VALIDATE PAGINATION ------------------
            page = Number(page);
            limit = Number(limit);

            if (
                !Number.isInteger(page) || page < 1 ||
                !Number.isInteger(limit) || limit < 1
            ) {
                return res.status(400).json({ error: "Invalid pagination" });
            }

            // ------------------ BUILD FILTERS SAFELY ------------------
            const filters = {};

            // NAME filter
            if (typeof name === "string" && name.trim() !== "") {
                const query = name.trim();
                filters.OR = [
                    { name: { contains: query } },
                    { utorid: { contains: query } }
                ];
            }

            // ROLE filter
            if (typeof role === "string" && role.trim() !== "") {
                filters.role = role;
            }

            // VERIFIED filter
            if (verified !== undefined) {

                // accept booleans OR strings
                if (
                    verified !== true &&
                    verified !== false &&
                    verified !== "true" &&
                    verified !== "false"
                ) {
                    return res.status(400).json({ error: "Invalid verified value" });
                }

                // normalize to boolean
                const v =
                    verified === true ||
                    verified === "true";

                filters.verified = v;
            }


            // ACTIVATED filter
            if (activated !== undefined) {
                if (activated !== "true" && activated !== "false") {
                    return res.status(400).json({ error: "Invalid activated value" });
                }

                filters.lastLogin =
                    activated === "true"
                        ? { not: null }
                        : { equals: null };
            }

            // ------------------ QUERY DATABASE ------------------
            const count = await prisma.user.count({ where: filters });
            const users = await prisma.user.findMany({
                where: filters,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { id: "asc" },
                // EXPLICITLY exclude password fields
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
app.get(
    "/users/me",
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

// ---------------- /users/me (PATCH) ----------------
// Clearance: Regular+
app.patch(
    "/users/me",
    authenticate,
    upload.single("avatar"),
    async (req, res) => {
        try {
            const userId = req.user.id;

            // ----------------------------
            // STRICT ALLOWED FIELDS
            // ----------------------------
            const allowed = ["name", "email", "birthday", "avatar"];
            const bodyKeys = Object.keys(req.body);

            if (bodyKeys.length === 0) {
                return res.status(400).json({ error: "Missing fields in request" });
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

            if (allEmpty) {
                return res.status(400).json({ error: "Missing fields in request" });
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
                data.avatarUrl = `/uploads/avatars/${req.file.filename}`;
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

// ---------------- /users/me/password (PATCH) ----------------
// Clearance: Regular+
app.patch(
    "/users/me/password",
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
                return res.status(403).json({ error: "Incorrect password" });
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
app.get(
    "/users/:userId",
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
app.patch(
    "/users/:userId",
    authenticate,
    requireClearance(["manager", "superuser"]),
    async (req, res) => {
        try {
            const id = Number(req.params.userId);
            console.log(req.user.role);
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

// ---------------- /transactions (POST) ----------------
// Clearance: Cashier+
app.post(
    "/transactions",
    authenticate,
    requireClearance(["cashier", "manager", "superuser"]),
    async (req, res) => {
        try {
            const allowed = [
                "utorid", "type", "spent", "amount",
                "relatedId", "promotionIds", "remark"
            ];

            // Extra fields → 400
            if (Object.keys(req.body).some(k => !allowed.includes(k))) {
                return res.status(400).json({ error: "Invalid fields in request" });
            }

            const { utorid, type } = req.body;
            if (!utorid || !type) {
                return res.status(400).json({ error: "Missing fields" });
            }

            // --------------------------------------------------
            // LOAD USER
            // --------------------------------------------------
            const user = await prisma.user.findUnique({ where: { utorid } });
            if (!user) return res.status(404).json({ error: "User not found" });

            const promotionIds = req.body.promotionIds ?? [];
            const remark = req.body.remark ?? "";

            if (!Array.isArray(promotionIds)) {
                return res.status(400).json({ error: "promotionIds must be an array" });
            }

            // --------------------------------------------------
            // VALIDATE PROMOTIONS
            // --------------------------------------------------
            const now = new Date();
            const validPromotions = [];
            const appliedPromotions = [];

            for (const pid of promotionIds) {
                const promo = await prisma.promotion.findUnique({ where: { id: pid } });
                if (!promo) return res.status(400).json({ error: "Invalid promotion" });

                // Cannot use outside validity window
                if (promo.startTime > now || promo.endTime < now) {
                    return res.status(400).json({ error: "Promotion expired" });
                }

                // One-time promotions cannot be reused
                const alreadyUsed = await prisma.transaction.findFirst({
                    where: {
                        userId: user.id,
                        promotions: { some: { id: pid } }
                    }
                });
                if (alreadyUsed) {
                    return res.status(400).json({ error: "Promotion already used" });
                }

                validPromotions.push(promo);
            }

            // ======================================================================
            //                                PURCHASE
            // ======================================================================
            if (type === "purchase") {

                const spent = req.body.spent;
                if (typeof spent !== "number" || spent <= 0) {
                    return res.status(400).json({ error: "Invalid spent amount" });
                }

                let amount = Math.round(spent * 4); // base points

                // Apply promotions
                for (const p of validPromotions) {
                    if (p.minSpending && spent < p.minSpending) continue;

                    if (p.rate) amount = Math.round(amount * p.rate);
                    if (p.points) amount += p.points;

                    appliedPromotions.push(p);
                }

                // Suspicious cashier → DO NOT award points
                const cashierIsSuspicious = !!req.user.suspicious;

                if (!cashierIsSuspicious) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { points: user.points + amount }
                    });
                }

                // Create transaction
                const tx = await prisma.transaction.create({
                    data: {
                        type,
                        amount,
                        spent,
                        remark,
                        createdBy: req.user.utorid,
                        suspicious: cashierIsSuspicious,
                        relatedId: null,
                        user: { connect: { id: user.id } },
                        promotions: {
                            connect: appliedPromotions.map(p => ({ id: p.id }))
                        }
                    }
                });


                return res.status(201).json({
                    id: tx.id,
                    utorid,
                    type,
                    spent,
                    earned: cashierIsSuspicious ? 0 : amount,
                    remark,
                    promotionIds,
                    createdBy: req.user.utorid
                });
            }

            // ======================================================================
            //                               ADJUSTMENT
            // ======================================================================
            if (type === "adjustment") {

                // Only manager/superuser
                if (!["manager", "superuser"].includes(req.user.role)) {
                    return res.status(403).json({ error: "Forbidden" });
                }

                const amount = req.body.amount;
                const relatedId = req.body.relatedId;

                if (relatedId === undefined) {
                    return res.status(400).json({ error: "Missing relatedId" });
                }

                const relatedNum = Number(relatedId);
                if (isNaN(relatedNum) || relatedNum <= 0) {
                    return res.status(400).json({ error: "Invalid relatedId" });
                }

                // Must reference an existing tx
                const relatedTx = await prisma.transaction.findUnique({
                    where: { id: relatedNum }
                });
                if (!relatedTx) {
                    return res.status(404).json({ error: "Related transaction not found" });
                }

                if (typeof amount !== "number") {
                    return res.status(400).json({ error: "Invalid amount" });
                }

                let finalAmount = amount;

                // Only promotions with minSpending = 0 apply
                for (const p of validPromotions) {
                    if (p.minSpending > 0) continue;

                    if (p.rate) finalAmount = Math.round(finalAmount * p.rate);
                    if (p.points) finalAmount += p.points;

                    appliedPromotions.push(p);
                }

                // Adjustments always change user points
                await prisma.user.update({
                    where: { id: user.id },
                    data: { points: user.points + finalAmount }
                });

                const tx = await prisma.transaction.create({
                    data: {
                        type,
                        amount: finalAmount,
                        spent: null,
                        remark,
                        createdBy: req.user.utorid,
                        relatedId: relatedNum,
                        suspicious: false,
                        user: { connect: { id: user.id } },
                        promotions: {
                            connect: appliedPromotions.map(p => ({ id: p.id }))
                        }
                    }
                });

                return res.status(201).json({
                    id: tx.id,
                    utorid,
                    type,
                    amount: finalAmount,
                    relatedId: relatedNum,
                    remark,
                    promotionIds,
                    createdBy: req.user.utorid
                });
            }

            // ---------------- INVALID TYPE ----------------
            return res.status(400).json({ error: "Invalid transaction type" });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);


//---------------- /transactions (GET) ----------------
// Clearance: Manager+
app.get(
    "/transactions",
    authenticate,
    requireClearance(["manager", "superuser"]),
    async (req, res) => {
        try {
            const {
                name,
                createdBy,
                suspicious,
                promotionId,
                type,
                relatedId,
                amount,
                operator,
                page = 1,
                limit = 10
            } = req.query;

            const filters = {};

            // ---------------- FILTER: name ----------------
            // Filter by utorid OR name (SQLite: case-sensitive only)
            if (name) {
                filters.user = {
                    OR: [
                        { utorid: { contains: name } },
                        { name: { contains: name } }
                    ]
                };
            }

            // ---------------- FILTER: createdBy ----------------
            if (createdBy) {
                filters.createdBy = { contains: createdBy };
            }

            // ---------------- FILTER: suspicious ----------------
            if (suspicious !== undefined) {
                filters.suspicious = suspicious === "true";
            }

            // ---------------- FILTER: promotionId ----------------
            if (promotionId) {
                filters.promotions = {
                    some: { id: Number(promotionId) }
                };
            }

            // ---------------- FILTER: type ----------------
            if (type) {
                filters.type = type;
            }

            // ---------------- FILTER: relatedId ----------------
            if (relatedId) {
                const relatedNum = Number(relatedId);
                if (isNaN(relatedNum) || relatedNum <= 0) {
                    return res.status(400).json({ error: "Invalid relatedId" });
                }
                filters.relatedId = relatedNum;
            }

            // ---------------- FILTER: amount + operator ----------------
            if (amount !== undefined) {
                const amountValue = Number(amount);
                const validOps = ["gte", "lte"];

                if (isNaN(amountValue)) {
                    return res.status(400).json({ error: "Invalid amount" });
                }

                if (!operator || !validOps.includes(operator)) {
                    return res.status(400).json({ error: "Invalid operator" });
                }

                filters.amount = {
                    [operator]: amountValue
                };
            }

            // ---------------- COUNT ----------------
            const count = await prisma.transaction.count({ where: filters });

            // ---------------- RESULTS ----------------
            const results = await prisma.transaction.findMany({
                where: filters,
                skip: (page - 1) * limit,
                take: Number(limit),
                orderBy: { id: "asc" },
                include: {
                    user: true,
                    promotions: true
                }
            });

            // ---------------- FORMAT RESPONSE ----------------
            const formatted = results.map(t => {
                const obj = {
                    id: t.id,
                    utorid: t.user.utorid,
                    amount: t.amount,
                    spent: t.spent ?? undefined,
                    type: t.type,
                    relatedId: t.relatedId ?? undefined,
                    promotionIds: t.promotions.map(p => p.id),
                    suspicious: t.suspicious ?? false,
                    remark: t.remark ?? "",
                    createdBy: t.createdBy
                };

                // Show 'redeemed' for redemption transactions
                if (t.type === "redemption") {
                    obj.redeemed = Math.abs(t.amount);
                }

                return obj;
            });

            return res.json({
                count,
                results: formatted
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);


// ---------------- /transactions/:transactionId (GET) ----------------
// Clearance: Manager+
app.get(
    "/transactions/:transactionId",
    authenticate,
    requireClearance(["manager", "superuser"]),
    async (req, res) => {
        try {
            const id = Number(req.params.transactionId);

            if (isNaN(id) || id <= 0) {
                return res.status(400).json({ error: "Invalid transactionId" });
            }

            const tx = await prisma.transaction.findUnique({
                where: { id },
                include: {
                    user: true,
                    promotions: true
                }
            });

            if (!tx) {
                return res.status(404).json({ error: "Transaction not found" });
            }

            // ---- EXACT MARKUS FORMAT ----
            const result = {
                id: tx.id,
                utorid: tx.user.utorid,
                amount: tx.amount,
                spent: tx.spent ?? undefined,
                type: tx.type,
                relatedId: tx.relatedId,   // <--- REQUIRED FIELD
                promotionIds: tx.promotions.map(p => p.id),
                suspicious: tx.suspicious ?? false,
                remark: tx.remark ?? "",
                createdBy: tx.createdBy
            };

            // redemption → add "redeemed"
            if (tx.type === "redemption") {
                result.redeemed = Math.abs(tx.amount);
            }

            return res.json(result);

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

// ---------------- /transactions/:transactionId/suspicious (PATCH) ----------------
// Clearance: Manager+
app.patch(
    "/transactions/:transactionId/suspicious",
    authenticate,
    requireClearance(["manager", "superuser"]),
    async (req, res) => {
        try {
            const id = Number(req.params.transactionId);

            // ----- Validate transactionId -----
            if (isNaN(id) || id <= 0) {
                return res.status(400).json({ error: "Invalid transactionId" });
            }

            // ----- Body validation -----
            const allowed = ["suspicious"];
            const keys = Object.keys(req.body);

            // Reject extra fields
            if (keys.some(k => !allowed.includes(k))) {
                return res.status(400).json({ error: "Invalid fields in request" });
            }

            const { suspicious } = req.body;

            if (suspicious === undefined || typeof suspicious !== "boolean") {
                return res.status(400).json({ error: "Missing or invalid 'suspicious' field" });
            }

            // ----- Load transaction -----
            const tx = await prisma.transaction.findUnique({
                where: { id },
                include: { user: true, promotions: true }
            });

            if (!tx) {
                return res.status(404).json({ error: "Transaction not found" });
            }

            // ----- If value is unchanged, return it -----
            if (tx.suspicious === suspicious) {
                return res.json({
                    id: tx.id,
                    utorid: tx.user.utorid,
                    type: tx.type,
                    spent: tx.spent ?? undefined,
                    amount: tx.amount,
                    promotionIds: tx.promotions.map(p => p.id),
                    suspicious: tx.suspicious,
                    remark: tx.remark ?? "",
                    createdBy: tx.createdBy
                });
            }

            // ----- Update user's points -----
            const user = tx.user;
            const amount = tx.amount;

            if (suspicious === true) {
                // mark as suspicious → deduct points
                await prisma.user.update({
                    where: { id: user.id },
                    data: { points: user.points - amount }
                });
            } else {
                // mark as NOT suspicious → add points back
                await prisma.user.update({
                    where: { id: user.id },
                    data: { points: user.points + amount }
                });
            }

            // ----- Update transaction -----
            const updatedTx = await prisma.transaction.update({
                where: { id },
                data: { suspicious },
                include: { user: true, promotions: true }
            });

            // ----- Format response exactly like the spec -----
            return res.json({
                id: updatedTx.id,
                utorid: updatedTx.user.utorid,
                type: updatedTx.type,
                spent: updatedTx.spent ?? undefined,
                amount: updatedTx.amount,
                promotionIds: updatedTx.promotions.map(p => p.id),
                suspicious: updatedTx.suspicious,
                remark: updatedTx.remark ?? "",
                createdBy: updatedTx.createdBy
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

// ---------------- /users/me/transactions (POST) ----------------
// Clearance: Regular+
app.post(
    "/users/me/transactions",
    authenticate,
    async (req, res) => {
        try {
            console.log("POST /users/me/transactions body:", req.body);

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

            // ---- Deduct points ----
            await prisma.user.update({
                where: { id: user.id },
                data: { points: user.points - amount }
            });

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
app.get(
    "/users/me/transactions",
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
                createdBy: t.createdBy
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
app.post(
    "/users/:userId/transactions",
    authenticate,
    requireClearance(["regular", "cashier", "manager", "superuser"]),
    async (req, res) => {
        try {
            const recipientId = Number(req.params.userId);

            // ---- Validate path param ----
            if (isNaN(recipientId) || recipientId <= 0) {
                return res.status(400).json({ error: "Invalid userId" });
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

            const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
            if (!recipient) {
                return res.status(404).json({ error: "Recipient not found" });
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

// ---------------- /transactions/:transactionId/processed (PATCH) ----------------
// Clearance: Cashier+
app.patch(
    "/transactions/:transactionId/processed",
    authenticate,
    requireClearance(["cashier", "manager", "superuser"]),
    async (req, res) => {
        try {
            const id = Number(req.params.transactionId);
            if (isNaN(id) || id <= 0) {
                return res.status(400).json({ error: "Invalid transactionId" });
            }

            // Validate body
            const allowed = ["processed"];
            const keys = Object.keys(req.body);
            if (keys.some(k => !allowed.includes(k))) {
                return res.status(400).json({ error: "Invalid fields in request" });
            }

            const { processed } = req.body;
            if (processed !== true) {
                return res.status(400).json({ error: "processed must be true" });
            }

            // Load transaction
            const tx = await prisma.transaction.findUnique({
                where: { id },
                include: { user: true }
            });

            if (!tx) return res.status(404).json({ error: "Transaction not found" });

            // Type must be redemption
            if (tx.type !== "redemption") {
                return res.status(400).json({ error: "Not a redemption transaction" });
            }

            // Already processed?
            if (tx.processed === true) {
                return res.status(400).json({ error: "Transaction already processed" });
            }

            // Deduct points
            const user = tx.user;
            await prisma.user.update({
                where: { id: user.id },
                data: { points: user.points + tx.amount }
            });

            // Mark processed
            const updated = await prisma.transaction.update({
                where: { id },
                data: {
                    processed: true,
                    processedBy: req.user.utorid
                },
                include: { user: true }
            });

            // Response matches PDF
            return res.json({
                id: updated.id,
                utorid: updated.user.utorid,
                type: updated.type,
                processedBy: updated.processedBy,
                redeemed: Math.abs(updated.amount),
                remark: updated.remark ?? "",
                createdBy: updated.createdBy
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Server error" });
        }
    }
);

// ---------------- /events (GET) ----------------
// Clearance: Regular+
app.get(
    "/events",
    authenticate,
    requireClearance(["regular", "cashier", "manager", "superuser"]),
    async (req, res) => {
        try {
            const {
                name,
                location,
                started,
                ended,
                showFull,
                published,
                page = 1,
                limit = 10
            } = req.query;

            const pageNum = Number(page);
            const limitNum = Number(limit);

            if (
                !Number.isInteger(pageNum) || pageNum < 1 ||
                !Number.isInteger(limitNum) || limitNum < 1
            ) {
                return res.status(400).json({ error: "Invalid pagination" });
            }

            if (started !== undefined && ended !== undefined) {
                return res.status(400).json({
                    error: "Specify either started or ended, not both"
                });
            }

            const filters = {};
            const isManager = ["manager", "superuser"].includes(req.user.role);
            const isBasic = ["regular", "cashier"].includes(req.user.role);

            if (isBasic) filters.published = true;

            if (isManager && published !== undefined) {
                filters.published = (published === "true");
            }

            if (name) filters.name = { contains: name };
            if (location) filters.location = { contains: location };

            const now = new Date();

            if (started !== undefined) {
                filters.startTime = (started === "true")
                    ? { lte: now }
                    : { gt: now };
            }

            if (ended !== undefined) {
                filters.endTime = (ended === "true")
                    ? { lt: now }
                    : { gte: now };
            }

            // -------- Fetch with organizers and guests (full relation) --------
            const allMatchingEvents = await prisma.event.findMany({
                where: filters,
                include: {
                    guests: { include: { user: true } },
                    organizers: { include: { user: true } }
                },
                orderBy: { id: "asc" }
            });

            // -------- Filter out full events for regular/cashier --------
            let filtered = allMatchingEvents;

            if (!isManager) {
                const hideFull = showFull === undefined || showFull === "false";
                if (hideFull) {
                    filtered = filtered.filter(e =>
                        e.capacity == null || e.guests.length < e.capacity
                    );
                }
            }

            // -------- Pagination --------
            const total = filtered.length;
            const startIdx = (pageNum - 1) * limitNum;
            const paged = filtered.slice(startIdx, startIdx + limitNum);

            // -------- Format response (MUST include guests + organizers) --------
            const results = paged.map(e => {
                const obj = {
                    id: e.id,
                    name: e.name,
                    location: e.location,
                    startTime: e.startTime,
                    endTime: e.endTime,
                    capacity: e.capacity,
                    numGuests: e.guests.length,
                    organizers: e.organizers.map(o => ({
                        id: o.user.id,
                        utorid: o.user.utorid,
                        name: o.user.name
                    })),
                    guests: e.guests.map(g => ({
                        id: g.user.id,
                        utorid: g.user.utorid,
                        name: g.user.name
                    }))
                };

                if (isManager) {
                    obj.pointsRemain = e.pointsRemain;
                    obj.pointsAwarded = e.pointsAwarded;
                    obj.published = e.published;
                }

                return obj;
            });

            return res.json({
                count: total,
                results
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);


// ---------------- /events (POST) ----------------
// Clearance: Manager+
app.post(
    "/events",
    authenticate,
    requireClearance(["manager", "superuser"]),
    async (req, res) => {
        try {

            // ---------------- VALIDATE FIELDS ----------------
            const allowed = [
                "name",
                "description",
                "location",
                "startTime",
                "endTime",
                "capacity",
                "points"
            ];

            const keys = Object.keys(req.body);
            if (keys.some(k => !allowed.includes(k))) {
                return res.status(400).json({ error: "Invalid fields in request" });
            }

            const {
                name,
                description,
                location,
                startTime,
                endTime,
                capacity,
                points
            } = req.body;

            if (!name || !description || !location || !startTime || !endTime || points === undefined || capacity === undefined) {
                return res.status(400).json({ error: "Missing fields" });
            }

            // ---------------- DATE VALIDATION ----------------
            const start = new Date(startTime);
            const end = new Date(endTime);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return res.status(400).json({ error: "Invalid date format" });
            }

            const now = Date.now();

            // Compare using UTC timestamps
            if (start.getTime() < now || end.getTime() < now) {
                return res.status(400).json({ error: "Event time cannot be in the past" });
            }

            if (end.getTime() <= start.getTime()) {
                return res.status(400).json({ error: "endTime must be after startTime" });
            }


            // capacity may be null OR a positive integer
            if (capacity !== null) {
                if (!Number.isInteger(capacity) || capacity <= 0) {
                    return res.status(400).json({ error: "Invalid capacity" });
                }
            }


            // ---------------- POINTS VALIDATION ----------------
            if (!Number.isInteger(points) || points <= 0) {
                return res.status(400).json({ error: "Invalid points" });
            }

            // ---------------- CREATE EVENT ----------------
            const event = await prisma.event.create({
                data: {
                    name,
                    description,
                    location,
                    startTime: start,
                    endTime: end,
                    capacity,
                    pointsRemain: points,
                    pointsAwarded: 0,
                    published: false
                }
            });

            // ---------------- RESPONSE FORMAT ----------------
            return res.status(201).json({
                id: event.id,
                name: event.name,
                description: event.description,
                location: event.location,
                startTime: event.startTime,
                endTime: event.endTime,
                capacity: event.capacity,
                pointsRemain: event.pointsRemain,
                pointsAwarded: event.pointsAwarded,
                published: event.published,
                organizers: [],
                guests: []
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);


// ---------------- /events/:eventId (GET) ----------------
// Clearance: Regular+
app.get(
    "/events/:eventId",
    authenticate,
    requireClearance(["regular", "cashier", "manager", "superuser"]),
    async (req, res) => {
        try {
            const eventId = Number(req.params.eventId);
            if (isNaN(eventId) || eventId <= 0) {
                return res.status(400).json({ error: "Invalid eventId" });
            }

            // Load full event with relations
            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    organizers: { include: { user: true } },
                    guests: { include: { user: true } }
                }
            });

            if (!event) {
                return res.status(404).json({ error: "Event not found" });
            }

            const isRegular = req.user.role === "regular";

            if (isRegular && !event.published) {
                return res.status(404).json({ error: "Event not found" });
            }

            const numGuests = event.guests.length;

            // Build guests array in required format
            const guests = event.guests.map(g => ({
                id: g.user.id,
                utorid: g.user.utorid,
                name: g.user.name
            }));

            // -------------------------
            // Regular users → limited view
            // -------------------------
            if (isRegular) {
                return res.json({
                    id: event.id,
                    name: event.name,
                    description: event.description,
                    location: event.location,
                    startTime: event.startTime,
                    endTime: event.endTime,
                    capacity: event.capacity,
                    organizers: event.organizers.map(o => ({
                        id: o.user.id,
                        utorid: o.user.utorid,
                        name: o.user.name
                    })),
                    guests,     // REQUIRED
                    numGuests
                });
            }

            // -------------------------
            // Manager/Cashier/Superuser → full view
            // -------------------------
            return res.json({
                id: event.id,
                name: event.name,
                description: event.description,
                location: event.location,
                startTime: event.startTime,
                endTime: event.endTime,
                capacity: event.capacity,
                pointsRemain: event.pointsRemain,
                pointsAwarded: event.pointsAwarded,
                published: event.published,
                organizers: event.organizers.map(o => ({
                    id: o.user.id,
                    utorid: o.user.utorid,
                    name: o.user.name
                })),
                guests,     // REQUIRED
                numGuests
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);


// ---------------- /events/:eventId (PATCH) ----------------
// Clearance: Regular+
app.patch(
    "/events/:eventId",
    authenticate,
    requireClearance(["regular", "cashier", "manager", "superuser"]),
    async (req, res) => {
        try {
            const eventId = Number(req.params.eventId);
            if (isNaN(eventId)) return res.status(400).json({ error: "Invalid eventId" });

            // ------------------ Load event ------------------
            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    guests: true,
                    organizers: { include: { user: true } }
                }
            });

            if (!event) return res.status(404).json({ error: "Event not found" });

            const now = new Date();
            const isManager = ["manager", "superuser"].includes(req.user.role);

            const isOrganizer = await prisma.eventOrganizer.findFirst({
                where: { userId: req.user.id, eventId }
            });

            if (!isManager && !isOrganizer) {
                return res.status(403).json({ error: "Forbidden" });
            }

            // ------------------ Prevent ALL edits after event ended ------------------
            if (now > event.endTime) {
                const forbidden = ["name", "description", "location", "startTime", "endTime", "capacity"];
                for (const f of forbidden) {
                    if (req.body[f] !== undefined) {
                        return res.status(400).json({ error: "Event already ended; cannot modify " + f });
                    }
                }
            }


            // ------------------ Allowed fields ------------------
            const allowed = [
                "name", "description", "location",
                "startTime", "endTime", "capacity",
                "points", "published"
            ];

            const keys = Object.keys(req.body);
            if (keys.some(k => !allowed.includes(k))) {
                return res.status(400).json({ error: "Invalid fields in request" });
            }

            // ------------------ IGNORE NULL FIELDS ------------------
            for (const k of keys) {
                if (req.body[k] === null) {
                    delete req.body[k];
                }
            }

            // Recompute keys after removing nulls
            const cleanKeys = Object.keys(req.body);

            if (cleanKeys.length === 0) {
                return res.status(400).json({ error: "Missing fields" });
            }

            const updates = {};
            const oldCapacity = event.capacity;

            // ------------------ Time freeze rules ------------------
            const eventStarted = now > event.startTime;
            const eventEnded = now > event.endTime;

            const freezeFields = ["name", "description", "location", "startTime", "capacity"];

            if (!isManager) {
                for (const f of freezeFields) {
                    if (req.body[f] !== undefined && eventStarted) {
                        return res.status(400).json({ error: "Event already started; cannot modify " + f });
                    }
                }

                if (req.body.endTime !== undefined && eventEnded) {
                    return res.status(400).json({ error: "Event already ended; cannot modify endTime" });
                }
            }

            // ------------------ startTime / endTime validation ------------------
            if (req.body.startTime !== undefined) {
                const st = new Date(req.body.startTime);
                if (isNaN(st)) return res.status(400).json({ error: "Invalid startTime" });
                if (st < now) return res.status(400).json({ error: "startTime cannot be in the past" });
                updates.startTime = st;

                // Validate relative ordering if also providing endTime
                if (req.body.endTime !== undefined) {
                    const et = new Date(req.body.endTime);
                    if (!isNaN(et) && et <= st) {
                        return res.status(400).json({ error: "endTime must be after startTime" });
                    }
                }
            }

            if (req.body.endTime !== undefined) {
                const et = new Date(req.body.endTime);
                if (isNaN(et)) return res.status(400).json({ error: "Invalid endTime" });
                if (et < now) return res.status(400).json({ error: "endTime cannot be in the past" });

                // Validate relative ordering
                if (req.body.startTime !== undefined) {
                    const st = new Date(req.body.startTime);
                    if (et <= st) {
                        return res.status(400).json({ error: "endTime must be after startTime" });
                    }
                } else {
                    if (et <= event.startTime) {
                        return res.status(400).json({ error: "endTime must be after startTime" });
                    }
                }

                updates.endTime = et;
            }

            // ------------------ capacity ------------------
            if (req.body.capacity !== undefined) {
                const cap = req.body.capacity;

                if (cap !== null && (typeof cap !== "number" || cap <= 0)) {
                    return res.status(400).json({ error: "Invalid capacity" });
                }

                // Changing finite -> unlimited not allowed
                if (oldCapacity !== null && cap === null) {
                    return res.status(400).json({ error: "Cannot change capacity to unlimited" });
                }

                if (cap !== null && event.guests.length > cap) {
                    return res.status(400).json({ error: "Capacity too small for existing guests" });
                }

                updates.capacity = cap;
            }

            // ------------------ points (manager only) ------------------
            if (req.body.points !== undefined) {
                if (!isManager) {
                    return res.status(403).json({ error: "Only managers may modify points" });
                }

                if (!Number.isInteger(req.body.points) || req.body.points <= 0) {
                    return res.status(400).json({ error: "Invalid points amount" });
                }

                const totalAwarded = event.pointsAwarded;
                const newTotal = req.body.points;

                if (newTotal < totalAwarded) {
                    return res.status(400).json({ error: "Cannot reduce points below awarded amount" });
                }

                // Update pointsRemain only
                updates.pointsRemain = newTotal - totalAwarded;
            }

            // ------------------ published ------------------
            if (req.body.published !== undefined) {
                if (!isManager) {
                    return res.status(403).json({ error: "Only managers may publish events" });
                }
                if (req.body.published !== true) {
                    return res.status(400).json({ error: "published can only be set to true" });
                }
                updates.published = true;
            }

            // ------------------ Basic fields ------------------
            if (req.body.name !== undefined) updates.name = req.body.name;
            if (req.body.description !== undefined) updates.description = req.body.description;
            if (req.body.location !== undefined) updates.location = req.body.location;

            // ------------------ Perform update ------------------
            const updated = await prisma.event.update({
                where: { id: eventId },
                data: updates
            });

            // -------- Response format (spec-compliant) --------
            const response = {
                id: updated.id,
                name: updated.name,
                location: updated.location
            };

            for (const k of cleanKeys) {
                if (k === "points") {
                    response.pointsRemain = updated.pointsRemain;
                    response.pointsAwarded = updated.pointsAwarded;
                } else {
                    response[k] = updated[k];
                }
            }

            return res.json(response);

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);


// ---------------- /events/:eventId (DELETE) ----------------
// Clearance: Manager+
app.delete(
    "/events/:eventId",
    authenticate,
    requireClearance(["manager", "superuser"]),
    async (req, res) => {
        try {
            const id = Number(req.params.eventId);
            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({ error: "Invalid eventId" });
            }

            // Fetch event
            const event = await prisma.event.findUnique({ where: { id } });
            if (!event) {
                return res.status(404).json({ error: "Event not found" });
            }

            // Cannot delete published events
            if (event.published) {
                return res.status(400).json({ error: "Cannot delete published event" });
            }

            // ------------------------------------
            // CASCADE DELETE (MANUAL — REQUIRED)
            // ------------------------------------

            // 1. Delete guests for this event
            await prisma.eventGuest.deleteMany({
                where: { eventId: id }
            });

            // 2. Delete organizers for this event
            await prisma.eventOrganizer.deleteMany({
                where: { eventId: id }
            });

            // 3. Fetch all transactions for this event
            const txs = await prisma.transaction.findMany({
                where: { eventId: id },
                select: { id: true }
            });

            const txIds = txs.map(t => t.id);

            // 4. Delete promotion links for those transactions
            if (txIds.length > 0) {
                await prisma.transactionPromotions.deleteMany({
                    where: { transactionId: { in: txIds } }
                });
            }

            // 5. Delete transactions for this event
            await prisma.transaction.deleteMany({
                where: { eventId: id }
            });

            // 6. Finally delete the event itself
            await prisma.event.delete({
                where: { id }
            });

            return res.status(204).send();

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);


//---------------------------------------------
// ---------------- /events/:eventId/organizers (POST) ----------------
// Clearance: Manager+
app.post(
    "/events/:eventId/organizers",
    authenticate,
    requireClearance(["manager", "superuser"]),
    async (req, res) => {
        try {
            const eventId = Number(req.params.eventId);
            if (isNaN(eventId) || eventId <= 0) {
                return res.status(400).json({ error: "Invalid eventId" });
            }

            const allowed = ["utorid"];
            const keys = Object.keys(req.body);
            if (keys.some(k => !allowed.includes(k))) {
                return res.status(400).json({ error: "Invalid fields in request" });
            }

            const { utorid } = req.body;
            if (!utorid || typeof utorid !== "string") {
                return res.status(400).json({ error: "Missing or invalid utorid" });
            }

            // Load event with guests & organizers
            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    guests: true,
                    organizers: { include: { user: true } }
                }
            });

            if (!event) {
                return res.status(404).json({ error: "Event not found" });
            }

            const now = new Date();
            if (now > event.endTime) {
                return res.status(410).json({ error: "Event has ended" });
            }

            // Load user
            const user = await prisma.user.findUnique({ where: { utorid } });
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            // 400 if already guest
            const isGuest = event.guests.some(g => g.userId === user.id);
            if (isGuest) {
                return res.status(400).json({
                    error: "User is registered as a guest; remove as guest first"
                });
            }

            // Avoid duplicate organizers
            const isOrganizer = event.organizers.some(o => o.userId === user.id);
            if (!isOrganizer) {
                await prisma.eventOrganizer.create({
                    data: {
                        eventId,
                        userId: user.id
                    }
                });
            }

            // Reload organizers
            const updated = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    organizers: { include: { user: true } }
                }
            });

            return res.status(201).json({
                id: updated.id,
                name: updated.name,
                location: updated.location,
                organizers: updated.organizers.map(o => ({
                    id: o.user.id,
                    utorid: o.user.utorid,
                    name: o.user.name
                }))
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

// ---------------- /events/:eventId/organizers/:userId (DELETE) ----------------
// Clearance: Manager+
app.delete(
    "/events/:eventId/organizers/:userId",
    authenticate,
    requireClearance(["manager", "superuser"]),
    async (req, res) => {
        try {
            const eventId = Number(req.params.eventId);
            const userId = Number(req.params.userId);

            if (isNaN(eventId) || eventId <= 0 || isNaN(userId) || userId <= 0) {
                return res.status(400).json({ error: "Invalid eventId or userId" });
            }

            // Ensure event exists
            const event = await prisma.event.findUnique({ where: { id: eventId } });
            if (!event) {
                return res.status(404).json({ error: "Event not found" });
            }

            // Find organizer record
            const organizer = await prisma.eventOrganizer.findFirst({
                where: { eventId, userId }
            });

            if (!organizer) {
                return res.status(404).json({ error: "Organizer not found for this event" });
            }

            await prisma.eventOrganizer.delete({
                where: { id: organizer.id }
            });

            return res.status(204).send();
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

// ---------------- /events/:eventId/guests (POST) ----------------
// Clearance: Manager+ OR organizer for this event
app.post(
    "/events/:eventId/guests",
    authenticate,
    requireClearance(["regular", "cashier", "manager", "superuser"]),
    async (req, res) => {
        try {
            const eventId = Number(req.params.eventId);
            if (isNaN(eventId) || eventId <= 0) {
                return res.status(400).json({ error: "Invalid eventId" });
            }

            const allowed = ["utorid"];
            const keys = Object.keys(req.body);
            if (keys.some(k => !allowed.includes(k))) {
                return res.status(400).json({ error: "Invalid fields in request" });
            }

            const { utorid } = req.body;
            if (!utorid || typeof utorid !== "string") {
                return res.status(400).json({ error: "Missing or invalid utorid" });
            }

            // Load event with relations
            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    organizers: { include: { user: true } },
                    guests: { include: { user: true } }
                }
            });

            if (!event) {
                return res.status(404).json({ error: "Event not found" });
            }

            const now = new Date();

            // Access control: manager/superuser OR organizer for this event
            const isManager = ["manager", "superuser"].includes(req.user.role);
            const organizerRecord = await prisma.eventOrganizer.findFirst({
                where: { eventId, userId: req.user.id }
            });
            const isOrganizer = !!organizerRecord;

            if (!isManager && !isOrganizer) {
                return res.status(403).json({ error: "Forbidden" });
            }

            // If caller is organizer and event is not yet published -> 404 (not visible)
            if (isOrganizer && !event.published) {
                return res.status(404).json({ error: "Event not found" });
            }

            // 410 Gone if full or ended
            const full =
                event.capacity !== null &&
                event.guests.length >= event.capacity;

            if (full || now > event.endTime) {
                return res.status(410).json({ error: "Event is full or has ended" });
            }

            // Load target user
            const user = await prisma.user.findUnique({ where: { utorid } });
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            // 400 if user is organizer
            const isUserOrganizer = event.organizers.some(o => o.userId === user.id);
            if (isUserOrganizer) {
                return res.status(400).json({
                    error: "User is registered as an organizer; remove as organizer first"
                });
            }

            // 400 if already guest
            const isUserGuest = event.guests.some(g => g.userId === user.id);
            if (isUserGuest) {
                return res.status(400).json({ error: "User already on guest list" });
            }

            // Add guest
            await prisma.eventGuest.create({
                data: {
                    eventId,
                    userId: user.id
                }
            });

            // Reload guest list to get updated count
            const updated = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    guests: { include: { user: true } }
                }
            });

            return res.status(201).json({
                id: updated.id,
                name: updated.name,
                location: updated.location,
                guestAdded: {
                    id: user.id,
                    utorid: user.utorid,
                    name: user.name
                },
                numGuests: updated.guests.length
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

// ---------------- /events/:eventId/guests/:userId (DELETE) ----------------
// Clearance: Manager+
app.delete(
    "/events/:eventId/guests/:userId",
    authenticate,
    requireClearance(["manager", "superuser"]),
    async (req, res) => {
        try {
            const eventId = Number(req.params.eventId);
            const userId = Number(req.params.userId);

            if (isNaN(eventId) || eventId <= 0 || isNaN(userId) || userId <= 0) {
                return res.status(400).json({ error: "Invalid eventId or userId" });
            }

            const event = await prisma.event.findUnique({ where: { id: eventId } });
            if (!event) {
                return res.status(404).json({ error: "Event not found" });
            }

            const guest = await prisma.eventGuest.findFirst({
                where: { eventId, userId }
            });

            if (!guest) {
                return res.status(404).json({ error: "Guest not found for this event" });
            }

            await prisma.eventGuest.delete({ where: { id: guest.id } });

            return res.status(204).send();
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

// ---------------- /events/:eventId/guests/me (POST) ----------------
// Clearance: Regular or higher
app.post(
    "/events/:eventId/guests/me",
    authenticate,
    async (req, res) => {
        try {
            const eventId = Number(req.params.eventId);
            if (isNaN(eventId) || eventId <= 0) {
                return res.status(400).json({ error: "Invalid eventId" });
            }

            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: { guests: { include: { user: true } } }
            });

            if (!event) {
                return res.status(404).json({ error: "Event not found" });
            }

            const now = new Date();

            // For regular users, unpublished events should behave as 404
            if (req.user.role === "regular" && !event.published) {
                return res.status(404).json({ error: "Event not found" });
            }

            const full =
                event.capacity !== null &&
                event.guests.length >= event.capacity;

            if (full || now > event.endTime) {
                return res.status(410).json({ error: "Event is full or has ended" });
            }

            const userId = req.user.id;

            const isGuest = event.guests.some(g => g.userId === userId);
            if (isGuest) {
                return res.status(400).json({ error: "Already on guest list" });
            }

            await prisma.eventGuest.create({
                data: {
                    eventId,
                    userId
                }
            });

            const updated = await prisma.event.findUnique({
                where: { id: eventId },
                include: { guests: true }
            });

            return res.status(201).json({
                id: event.id,
                name: event.name,
                location: event.location,
                guestAdded: {
                    id: req.user.id,
                    utorid: req.user.utorid,
                    name: req.user.name
                },
                numGuests: updated.guests.length
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

// ---------------- /events/:eventId/guests/me (DELETE) ----------------
// Clearance: Regular or higher
app.delete(
    "/events/:eventId/guests/me",
    authenticate,
    async (req, res) => {
        try {
            const eventId = Number(req.params.eventId);
            if (!Number.isInteger(eventId) || eventId <= 0) {
                return res.status(400).json({ error: "Invalid eventId" });
            }

            // Load event WITH guests (needed later)
            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    guests: true
                }
            });

            // ---- Event does not exist ----
            if (!event) {
                return res.status(404).json({ error: "Event not found" });
            }

            const isRegular = req.user.role === "regular";

            // ---- Regular users must not see unpublished events ----
            if (isRegular && !event.published) {
                return res.status(404).json({ error: "Event not found" });
            }

            const now = new Date();

            // ---- If event ended, cannot un-RSVP → 410 Gone ----
            if (now > event.endTime) {
                return res.status(410).json({ error: "Event has ended" });
            }

            // ---- Check if user is a guest ----
            const guest = await prisma.eventGuest.findUnique({
                where: {
                    userId_eventId: {
                        userId: req.user.id,
                        eventId
                    }
                }
            });

            // ---- If user is NOT guest → 410 Gone ----
            if (!guest) {
                return res.status(410).json({ error: "User already removed or never RSVPed" });
            }

            // ---- Delete guest entry ----
            await prisma.eventGuest.delete({
                where: {
                    userId_eventId: {
                        userId: req.user.id,
                        eventId
                    }
                }
            });


            return res.status(204).send();

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);


// ---------------- /events/:eventId/transactions (POST) ----------------
// Clearance: Manager+ OR organizer for this event
app.post(
    "/events/:eventId/transactions",
    authenticate,
    requireClearance(["regular", "cashier", "manager", "superuser"]),
    async (req, res) => {
        try {
            const eventId = Number(req.params.eventId);
            if (isNaN(eventId) || eventId <= 0) {
                return res.status(400).json({ error: "Invalid eventId" });
            }

            // Allowed fields
            const allowed = ["type", "utorid", "amount"];
            const keys = Object.keys(req.body);
            if (keys.some(k => !allowed.includes(k))) {
                return res.status(400).json({ error: "Invalid fields in request" });
            }

            const { type, utorid, amount } = req.body;

            if (type !== "event") {
                return res.status(400).json({ error: "type must be 'event'" });
            }

            if (!Number.isInteger(amount) || amount <= 0) {
                return res.status(400).json({ error: "Invalid amount" });
            }

            // Load event + guests
            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    guests: { include: { user: true } }
                }
            });

            if (!event) {
                return res.status(404).json({ error: "Event not found" });
            }

            // Access control: manager/superuser OR organizer
            const isManager = ["manager", "superuser"].includes(req.user.role);
            const organizerRecord = await prisma.eventOrganizer.findFirst({
                where: { eventId, userId: req.user.id }
            });

            if (!isManager && !organizerRecord) {
                return res.status(403).json({ error: "Forbidden" });
            }

            const creatorUtorid = req.user.utorid;

            // ========== CASE 1: Award a single guest ==========
            if (utorid) {
                const guestUser = event.guests
                    .map(g => g.user)
                    .find(u => u.utorid === utorid);

                if (!guestUser) {
                    return res.status(400).json({
                        error: "User is not on the guest list for this event"
                    });
                }

                if (event.pointsRemain < amount) {
                    return res.status(400).json({
                        error: "Not enough remaining points for this event"
                    });
                }

                const txRecord = await prisma.$transaction(async (tx) => {
                    // Update event pool
                    await tx.event.update({
                        where: { id: eventId },
                        data: {
                            pointsRemain: { decrement: amount },
                            pointsAwarded: { increment: amount }
                        }
                    });

                    // Update user points
                    await tx.user.update({
                        where: { id: guestUser.id },
                        data: { points: { increment: amount } }
                    });

                    // Create transaction
                    const t = await tx.transaction.create({
                        data: {
                            type: "event",
                            amount,
                            spent: null,
                            createdBy: creatorUtorid,
                            relatedId: eventId,
                            user: { connect: { id: guestUser.id } }
                        }
                    });

                    return t;
                });

                return res.status(201).json({
                    id: txRecord.id,
                    recipient: guestUser.utorid,
                    awarded: amount,
                    type: "event",
                    remark: txRecord.remark,
                    relatedId: eventId,
                    createdBy: creatorUtorid
                });
            }

            // ========== CASE 2: Award all guests ==========
            const guestUsers = event.guests.map(g => g.user);
            if (guestUsers.length === 0) {
                return res.status(201).json([]);
            }

            const totalNeeded = amount * guestUsers.length;

            if (event.pointsRemain < totalNeeded) {
                return res.status(400).json({
                    error: "Not enough remaining points for this event"
                });
            }

            const createdTxs = await prisma.$transaction(async (tx) => {
                // Update event pool
                await tx.event.update({
                    where: { id: eventId },
                    data: {
                        pointsRemain: { decrement: totalNeeded },
                        pointsAwarded: { increment: totalNeeded }
                    }
                });

                const results = [];

                for (const user of guestUsers) {
                    await tx.user.update({
                        where: { id: user.id },
                        data: { points: { increment: amount } }
                    });

                    const t = await tx.transaction.create({
                        data: {
                            type: "event",
                            amount,
                            spent: null,
                            createdBy: creatorUtorid,
                            relatedId: eventId,
                            user: { connect: { id: user.id } }
                        }
                    });

                    results.push({
                        id: t.id,
                        recipient: user.utorid,
                        awarded: amount,
                        type: "event",
                        relatedId: eventId,
                        remark: t.remark,
                        createdBy: creatorUtorid
                    });
                }

                return results;
            });

            return res.status(201).json(createdTxs);

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

// ---------------- /promotions (POST) ----------------
// Clearance: Manager+
app.post(
    "/promotions",
    authenticate,
    requireClearance(["manager", "superuser"]),
    async (req, res) => {
        try {
            const allowed = [
                "name",
                "description",
                "type",
                "startTime",
                "endTime",
                "minSpending",
                "rate",
                "points"
            ];

            if (Object.keys(req.body).some(k => !allowed.includes(k))) {
                return res.status(400).json({ error: "Invalid fields in request" });
            }

            let {
                name,
                description,
                type,
                startTime,
                endTime,
                minSpending,
                rate,
                points
            } = req.body;

            // ---- Required fields ----
            if (!name || !type || !startTime || !endTime) {
                return res.status(400).json({ error: "Missing required fields" });
            }

            // ---- Normalize type ----
            if (type === "one-time") type = "onetime"; // MarkUs sends both spellings

            if (!["automatic", "onetime"].includes(type)) {
                return res.status(400).json({ error: "Invalid promotion type" });
            }

            // ---- Parse dates ----
            const st = new Date(startTime);
            const et = new Date(endTime);

            if (isNaN(st) || isNaN(et)) {
                return res.status(400).json({ error: "Invalid date" });
            }

            if (et <= st) {
                return res.status(400).json({ error: "endTime must be after startTime" });
            }

            // ---- minSpending ----
            if (minSpending !== undefined) {
                if (typeof minSpending !== "number" || minSpending < 0) {
                    return res.status(400).json({ error: "Invalid minSpending" });
                }
            } else {
                minSpending = null;
            }

            // ---- rate ----
            if (rate !== undefined) {
                if (typeof rate !== "number" || rate < 0) {
                    return res.status(400).json({ error: "Invalid rate" });
                }
            } else {
                rate = null;
            }

            // ---- points ----
            if (points !== undefined) {
                if (typeof points !== "number" || points < 0) {
                    return res.status(400).json({ error: "Invalid points" });
                }
            } else {
                points = null;
            }

            // ---- Must include at least one of rate or points ----
            if (rate === null && points === null) {
                return res.status(400).json({ error: "Promotion must include rate or points" });
            }

            // ---- Create promotion ----
            const promo = await prisma.promotion.create({
                data: {
                    name,
                    description: description ?? "",
                    type,
                    startTime: st,
                    endTime: et,
                    minSpending,
                    rate,
                    points
                }
            });

            return res.status(201).json({
                id: promo.id,
                name: promo.name,
                description: promo.description,
                type: promo.type,
                startTime: promo.startTime,
                endTime: promo.endTime,
                minSpending: promo.minSpending,
                rate: promo.rate,
                points: promo.points
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

// ---------------- /promotions (GET) ----------------
// Clearance: Regular or higher
app.get(
    "/promotions",
    authenticate,
    requireClearance(["regular", "cashier", "manager", "superuser"]),
    async (req, res) => {
        try {
            const {
                name,
                type,
                started,
                ended,
                page = 1,
                limit = 10
            } = req.query;

            // -------- Pagination validation (MarkUs required) --------
            const pageNum = Number(page);
            const limitNum = Number(limit);

            if (
                !Number.isInteger(pageNum) || pageNum <= 0 ||
                !Number.isInteger(limitNum) || limitNum <= 0
            ) {
                return res.status(400).json({ error: "Invalid pagination" });
            }

            const now = new Date();
            const isManagerRole = ["manager", "superuser"].includes(req.user.role);
            const restricted = (req.user.role === "regular" || req.user.role === "cashier");

            const filters = {};

            // ------------------ name filter ------------------
            if (name) {
                filters.name = { contains: name };
            }

            // ------------------ type filter ------------------
            if (type) {
                if (!["automatic", "onetime"].includes(type)) {
                    return res.status(400).json({ error: "Invalid type" });
                }
                filters.type = type;
            }

            // ------------------ Regular/Cashier users: ONLY active promotions ------------------
            if (restricted) {
                filters.startTime = { lte: now };
                filters.endTime = { gte: now };
            }

            // ------------------ Manager-only filters ------------------
            if (isManagerRole) {
                if (started !== undefined && ended !== undefined) {
                    return res.status(400).json({ error: "Cannot specify both started and ended" });
                }

                if (started !== undefined) {
                    filters.startTime = started === "true" ? { lte: now } : { gt: now };
                }

                if (ended !== undefined) {
                    filters.endTime = ended === "true" ? { lt: now } : { gte: now };
                }
            }

            // ------------------ Fetch matching promotions ------------------
            const rawPromos = await prisma.promotion.findMany({
                where: filters,
                orderBy: { id: "asc" }
            });

            let visiblePromos = rawPromos;

            // ------------------ Regular/Cashier: hide already used ------------------
            if (restricted) {
                const usedTx = await prisma.transaction.findMany({
                    where: { userId: req.user.id },
                    include: { promotions: true }
                });

                const usedIds = new Set(
                    usedTx.flatMap(t => t.promotions.map(p => p.id))
                );

                visiblePromos = visiblePromos.filter(p => !usedIds.has(p.id));
            }

            // ------------------ Pagination ------------------
            const total = visiblePromos.length;
            const startIdx = (pageNum - 1) * limitNum;
            const paged = visiblePromos.slice(startIdx, startIdx + limitNum);

            // ------------------ Format output------------------
            const results = paged.map(p => ({
                id: p.id,
                name: p.name,
                description: p.description,
                type: p.type,
                startTime: p.startTime,
                endTime: p.endTime,
                minSpending: p.minSpending,
                rate: p.rate,
                points: p.points
            }));

            return res.json({ count: total, results });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

// ---------------- /promotions/:promotionId (GET) ----------------
// Clearance: Regular or higher
app.get(
    "/promotions/:promotionId",
    authenticate,
    async (req, res) => {
        try {
            const id = Number(req.params.promotionId);
            if (isNaN(id) || id <= 0) {
                return res.status(400).json({ error: "Invalid promotionId" });
            }

            const promo = await prisma.promotion.findUnique({
                where: { id }
            });

            if (!promo) {
                return res.status(404).json({ error: "Promotion not found" });
            }

            const now = Date.now();
            const isRegular = req.user.role === "regular";

            // ---------- Regular user restrictions ----------
            if (isRegular) {

                // Must be ACTIVE (compare UTC timestamps)
                if (!(promo.startTime.getTime() <= now &&
                      promo.endTime.getTime() >= now)) {
                    return res.status(404).json({ error: "Promotion not found" });
                }

                // Must NOT have been used
                const used = await prisma.transaction.findFirst({
                    where: {
                        userId: req.user.id,
                        promotions: { some: { id } }
                    }
                });

                if (used) {
                    return res.status(404).json({ error: "Promotion not found" });
                }
            }

            // ---------- Format response ----------
            return res.status(200).json({
                id: promo.id,
                name: promo.name,
                description: promo.description,
                type: promo.type,
                startTime: promo.startTime,
                endTime: promo.endTime,
                minSpending: promo.minSpending,
                rate: promo.rate,
                points: promo.points
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);


// ---------------- /promotions/:promotionId (PATCH) ----------------
// Clearance: Manager+
app.patch(
    "/promotions/:promotionId",
    authenticate,
    requireClearance(["manager", "superuser"]),
    async (req, res) => {
        try {
            const id = Number(req.params.promotionId);
            if (isNaN(id) || id <= 0) {
                return res.status(400).json({ error: "Invalid promotionId" });
            }

            const promo = await prisma.promotion.findUnique({ where: { id } });
            if (!promo) return res.status(404).json({ error: "Promotion not found" });

            const now = new Date();

            // Cannot modify ended promotions
            if (promo.endTime < now) {
                return res.status(400).json({ error: "Cannot modify an ended promotion" });
            }

            // Allowed fields
            const allowed = [
                "name", "description",
                "startTime", "endTime",
                "minSpending", "rate", "points"
            ];
            const keys = Object.keys(req.body);

            if (keys.some(k => !allowed.includes(k))) {
                return res.status(400).json({ error: "Invalid fields in request" });
            }

            const updates = {};

            // ---------- name ----------
            if (req.body.name !== undefined) {
                if (typeof req.body.name !== "string" || req.body.name.trim() === "") {
                    return res.status(400).json({ error: "Invalid name" });
                }
                updates.name = req.body.name;
            }

            // ---------- description ----------
            if (req.body.description !== undefined) {
                if (typeof req.body.description !== "string") {
                    return res.status(400).json({ error: "Invalid description" });
                }
                updates.description = req.body.description;
            }

            // ---------- startTime ----------
            if (req.body.startTime !== undefined) {
                const st = new Date(req.body.startTime);
                if (isNaN(st)) return res.status(400).json({ error: "Invalid startTime" });
                if (st < now) return res.status(400).json({ error: "startTime cannot be in the past" });

                updates.startTime = st;

                // If endTime also in body, check order
                if (req.body.endTime) {
                    const et = new Date(req.body.endTime);
                    if (et <= st) return res.status(400).json({ error: "endTime must be after startTime" });
                }
            }

            // ---------- endTime ----------
            if (req.body.endTime !== undefined) {
                const et = new Date(req.body.endTime);
                if (isNaN(et)) return res.status(400).json({ error: "Invalid endTime" });
                if (et < now) return res.status(400).json({ error: "endTime cannot be in the past" });

                // Compare to existing or new startTime
                const compareStart = updates.startTime ?? promo.startTime;
                if (et <= compareStart) {
                    return res.status(400).json({ error: "endTime must be after startTime" });
                }

                updates.endTime = et;
            }

            // ---------- minSpending ----------
            if (req.body.minSpending !== undefined) {
                const ms = req.body.minSpending;
                if (promo.type === "automatic") {
                    if (ms !== 0) {
                        return res.status(400).json({
                            error: "Automatic promotions must have minSpending = 0"
                        });
                    }
                } else {
                    if (typeof ms !== "number" || ms < 0) {
                        return res.status(400).json({ error: "Invalid minSpending" });
                    }
                }
                updates.minSpending = ms;
            }

            // ---------- rate ----------
            if (req.body.rate !== undefined) {
                const r = req.body.rate;
                if (typeof r !== "number" || r <= 0) {
                    return res.status(400).json({ error: "Invalid rate" });
                }
                updates.rate = r;
            }

            // ---------- points ----------
            if (req.body.points !== undefined) {
                const pts = req.body.points;
                if (!Number.isInteger(pts) || pts < 0) {
                    return res.status(400).json({ error: "Invalid points" });
                }
                updates.points = pts;
            }

            // ---------- Apply update ----------
            const updated = await prisma.promotion.update({
                where: { id },
                data: updates
            });

            // ---------- Response: id, name, and patched fields ----------
            const response = {
                id: updated.id,
                name: updated.name
            };
            for (const k of keys) response[k] = updated[k];

            return res.json(response);

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

// ---------------- /promotions/:promotionId (DELETE) ----------------
// Clearance: Manager+
app.delete(
    "/promotions/:promotionId",
    authenticate,
    requireClearance(["manager", "superuser"]),
    async (req, res) => {
        try {
            const id = Number(req.params.promotionId);
            if (isNaN(id) || id <= 0) {
                return res.status(400).json({ error: "Invalid promotionId" });
            }

            const promo = await prisma.promotion.findUnique({
                where: { id }
            });

            if (!promo) {
                return res.status(404).json({ error: "Promotion not found" });
            }

            const now = new Date();

            // Cannot delete active promotions
            if (promo.startTime <= now && promo.endTime >= now) {
                return res.status(400).json({
                    error: "Cannot delete an active promotion"
                });
            }

            // Cannot delete promotions that have been used
            const used = await prisma.transaction.findFirst({
                where: {
                    promotions: { some: { id } }
                }
            });

            if (used) {
                return res.status(400).json({
                    error: "Cannot delete a used promotion"
                });
            }

            await prisma.promotion.delete({
                where: { id }
            });

            return res.status(204).send();

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);





// ---------------- FALLBACK ----------------

app.use((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
});

const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

server.on('error', (err) => {
    console.error(`cannot start server: ${err.message}`);
    process.exit(1);
});