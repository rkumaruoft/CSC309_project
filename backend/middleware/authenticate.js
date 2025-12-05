import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { JWT_SECRET } from "../config/env.js";

const prisma = new PrismaClient();

async function authenticate(req, res, next) {
    const header = req.headers.authorization;
    const cookie = req.cookies.refresh_token;

    // Must have BOTH
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing access token" });
    }

    if (!cookie) {
        return res.status(401).json({ error: "Missing auth cookie" });
    }

    const token = header.split(" ")[1];

    try {
        // Verify ACCESS TOKEN
        const decoded = jwt.verify(token, JWT_SECRET);

        // Verify REFRESH TOKEN (we don't refresh here, just validate)
        const refreshPayload = jwt.verify(cookie, JWT_SECRET);

        // Ensure both tokens belong to same user
        if (decoded.id !== refreshPayload.id) {
            return res.status(401).json({ error: "Token mismatch" });
        }

        // Fetch user
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });

        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        req.user = user;
        next();

    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

export default authenticate;