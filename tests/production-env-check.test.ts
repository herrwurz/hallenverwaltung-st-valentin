import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateProductionEnv } from "../scripts/check-production-env";

const validProductionEnv = `
POSTGRES_DB=hallenverwaltung
POSTGRES_USER=hallenverwaltung
POSTGRES_PASSWORD=strong-database-password-value
APP_ENV=production
PUBLIC_BASE_URL=https://hallenverwaltung.st-valentin.gv.at
AUTH_URL=https://hallenverwaltung.st-valentin.gv.at
AUTH_SECRET=0123456789abcdefghijklmnopqrstuvwxyz
AUTH_TRUST_HOST=true
PUBLIC_AREA_ENABLED=false
SERVER_NAME=hallenverwaltung.st-valentin.gv.at
TLS_CERT_DIR=./deploy/certs
WORKER_INTERVAL_SECONDS=300
MAIL_DELIVERY_MODE=smtp
SMTP_HOST=smtp.st-valentin.gv.at
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=hallenverwaltung
SMTP_PASSWORD=strong-smtp-password-value
SMTP_FROM_EMAIL=hallenverwaltung@st-valentin.gv.at
SMTP_FROM_NAME=Hallenverwaltung St. Valentin
`;

const validTestEnv = `
POSTGRES_DB=hallenverwaltung_test
POSTGRES_USER=hallenverwaltung
POSTGRES_PASSWORD=strong-test-database-password-value
APP_ENV=test
PUBLIC_BASE_URL=http://test-hallenverwaltung.local
AUTH_URL=http://test-hallenverwaltung.local
AUTH_SECRET=0123456789abcdefghijklmnopqrstuvwxyz-test
AUTH_TRUST_HOST=true
PUBLIC_AREA_ENABLED=false
SERVER_NAME=test-hallenverwaltung.local
TLS_CERT_DIR=./deploy/certs-test
WORKER_INTERVAL_SECONDS=300
MAIL_DELIVERY_MODE=disabled
`;

test("accepts a complete production env without placeholders", () => {
  const result = validateProductionEnv(validProductionEnv);

  assert.deepEqual(result.errors, []);
  assert.ok(result.warnings.some((warning) => warning.includes("AUTH_SECRET")));
});

test("accepts a test env with disabled mail delivery", () => {
  const result = validateProductionEnv(validTestEnv);

  assert.deepEqual(result.errors, []);
  assert.ok(result.warnings.some((warning) => warning.includes("SMTP delivery is disabled")));
  assert.ok(result.warnings.some((warning) => warning.includes("AUTH_URL does not use https")));
});

test("rejects missing placeholders and unsafe production env values", () => {
  const result = validateProductionEnv(`
POSTGRES_DB=hallenverwaltung
POSTGRES_USER=hallenverwaltung
POSTGRES_PASSWORD=replace-with-strong-database-password
APP_ENV=production
PUBLIC_BASE_URL=http://hallenverwaltung.example.org
AUTH_URL=http://hallenverwaltung.example.org
AUTH_SECRET=short
AUTH_TRUST_HOST=false
PUBLIC_AREA_ENABLED=maybe
SERVER_NAME=hallenverwaltung.example.org
TLS_CERT_DIR=./deploy/certs
WORKER_INTERVAL_SECONDS=30
MAIL_DELIVERY_MODE=disabled
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
  assert.ok(result.errors.some((error) => error.includes("PUBLIC_BASE_URL must use https://")));
  assert.ok(result.errors.some((error) => error.includes("AUTH_SECRET must be at least 32")));
  assert.ok(result.errors.some((error) => error.includes("AUTH_TRUST_HOST must be true")));
  assert.ok(result.errors.some((error) => error.includes("PUBLIC_AREA_ENABLED")));
  assert.ok(result.errors.some((error) => error.includes("MAIL_DELIVERY_MODE must be smtp in production")));
  assert.ok(result.errors.some((error) => error.includes("WORKER_INTERVAL_SECONDS")));
});

test("rejects invalid smtp settings when smtp delivery is enabled", () => {
  const result = validateProductionEnv(`
POSTGRES_DB=hallenverwaltung
POSTGRES_USER=hallenverwaltung
POSTGRES_PASSWORD=strong-database-password-value
APP_ENV=test
PUBLIC_BASE_URL=https://test-hallenverwaltung.st-valentin.gv.at
AUTH_URL=https://test-hallenverwaltung.st-valentin.gv.at
AUTH_SECRET=0123456789abcdefghijklmnopqrstuvwxyz
AUTH_TRUST_HOST=true
PUBLIC_AREA_ENABLED=false
SERVER_NAME=test-hallenverwaltung.st-valentin.gv.at
TLS_CERT_DIR=./deploy/certs-test
WORKER_INTERVAL_SECONDS=300
MAIL_DELIVERY_MODE=smtp
SMTP_HOST=smtp.example.org
SMTP_PORT=70000
SMTP_SECURE=maybe
SMTP_USER=smtp-user
SMTP_PASSWORD=replace-with-smtp-password
SMTP_FROM_EMAIL=not-an-email
SMTP_FROM_NAME=Hallenverwaltung St. Valentin
`);

  assert.ok(result.errors.some((error) => error.includes("SMTP_HOST")));
  assert.ok(result.errors.some((error) => error.includes("SMTP_PORT")));
  assert.ok(result.errors.some((error) => error.includes("SMTP_SECURE")));
  assert.ok(result.errors.some((error) => error.includes("SMTP_PASSWORD")));
  assert.ok(result.errors.some((error) => error.includes("SMTP_FROM_EMAIL")));
});

test("documents separate test and production environment templates", () => {
  const envExample = readFileSync(".env.example", "utf8");
  const testExample = readFileSync(".env.test.example", "utf8");
  const productionExample = readFileSync(".env.production.example", "utf8");
  const installationDocs = readFileSync("docs/installation-options.md", "utf8");
  const compose = readFileSync("docker-compose.production.yml", "utf8");

  assert.match(envExample, /APP_ENV=local/);
  assert.match(testExample, /APP_ENV=test/);
  assert.match(testExample, /MAIL_DELIVERY_MODE=disabled/);
  assert.match(productionExample, /APP_ENV=production/);
  assert.match(productionExample, /MAIL_DELIVERY_MODE=smtp/);
  assert.match(installationDocs, /\.env\.test/);
  assert.match(installationDocs, /Gemeinde-Server/);
  assert.match(compose, /APP_ENV: \${APP_ENV/);
  assert.match(compose, /PUBLIC_BASE_URL: \${PUBLIC_BASE_URL/);
  assert.match(compose, /MAIL_DELIVERY_MODE: \${MAIL_DELIVERY_MODE/);
});
