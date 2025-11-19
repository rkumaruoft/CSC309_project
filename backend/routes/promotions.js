const express = require("express");
const router = express.Router();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const authenticate = require("../middleware/authenticate");
const requireClearance = require("../middleware/requireClearance");

// ---------------- VALIDATORS ----------------

function isValidUofTEmail(email) {
    return /^[A-Za-z0-9._%+-]+@mail\.utoronto\.ca$/.test(email);
}
function isValidUtorid(id) {
    return /^[A-Za-z0-9]{7,8}$/.test(id);
}

// ---------------- /promotions (POST) ----------------
// Clearance: Manager+
router.post(
    "/",
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
router.get(
    "/",
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
router.get(
    "/:promotionId",
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
router.patch(
    "/:promotionId",
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
router.delete(
    "/:promotionId",
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
module.exports = router;