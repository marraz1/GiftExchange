import nodemailer, { type Transporter } from "nodemailer";
import { db, emailLog } from "../db";

export type Mail = { to: string; subject: string; html: string; text: string };
export type SendResult = { ok: true } | { ok: false; error: string };

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      pool: true,
      maxConnections: 3,
      auth: { user, pass: pass.replace(/\s+/g, "") },
    });
  }
  return transporter;
}

export function emailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

async function sendRaw(mail: Mail): Promise<SendResult> {
  const t = getTransporter();
  if (!t) {
    if (process.env.VERCEL) return { ok: false, error: "El. paštas nesukonfigūruotas (GMAIL_USER / GMAIL_APP_PASSWORD)" };
    console.log(`\n[email:dev] To: ${mail.to}\nSubject: ${mail.subject}\n${mail.text}\n`);
    return { ok: true };
  }
  try {
    await t.sendMail({
      from: { name: process.env.EMAIL_FROM_NAME || "Dovanų keitimasis", address: process.env.GMAIL_USER! },
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 500) : String(e) };
  }
}

/** Sends an email and records the outcome in email_log. */
export async function sendMail(
  mail: Mail,
  meta: { kind: string; eventId?: string | null; participantId?: string | null },
): Promise<SendResult> {
  const res = await sendRaw(mail);
  try {
    await db().insert(emailLog).values({
      kind: meta.kind,
      eventId: meta.eventId ?? null,
      participantId: meta.participantId ?? null,
      recipient: mail.to,
      status: res.ok ? "sent" : "failed",
      error: res.ok ? null : res.error,
    });
  } catch (e) {
    console.error("email_log insert failed", e);
  }
  return res;
}
