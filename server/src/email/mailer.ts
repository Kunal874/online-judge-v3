import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

let transporterPromise: Promise<Transporter> | null = null;

// Real SMTP config (Resend, Gmail app-password, etc.) plugs in here via env
// vars once there's an actual deployment (M15) — until then, an Ethereal
// test account is created on demand: a real inbox nothing else can see,
// zero signup, nothing ever actually delivered.
function getTransporter(): Promise<Transporter> {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    if (env.SMTP_HOST) {
      return nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      });
    }

    const testAccount = await nodemailer.createTestAccount();
    logger.info({ user: testAccount.user }, "Using Ethereal test SMTP account for email (dev only)");
    return nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  })();

  return transporterPromise;
}

export async function sendMail(options: { to: string; subject: string; html: string }): Promise<void> {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: '"Online Judge" <no-reply@online-judge.local>',
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    logger.info({ previewUrl, to: options.to, subject: options.subject }, "Email sent (Ethereal preview)");
  }
}
