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

// ---------------- /transactions (POST) ----------------
// Clearance: Cashier+
router.post(
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
router.get(
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
router.get(
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
router.patch(
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

// ---------------- /transactions/:transactionId/processed (PATCH) ----------------
// Clearance: Cashier+
router.patch(
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

module.exports = router;
