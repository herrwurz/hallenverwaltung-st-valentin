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
  "AUTH_URL",
  "AUTH_SECRET",
  "AUTH_TRUST_HOST",
  "SERVER_NAME",
  "TLS_CERT_DIR",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM_EMAIL",
  "SMTP_FROM_NAME",
  "WORKER_INTERVAL_SECONDS",
] as const;

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

  const authUrl = values.get("AUTH_URL");
  if (authUrl && !authUrl.startsWith("https://")) {
    errors.push("AUTH_URL must use https:// in production.");
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

  if (values.get("AUTH_TRUST_HOST") !== "true") {
    errors.push("AUTH_TRUST_HOST must be true in production.");
  }

  const authSecret = values.get("AUTH_SECRET");
  if (authSecret && authSecret.length < 32) {
    errors.push("AUTH_SECRET must be at least 32 characters long.");
  }

  const smtpPort = Number(values.get("SMTP_PORT"));
  if (!Number.isInteger(smtpPort) || smtpPort <= 0 || smtpPort > 65535) {
    errors.push("SMTP_PORT must be a valid TCP port.");
  }

  const smtpSecure = values.get("SMTP_SECURE");
  if (smtpSecure && !["true", "false"].includes(smtpSecure)) {
    errors.push("SMTP_SECURE must be true or false.");
  }

  const workerInterval = Number(values.get("WORKER_INTERVAL_SECONDS"));
  if (!Number.isInteger(workerInterval) || workerInterval < 60) {
    errors.push("WORKER_INTERVAL_SECONDS must be an integer >= 60.");
  }

  const smtpFrom = values.get("SMTP_FROM_EMAIL");
  if (smtpFrom && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(smtpFrom)) {
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
