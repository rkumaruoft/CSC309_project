#!/usr/bin/env node
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

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
console.log(allowedOrigins)
// ---------------- Routes ----------------
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const avatarsPath = path.join(__dirname, "uploads", "avatars");
app.use("/avatars", express.static(avatarsPath));  // expose avatars under an endpoint

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