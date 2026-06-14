import nodemailer from "nodemailer";
import { z } from "zod";

const booleanFromEnv = z
  .union([z.boolean(), z.string()])
  .transform((value) => (typeof value === "boolean" ? value : value.toLowerCase() === "true"));

const smtpConfigSchema = z.object({
  host: z.string().trim().min(1),
  port: z.coerce.number().int().positive(),
  secure: booleanFromEnv,
  user: z.string().trim().optional(),
  password: z.string().optional(),
  fromEmail: z.email(),
  fromName: z.string().trim().min(1).default("Hallenverwaltung St. Valentin"),
});

export class MailDeliveryError extends Error {}

export type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

let cachedTransporter: nodemailer.Transporter | null = null;
let cachedTransportKey: string | null = null;

function getMailEnv() {
  return {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE ?? "false",
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    fromEmail: process.env.SMTP_FROM_EMAIL,
    fromName: process.env.SMTP_FROM_NAME ?? "Hallenverwaltung St. Valentin",
  };
}

export function getSmtpConfigurationStatus() {
  const env = getMailEnv();
  const missingFields = [
    !env.host ? "SMTP_HOST" : null,
    !env.port ? "SMTP_PORT" : null,
    !env.fromEmail ? "SMTP_FROM_EMAIL" : null,
  ].filter((field): field is string => Boolean(field));
  const usesPlaceholder =
    env.host === "smtp.example.test" ||
    env.fromEmail === "hallenverwaltung@example.test" ||
    env.password === "replace-with-smtp-password";

  return {
    configured: missingFields.length === 0 && !usesPlaceholder,
    usesPlaceholder,
    missingFields,
    host: env.host ?? null,
    fromEmail: env.fromEmail ?? null,
  };
}

export function getSmtpConfig() {
  const env = getMailEnv();
  if (!env.host || !env.port || !env.fromEmail) {
    throw new MailDeliveryError("SMTP ist nicht vollständig konfiguriert.");
  }

  const status = getSmtpConfigurationStatus();
  if (status.usesPlaceholder) {
    throw new MailDeliveryError(
      "SMTP ist noch mit Platzhalterwerten konfiguriert. Bitte echte SMTP-Daten in .env setzen, bevor eine Testmail versendet wird.",
    );
  }

  return smtpConfigSchema.parse(env);
}

function getTransporter() {
  const config = getSmtpConfig();
  const key = JSON.stringify(config);

  if (!cachedTransporter || cachedTransportKey !== key) {
    cachedTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user && config.password ? { user: config.user, pass: config.password } : undefined,
    });
    cachedTransportKey = key;
  }

  return {
    transporter: cachedTransporter,
    from: `${config.fromName} <${config.fromEmail}>`,
  };
}

export async function sendEmail(payload: MailPayload) {
  const { transporter, from } = getTransporter();

  try {
    return await transporter.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter SMTP-Fehler";
    throw new MailDeliveryError(message);
  }
}
