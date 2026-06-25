import { z } from "zod";
import { getMailDeliveryMode } from "@/lib/config/environment";
import { smtpSend, SmtpError } from "@/lib/services/smtp-client";

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
  const deliveryMode = getMailDeliveryMode();
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
    configured: deliveryMode === "smtp" && missingFields.length === 0 && !usesPlaceholder,
    deliveryMode,
    usesPlaceholder,
    missingFields,
    host: env.host ?? null,
    port: env.port ?? null,
    secure: env.secure,
    userConfigured: Boolean(env.user),
    passwordConfigured: Boolean(env.password),
    fromEmail: env.fromEmail ?? null,
    fromName: env.fromName,
  };
}

export function getSmtpConfig() {
  if (getMailDeliveryMode() === "disabled") {
    throw new MailDeliveryError("E-Mail-Versand ist per MAIL_DELIVERY_MODE=disabled deaktiviert.");
  }

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

export async function sendEmail(payload: MailPayload) {
  const config = getSmtpConfig();

  try {
    await smtpSend({
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.user,
      password: config.password,
      from: `${config.fromName} <${config.fromEmail}>`,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
  } catch (error) {
    const message = error instanceof SmtpError || error instanceof Error ? error.message : "Unbekannter SMTP-Fehler";
    throw new MailDeliveryError(message);
  }
}
