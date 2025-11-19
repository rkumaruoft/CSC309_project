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

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const dotenv = require("dotenv");
dotenv.config();
const app = express();
app.use(express.json());

// ---------------- Middleware ----------------
const authenticate = require("./middleware/authenticate");
const requireClearance = require("./middleware/requireClearance");

// ---------------- Routes ----------------
const authRoutes = require("./routes/auth");
app.use("/auth", authRoutes);
const userRoutes = require("./routes/users");
app.use("/users", userRoutes);
const transactionRoutes = require("./routes/transactions");
app.use("/transactions", transactionRoutes);
const eventRoutes = require("./routes/events");
app.use("/events", eventRoutes);
const promotionRoutes = require("./routes/promotions");
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