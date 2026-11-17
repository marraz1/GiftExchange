import nodemailer, { type Transporter } from "nodemailer";
import { db, emailLog } from "../db";

export type Mail = { to: string; subject: string; html: string; text: string };
export type SendResult = { ok: true } | { ok: false; error: string };

const FROM_NAME = () => process.env.EMAIL_FROM_NAME || "Dovanų keitimasis";

/** Which provider is configured: Resend wins if its key is set, Gmail SMTP is the fallback. */
export function emailProvider(): "resend" | "gmail" | null {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) return "gmail";
  return null;
}

export function emailConfigured(): boolean {
  return emailProvider() !== null;
}

// ---------- Resend ----------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Resend's default limit is 2 requests/second; space calls out so bulk sends don't hit 429.
let lastResendCall = 0;

async function sendViaResend(mail: Mail): Promise<SendResult> {
  const from = process.env.EMAIL_FROM || `${FROM_NAME()} <onboarding@resend.dev>`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const wait = lastResendCall + 600 - Date.now();
    if (wait > 0) await sleep(wait);
    lastResendCall = Date.now();
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text }),
      });
      if (res.ok) return { ok: true };
      if (res.status === 429 && attempt < 2) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      return { ok: false, error: `Resend ${res.status}: ${body?.message ?? res.statusText}`.slice(0, 500) };
    } catch (e) {
      if (attempt < 2) continue;
      return { ok: false, error: e instanceof Error ? e.message.slice(0, 500) : String(e) };
    }
  }
  return { ok: false, error: "Resend: per daug bandymų" };
}

// ---------- Gmail SMTP (fallback) ----------

let transporter: Transporter | null = null;

async function sendViaGmail(mail: Mail): Promise<SendResult> {
  transporter ??= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    pool: true,
    maxConnections: 3,
    auth: { user: process.env.GMAIL_USER!, pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s+/g, "") },
  });
  try {
    await transporter.sendMail({
      from: { name: FROM_NAME(), address: process.env.GMAIL_USER! },
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

async function sendRaw(mail: Mail): Promise<SendResult> {
  const provider = emailProvider();
  if (provider === "resend") return sendViaResend(mail);
  if (provider === "gmail") return sendViaGmail(mail);
  if (process.env.VERCEL) return { ok: false, error: "El. paštas nesukonfigūruotas (RESEND_API_KEY)" };
  console.log(`\n[email:dev] To: ${mail.to}\nSubject: ${mail.subject}\n${mail.text}\n`);
  return { ok: true };
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
