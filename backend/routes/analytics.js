// routes/analytics.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import authenticate from "../middleware/authenticate.js";
import requireClearance from "../middleware/requireClearance.js";

const prisma = new PrismaClient();
const router = express.Router();

router.get(
    "/manager",
    authenticate,
    requireClearance(["manager", "superuser"]),
    async (req, res) => {
        try {
            // USERS
            const totalUsers = await prisma.user.count();

            // TRANSACTIONS
            const allTx = await prisma.transaction.findMany({
                include: { user: true, promotions: true },
                orderBy: { createdAt: "desc" }
            });

            const totalTransactions = allTx.length;

            const pointsIssued = allTx
                .filter(tx => tx.amount > 0)
                .reduce((sum, tx) => sum + tx.amount, 0);

            const pointsRedeemed = allTx
                .filter(tx => tx.amount < 0)
                .reduce((sum, tx) => sum + tx.amount, 0);

            // PROMOTIONS
            const now = new Date();
            const activePromotions = await prisma.promotion.count({
                where: {
                    startTime: { lte: now },
                    endTime: { gte: now }
                }
            });

            // PROMOTIONS ENDING SOON
            const promosEndingSoon = await prisma.promotion.findMany({
                where: {
                    endTime: { gte: new Date() }   // filter for promos that haven't expired
                },
                orderBy: {
                    endTime: "asc"
                },
                take: 5
            });


            // MONTHLY TX (last 12 months)
            const monthlyTx = Array.from({ length: 12 }).map((_, i) => {
                const month = i; // 0–11
                const count = allTx.filter(tx => tx.createdAt.getMonth() === month).length;
                const name = new Date(0, month).toLocaleString("en", { month: "short" });
                return { month: name, count };
            });

            // ROLE DISTRIBUTION
            const roles = ["regular", "cashier", "manager", "superuser"];
            const roleDist = {};
            for (let r of roles) {
                roleDist[r] = await prisma.user.count({ where: { role: r } });
            }

            const latestTransactions = allTx.slice(0, 5).map(tx => ({
                id: tx.id,
                type: tx.type,
                amount: tx.amount,
                createdAt: tx.createdAt,
                user: { name: tx.user.name, utorid: tx.user.utorid }
            }));

            return res.json({
                totalUsers,
                totalTransactions,
                pointsIssued,
                pointsRedeemed,
                activePromotions,
                monthlyTx,
                roleDist,
                latestTransactions,
                promosEndingSoon
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server error" });
        }
    }
);

export default router;
