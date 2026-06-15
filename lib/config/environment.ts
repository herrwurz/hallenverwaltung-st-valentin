import { z } from "zod";

export const appEnvironmentSchema = z.enum(["local", "test", "production"]);
export type AppEnvironment = z.infer<typeof appEnvironmentSchema>;

export const mailDeliveryModeSchema = z.enum(["disabled", "smtp"]);
export type MailDeliveryMode = z.infer<typeof mailDeliveryModeSchema>;

function parseBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === "") {
    return fallback;
  }

  return value.toLowerCase() === "true";
}

export function getAppEnvironment(): AppEnvironment {
  const parsed = appEnvironmentSchema.safeParse(process.env.APP_ENV);
  if (parsed.success) {
    return parsed.data;
  }

  return process.env.NODE_ENV === "production" ? "production" : "local";
}

export function getPublicBaseUrl() {
  return process.env.PUBLIC_BASE_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
}

export function getPublicAreaDefaultEnabled() {
  return parseBooleanEnv(process.env.PUBLIC_AREA_ENABLED, true);
}

export function getMailDeliveryMode(): MailDeliveryMode {
  const parsed = mailDeliveryModeSchema.safeParse(process.env.MAIL_DELIVERY_MODE);
  return parsed.success ? parsed.data : "smtp";
}

export function isProductionEnvironment() {
  return getAppEnvironment() === "production";
}
