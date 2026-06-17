import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const bootstrapService = readFileSync("lib/services/test-bootstrap-service.ts", "utf8");
const bootstrapRoute = readFileSync("app/api/test-bootstrap/route.ts", "utf8");
const testDataService = readFileSync("lib/services/test-data-service.ts", "utf8");
const envTest = readFileSync(".env.test.example", "utf8");
const envProduction = readFileSync(".env.production.example", "utf8");
const deploymentDocs = readFileSync("docs/hetzner-testserver-deployment.md", "utf8");

test("test bootstrap is protected by token and test-only environment flags", () => {
  assert.match(bootstrapService, /TEST_BOOTSTRAP_TOKEN/);
  assert.match(bootstrapService, /TEST_DATA_TOOLS_ENABLED/);
  assert.match(bootstrapService, /APP_ENV !== "production"/);
  assert.match(bootstrapService, /timingSafeEqual/);
  assert.match(bootstrapRoute, /x-test-bootstrap-token/);
});

test("test bootstrap is documented for Coolify without enabling production", () => {
  assert.match(envTest, /TEST_DATA_TOOLS_ENABLED=true/);
  assert.match(envTest, /TEST_BOOTSTRAP_TOKEN=replace-with-a-long-random-test-bootstrap-token/);
  assert.match(envProduction, /TEST_DATA_TOOLS_ENABLED=false/);
  assert.match(envProduction, /TEST_BOOTSTRAP_TOKEN=/);
  assert.match(deploymentDocs, /\/api\/test-bootstrap\?token=/);
});

test("test data service remains production-blocked", () => {
  assert.match(testDataService, /APP_ENV === "production"/);
  assert.match(testDataService, /Testdaten-Werkzeuge sind in Produktion deaktiviert/);
});

test("bootstrap creates only minimal catalogs and delegates marked data creation", () => {
  assert.match(bootstrapService, /bootstrapPermissions/);
  assert.match(bootstrapService, /bootstrapRoles/);
  assert.match(bootstrapService, /bootstrapOrganizationTypes/);
  assert.match(bootstrapService, /bootstrapTariffGroups/);
  assert.match(bootstrapService, /bootstrapUsageTypes/);
  assert.match(bootstrapService, /createTestData/);
});
