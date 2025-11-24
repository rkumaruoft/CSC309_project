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

import express from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import cors from "cors"
dotenv.config();
const app = express();
app.use(express.json());

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const corsOptions = {
    origin: FRONTEND_URL
};
app.use(cors(corsOptions));

// ---------------- Middleware ----------------

// ---------------- Routes ----------------
import authRoutes from "./routes/auth.js";
app.use("/auth", authRoutes);
import userRoutes from "./routes/users.js";
app.use("/users", userRoutes);
import transactionRoutes from "./routes/transactions.js";
app.use("/transactions", transactionRoutes);
import eventRoutes from "./routes/events.js";
app.use("/events", eventRoutes);
import promotionRoutes from "./routes/promotions.js";
app.use("/promotions", promotionRoutes);

// ---------------- FALLBACK ----------------
app.use((req, res) => {
    res.status(404).json({ error: "Not Found" });
});

const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

server.on('error', (err) => {
    console.error(`cannot start server: ${err.message}`);
    process.exit(1);
});