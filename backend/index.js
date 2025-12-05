#!/usr/bin/env node
const port = process.env.PORT || 3000;

import express from "express";
import { PrismaClient } from "@prisma/client";
import cookieParser from "cookie-parser";
import cors from "cors"
const app = express();


const allowedOrigins = [
    process.env.FRONTEND_URL
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Content-Type, Authorization",
    credentials: true
};
console.log(corsOptions)
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
app.use(cookieParser())

// ---------------- Routes ----------------
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const avatarsPath = path.join(__dirname, "uploads", "avatars");
app.use("/avatars", express.static(avatarsPath));

import userRoutes from "./routes/users.js";
app.use("/users", userRoutes);
import authRoutes from "./routes/auth.js";
app.use("/auth", authRoutes);
import transactionRoutes from "./routes/transactions.js";
app.use("/transactions", transactionRoutes);
import eventRoutes from "./routes/events.js";
app.use("/events", eventRoutes);
import promotionRoutes from "./routes/promotions.js";
app.use("/promotions", promotionRoutes);
import analyticsRouter from "./routes/analytics.js";
app.use("/analytics", analyticsRouter);

// ---------------- HEALTHCHECK ----------------
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

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