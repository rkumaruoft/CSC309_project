import dotenv from "dotenv";
dotenv.config();

// Authentication
export const JWT_SECRET = process.env.JWT_SECRET;

// Frontend
export const FRONTEND_URL = process.env.FRONTEND_URL;
export const DATABASE_URL = process.env.DATABASE_URL;

// Resend (new)
export const RESEND_API_KEY = process.env.RESEND_API_KEY;
export const EMAIL_FROM = process.env.EMAIL_FROM || "BananaCreds <noreply@bananacreds.ca>";
