const express = require("express");
const router = express.Router();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("crypto");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

// Keep these maps inside auth only
const resetRateLimit = new Map();
const resetTokens = new Map();

// ---------------- /auth/tokens (POST) ----------------
router.post("/auth/tokens", async (req, res) => {
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
router.post("/auth/resets", async (req, res) => {
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
router.post("/auth/resets/:resetToken", async (req, res) => {
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

module.exports = router;