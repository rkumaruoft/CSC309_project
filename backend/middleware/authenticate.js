const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Authentication
module.exports = async function authenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: "Missing Authorization header" });

    const token = header.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user) return res.status(401).json({ error: "User not found" });
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }
}