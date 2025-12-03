import { Resend } from "resend";
import { RESEND_API_KEY, EMAIL_FROM } from "../config/env.js";

const resend = new Resend(RESEND_API_KEY);

export async function sendEmail(to, subject, html) {
    console.log("Sending email to", to, "with subject", subject);
    try {
        const result = await resend.emails.send({
            from: EMAIL_FROM,
            to,
            subject,
            html,
        });

        if (result.error) {
            console.error("Resend error:", result.error);
            return false;
        }

        return true;
    } catch (err) {
        console.error("Resend exception:", err);
        return false;
    }
}
