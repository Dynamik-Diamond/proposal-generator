import "server-only";
import { Resend } from "resend";

type Mail = { to: string; subject: string; text: string };

/** Sends via Resend when configured; otherwise logs (so local dev works without email). */
export async function sendMail(mail: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.info(`[email skipped: RESEND_API_KEY/EMAIL_FROM not set] to=${mail.to} subject="${mail.subject}"`);
    return;
  }
  try {
    const { error } = await new Resend(key).emails.send({ from, to: mail.to, subject: mail.subject, text: mail.text });
    if (error) console.error("Resend error:", error);
  } catch (err) {
    // Notifications must never break the client's flow.
    console.error("Email send failed:", err);
  }
}
