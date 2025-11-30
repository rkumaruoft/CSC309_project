
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { JWT_SECRET } from "../config/env.js";
import { sendEmail } from "./email_helper.js";


const router = express.Router();
const prisma = new PrismaClient();

// Keep these maps inside auth only
const resetRateLimit = new Map();
const resetTokens = new Map();
const verificationCodes = new Map();
const verifyRateLimit = new Map();

// ---------------- /auth/tokens (POST) ----------------
router.post("/tokens", async (req, res) => {
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

        // Block unverified accounts
        if (!user.verified) {
            return res.status(403).json({ error: "Account not verified" });
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
router.post("/resets", async (req, res) => {
    try {
        const allowed = ["utorid"];
        if (Object.keys(req.body).some(k => !allowed.includes(k))) {
            return res.status(400).json({ error: "Invalid fields in request" });
        }

        const { utorid } = req.body;
        if (!utorid) {
            return res.status(400).json({ error: "Missing utorid" });
        }

        // RATE LIMIT: Only 1 request per minute
        const now = Date.now();
        const last = resetRateLimit.get(utorid);
        if (last && now - last < 60 * 1000) {
            return res.status(429).json({ error: "Too Many Requests" });
        }
        resetRateLimit.set(utorid, now);

        // Check if user exists
        const user = await prisma.user.findUnique({ where: { utorid } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Generate reset token
        const resetToken = randomUUID();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        resetTokens.set(resetToken, { utorid, expiresAt });

        // ---------------- SEND EMAIL USING HELPER ----------------
        await sendEmail(
            user.email,
            "Your Bananacreds Password Reset Token",
            `
                <p>Hello ${user.name},</p>
                <p>You requested a password reset for your BananaCreds account.</p>
                <p>Your reset token is:</p>
                <h2>${resetToken}</h2>
                <p>This token expires in 1 hour.</p>
                <p>If you did not request this, you can ignore this email.</p>
            `
        );

        // Return only expiration timestamp (NOT the token)
        return res.status(202).json({
            expiresAt: expiresAt.toISOString()
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});



// ---------------- /auth/resets/:resetToken (POST) ----------------
router.post("/resets/:resetToken", async (req, res) => {
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

// ---------------- /auth/register (POST) ----------------
router.post("/register", async (req, res) => {
    try {
        const allowed = ["utorid", "name", "email", "birthday", "password"];
        if (Object.keys(req.body).some(k => !allowed.includes(k))) {
            return res.status(400).json({ error: "Invalid fields in request" });
        }

        const { utorid, name, email, birthday, password } = req.body;

        // Required fields
        if (!utorid || !name || !email || !password) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // UTORid format
        if (!/^[A-Za-z0-9]{7,8}$/.test(utorid)) {
            return res.status(400).json({ error: "Invalid UTORid format" });
        }

        // UofT email required
        if (!/^[A-Za-z0-9._%+-]+@mail\.utoronto\.ca$/.test(email)) {
            return res.status(400).json({ error: "Invalid UofT email" });
        }

        // Password strength
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

        // Check if UTORid/email already exist
        const existing = await prisma.user.findFirst({
            where: { OR: [{ utorid }, { email }] }
        });

        if (existing) {
            return res.status(409).json({
                error: "This UTORid or email cannot be used"
            });
        }

        // Hash password
        const hashed = await bcrypt.hash(password, 10);

        // Create the new user
        await prisma.user.create({
            data: {
                utorid,
                name,
                email,
                password: hashed,
                birthday: birthday ? new Date(birthday) : null,
                role: "regular",
                points: 0,
                verified: false,
                suspicious: false
            }
        });

        // Generate verification code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000;

        verificationCodes.set(utorid, { code, expiresAt });


        await sendEmail(
            email,
            "Your BANANACreds Verification Code",
            `
        <p>Hello ${name},</p>
        <p>Your BANANACreds verification code is:</p>
        <h2>${code}</h2>
        <p>This code expires in 10 minutes.</p>
    `
        );

        return res.status(201).json({ message: "User created" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});

// ---------------- /auth/verify (POST) ----------------
router.post("/verify", async (req, res) => {
    try {
        const { utorid, code } = req.body;

        if (!utorid || !code) {
            return res.status(400).json({ error: "Missing utorid or code" });
        }

        const user = await prisma.user.findUnique({ where: { utorid } });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (user.verified) {
            return res.status(400).json({ error: "Account already verified" });
        }

        const entry = verificationCodes.get(utorid);
        if (!entry) {
            return res.status(400).json({ error: "No verification code found" });
        }

        // expired?
        if (Date.now() > entry.expiresAt) {
            verificationCodes.delete(utorid);
            return res.status(400).json({ error: "Verification code expired" });
        }

        if (entry.code !== code) {
            return res.status(400).json({ error: "Incorrect verification code" });
        }

        // mark verified
        await prisma.user.update({
            where: { utorid },
            data: { verified: true }
        });

        verificationCodes.delete(utorid);

        return res.status(200).json({ message: "Account verified" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});


// ---------------- /auth/verify/resend (POST) ----------------
router.post("/verify/resend", async (req, res) => {
    try {
        const { utorid } = req.body;
        if (!utorid) return res.status(400).json({ error: "Missing utorid" });

        const user = await prisma.user.findUnique({ where: { utorid } });
        if (!user) return res.status(404).json({ error: "User not found" });

        if (user.verified) {
            return res.status(400).json({ error: "Account already verified" });
        }

        // rate limit: 1 email per minute
        const last = verifyRateLimit.get(utorid);
        if (last && Date.now() - last < 60 * 1000) {
            return res.status(429).json({ error: "Too many requests" });
        }
        verifyRateLimit.set(utorid, Date.now());

        // generate code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000;

        verificationCodes.set(utorid, { code, expiresAt });

        await sendEmail(
            user.email,
            "Your BANANACreds Verification Code (Resent)",
            `
        <p>Hello ${user.name},</p>
        <p>Your new BANANACreds verification code is:</p>
        <h2>${code}</h2>
        <p>This code expires in 10 minutes.</p>
    `
        );

        return res.status(200).json({ message: "Verification code resent" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});

export default router;