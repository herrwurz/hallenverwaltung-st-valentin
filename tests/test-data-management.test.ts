import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const serviceSource = readFileSync("lib/services/test-data-service.ts", "utf8");
const pageSource = readFileSync("app/admin/system/test-data/page.tsx", "utf8");
const actionsSource = readFileSync("app/admin/system/test-data/actions.ts", "utf8");
const layoutSource = readFileSync("app/admin/layout.tsx", "utf8");

test("test data tools are protected by environment flag", () => {
  assert.match(serviceSource, /TEST_DATA_TOOLS_ENABLED/);
  assert.match(serviceSource, /process\.env\.TEST_DATA_TOOLS_ENABLED === "true"/);
  assert.match(pageSource, /TEST_DATA_TOOLS_ENABLED=true/);
});

test("test data UI and actions require super or system admin role", () => {
  assert.match(pageSource, /roles\.includes\("SUPER_ADMIN"\)/);
  assert.match(pageSource, /roles\.includes\("SYSTEM_ADMIN"\)/);
  assert.match(actionsSource, /roles\.includes\("SUPER_ADMIN"\)/);
  assert.match(actionsSource, /roles\.includes\("SYSTEM_ADMIN"\)/);
  assert.match(layoutSource, /\/admin\/system\/test-data/);
});

test("test data actions do not catch Next redirect exceptions as user-facing errors", () => {
  assert.match(actionsSource, /let redirectParams/);
  assert.match(actionsSource, /testDataRedirect\(redirectParams\)/);
  assert.doesNotMatch(actionsSource, /testDataRedirect\(\{\s*success/);
  assert.doesNotMatch(actionsSource, /testDataRedirect\(\{\s*error/);
});

test("test data deletion is marker-based and never uses broad destructive operations", () => {
  assert.doesNotMatch(serviceSource, /deleteMany\(\s*\{\s*\}\s*\)/);
  assert.doesNotMatch(serviceSource, /TRUNCATE/i);
  assert.doesNotMatch(serviceSource, /DROP\s+(TABLE|DATABASE|SCHEMA)/i);
  assert.doesNotMatch(serviceSource, /migrate reset|db push --force-reset/i);
  assert.match(serviceSource, /\[TEST\]/);
  assert.match(serviceSource, /@test\.local/);
});

test("test booking cleanup preserves booking history by archiving instead of deleting bookings", () => {
  assert.match(serviceSource, /archiveMarkedTestBookings/);
  assert.match(serviceSource, /BookingStatus\.ARCHIVED/);
  assert.doesNotMatch(serviceSource, /booking\.deleteMany/);
  assert.doesNotMatch(serviceSource, /booking\.delete\(/);
  assert.match(serviceSource, /bookingStatusHistory\.create/);
});

test("phase 42 creates the required test users and booking statuses", () => {
  for (const email of [
    "superadmin@test.local",
    "gemeinde@test.local",
    "verein@test.local",
    "hauswart@test.local",
    "vhs@test.local",
  ]) {
    assert.match(serviceSource, new RegExp(email.replace(".", "\\.")));
  }

  for (const status of ["APPROVED", "REQUESTED", "IN_REVIEW", "REJECTED", "CANCELLED"]) {
    assert.match(serviceSource, new RegExp(`BookingStatus\\.${status}`));
  }

  assert.match(serviceSource, /Test1234!Test/);
});
