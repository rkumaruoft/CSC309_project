import { Resend } from "resend";
import { RESEND_API_KEY, EMAIL_FROM } from "../config/env.js";

const resend = new Resend(RESEND_API_KEY);

export async function sendEmail(to, subject, html) {
    try {
        await resend.emails.send({
            from: EMAIL_FROM,
            to,
            subject,
            html
        });
        return true;
    } catch (err) {
        console.error("Email sending failed:", err);
        return false;
    }
}
