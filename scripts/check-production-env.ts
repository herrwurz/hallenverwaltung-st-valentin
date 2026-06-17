import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type CheckResult = {
  errors: string[];
  warnings: string[];
};

const requiredKeys = [
  "POSTGRES_DB",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "APP_ENV",
  "PUBLIC_BASE_URL",
  "AUTH_URL",
  "AUTH_SECRET",
  "AUTH_TRUST_HOST",
  "PUBLIC_AREA_ENABLED",
  "SERVER_NAME",
  "TLS_CERT_DIR",
  "MAIL_DELIVERY_MODE",
  "WORKER_INTERVAL_SECONDS",
] as const;

const smtpKeys = ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM_EMAIL", "SMTP_FROM_NAME"] as const;

const secretKeys = new Set(["POSTGRES_PASSWORD", "AUTH_SECRET", "SMTP_PASSWORD"]);

function parseEnvFile(content: string) {
  const values = new Map<string, string>();

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    const value =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue;

    values.set(key, value);
  }

  return values;
}

function hasPlaceholder(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("replace-with") ||
    normalized.includes("example.org") ||
    normalized.includes("example.test") ||
    normalized.includes("smtp-user")
  );
}

export function validateProductionEnv(content: string, options: { checkFiles?: boolean } = {}): CheckResult {
  const values = parseEnvFile(content);
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const key of requiredKeys) {
    const value = values.get(key);
    if (!value) {
      errors.push(`${key} is missing or empty.`);
      continue;
    }

    if (hasPlaceholder(value)) {
      errors.push(`${key} still contains a placeholder value.`);
    }
  }

  const appEnv = values.get("APP_ENV");
  if (appEnv && !["test", "production"].includes(appEnv)) {
    errors.push("APP_ENV must be test or production for deployed environments.");
  }

  const isProduction = appEnv === "production";
  const isTest = appEnv === "test";

  const mailDeliveryMode = values.get("MAIL_DELIVERY_MODE");
  if (mailDeliveryMode && !["disabled", "smtp"].includes(mailDeliveryMode)) {
    errors.push("MAIL_DELIVERY_MODE must be disabled or smtp.");
  }

  if (isProduction && mailDeliveryMode !== "smtp") {
    errors.push("MAIL_DELIVERY_MODE must be smtp in production.");
  }

  if (mailDeliveryMode === "smtp") {
    for (const key of smtpKeys) {
      const value = values.get(key);
      if (!value) {
        errors.push(`${key} is missing or empty.`);
        continue;
      }

      if (hasPlaceholder(value)) {
        errors.push(`${key} still contains a placeholder value.`);
      }
    }
  } else if (isTest) {
    warnings.push("SMTP delivery is disabled for this test environment.");
  }

  const authUrl = values.get("AUTH_URL");
  if (authUrl && isProduction && !authUrl.startsWith("https://")) {
    errors.push("AUTH_URL must use https:// in production.");
  } else if (authUrl && isTest && !authUrl.startsWith("https://")) {
    warnings.push("AUTH_URL does not use https:// in this test environment.");
  }

  const publicBaseUrl = values.get("PUBLIC_BASE_URL");
  if (publicBaseUrl && isProduction && !publicBaseUrl.startsWith("https://")) {
    errors.push("PUBLIC_BASE_URL must use https:// in production.");
  } else if (publicBaseUrl && isTest && !publicBaseUrl.startsWith("https://")) {
    warnings.push("PUBLIC_BASE_URL does not use https:// in this test environment.");
  }

  const serverName = values.get("SERVER_NAME");
  if (authUrl && serverName) {
    try {
      const hostname = new URL(authUrl).hostname;
      if (hostname !== serverName) {
        warnings.push("AUTH_URL hostname differs from SERVER_NAME.");
      }
    } catch {
      errors.push("AUTH_URL is not a valid URL.");
    }
  }

  if (publicBaseUrl && serverName) {
    try {
      const hostname = new URL(publicBaseUrl).hostname;
      if (hostname !== serverName) {
        warnings.push("PUBLIC_BASE_URL hostname differs from SERVER_NAME.");
      }
    } catch {
      errors.push("PUBLIC_BASE_URL is not a valid URL.");
    }
  }

  if (values.get("AUTH_TRUST_HOST") !== "true") {
    errors.push("AUTH_TRUST_HOST must be true in deployed environments.");
  }

  const publicAreaEnabled = values.get("PUBLIC_AREA_ENABLED");
  if (publicAreaEnabled && !["true", "false"].includes(publicAreaEnabled)) {
    errors.push("PUBLIC_AREA_ENABLED must be true or false.");
  }

  const authSecret = values.get("AUTH_SECRET");
  if (authSecret && authSecret.length < 32) {
    errors.push("AUTH_SECRET must be at least 32 characters long.");
  }

  const smtpPort = Number(values.get("SMTP_PORT"));
  if (mailDeliveryMode === "smtp" && (!Number.isInteger(smtpPort) || smtpPort <= 0 || smtpPort > 65535)) {
    errors.push("SMTP_PORT must be a valid TCP port.");
  }

  const smtpSecure = values.get("SMTP_SECURE");
  if (mailDeliveryMode === "smtp" && smtpSecure && !["true", "false"].includes(smtpSecure)) {
    errors.push("SMTP_SECURE must be true or false.");
  }

  const workerInterval = Number(values.get("WORKER_INTERVAL_SECONDS"));
  if (!Number.isInteger(workerInterval) || workerInterval < 60) {
    errors.push("WORKER_INTERVAL_SECONDS must be an integer >= 60.");
  }

  const smtpFrom = values.get("SMTP_FROM_EMAIL");
  if (mailDeliveryMode === "smtp" && smtpFrom && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(smtpFrom)) {
    errors.push("SMTP_FROM_EMAIL must be a valid email address.");
  }

  const tlsCertDir = values.get("TLS_CERT_DIR");
  if (options.checkFiles && tlsCertDir) {
    const fullchainPath = join(tlsCertDir, "fullchain.pem");
    const privkeyPath = join(tlsCertDir, "privkey.pem");
    if (!existsSync(fullchainPath)) {
      errors.push(`TLS certificate file is missing: ${fullchainPath}`);
    }
    if (!existsSync(privkeyPath)) {
      errors.push(`TLS private key file is missing: ${privkeyPath}`);
    }
  }

  for (const key of secretKeys) {
    if (values.has(key)) {
      warnings.push(`${key} was checked without printing its value.`);
    }
  }

  return { errors, warnings };
}

function printResult(result: CheckResult) {
  if (result.errors.length === 0) {
    console.log("Production environment check passed.");
  } else {
    console.error("Production environment check failed:");
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of result.warnings) {
      console.log(`- ${warning}`);
    }
  }
}

function main() {
  const args = new Set(process.argv.slice(2));
  const envFile = process.env.ENV_FILE ?? ".env.production";

  if (!existsSync(envFile)) {
    console.error(`Production env file not found: ${envFile}`);
    process.exitCode = 1;
    return;
  }

  const result = validateProductionEnv(readFileSync(envFile, "utf8"), {
    checkFiles: args.has("--check-files"),
  });
  printResult(result);

  if (result.errors.length > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}
