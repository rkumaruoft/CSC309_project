import nodemailer from "nodemailer";
import {
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_USER,
    EMAIL_PASS,
    EMAIL_FROM
} from "../config/env.js";

const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: false, // TLS on 587
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
});

export async function sendEmail(to, subject, html) {
    try {
        await transporter.sendMail({
            from: EMAIL_FROM,
            to,
            subject,
            html
        });
        return true;
    } catch (err) {
        console.error("Email send failed:", err);
        return false;
    }
}
