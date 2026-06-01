import assert from "node:assert/strict";
import test from "node:test";
import { validateProductionEnv } from "../scripts/check-production-env";

const validProductionEnv = `
POSTGRES_DB=hallenverwaltung
POSTGRES_USER=hallenverwaltung
POSTGRES_PASSWORD=strong-database-password-value
AUTH_URL=https://hallenverwaltung.st-valentin.example
AUTH_SECRET=0123456789abcdefghijklmnopqrstuvwxyz
AUTH_TRUST_HOST=true
SERVER_NAME=hallenverwaltung.st-valentin.example
TLS_CERT_DIR=./deploy/certs
WORKER_INTERVAL_SECONDS=300
SMTP_HOST=smtp.st-valentin.example
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=hallenverwaltung
SMTP_PASSWORD=strong-smtp-password-value
SMTP_FROM_EMAIL=hallenverwaltung@st-valentin.example
SMTP_FROM_NAME=Hallenverwaltung St. Valentin
`;

test("accepts a complete production env without placeholders", () => {
  const result = validateProductionEnv(validProductionEnv);

  assert.deepEqual(result.errors, []);
  assert.ok(result.warnings.some((warning) => warning.includes("AUTH_SECRET")));
});

test("rejects missing placeholders and unsafe production env values", () => {
  const result = validateProductionEnv(`
POSTGRES_DB=hallenverwaltung
POSTGRES_USER=hallenverwaltung
POSTGRES_PASSWORD=replace-with-strong-database-password
AUTH_URL=http://hallenverwaltung.example.org
AUTH_SECRET=short
AUTH_TRUST_HOST=false
SERVER_NAME=hallenverwaltung.example.org
TLS_CERT_DIR=./deploy/certs
WORKER_INTERVAL_SECONDS=30
SMTP_HOST=smtp.example.org
SMTP_PORT=70000
SMTP_SECURE=maybe
SMTP_USER=smtp-user
SMTP_PASSWORD=replace-with-smtp-password
SMTP_FROM_EMAIL=not-an-email
SMTP_FROM_NAME=Hallenverwaltung St. Valentin
`);

  assert.ok(result.errors.some((error) => error.includes("POSTGRES_PASSWORD")));
  assert.ok(result.errors.some((error) => error.includes("AUTH_URL must use https://")));
  assert.ok(result.errors.some((error) => error.includes("AUTH_SECRET must be at least 32")));
  assert.ok(result.errors.some((error) => error.includes("AUTH_TRUST_HOST must be true")));
  assert.ok(result.errors.some((error) => error.includes("SMTP_PORT")));
  assert.ok(result.errors.some((error) => error.includes("SMTP_SECURE")));
  assert.ok(result.errors.some((error) => error.includes("WORKER_INTERVAL_SECONDS")));
  assert.ok(result.errors.some((error) => error.includes("SMTP_FROM_EMAIL")));
});
