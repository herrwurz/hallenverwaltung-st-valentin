import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getWaitlistStatusLabel } from "../lib/waitlist-status";

test("pilot forms use building filtered room selects", () => {
  const component = readFileSync("components/building-room-select.tsx", "utf8");
  const portalBookings = readFileSync("app/portal/bookings/page.tsx", "utf8");
  const portalWaitlist = readFileSync("app/portal/waitlist/page.tsx", "utf8");

  assert.match(component, /selectedBuildingId/);
  assert.match(component, /availableRooms\.map/);
  assert.match(portalBookings, /<BuildingRoomSelect/);
  assert.match(portalWaitlist, /<BuildingRoomSelect/);
});

test("admin bookings uses status select and redirects completed transitions to their target status", () => {
  const adminBookings = readFileSync("app/admin/bookings/page.tsx", "utf8");
  const adminActions = readFileSync("app/admin/bookings/actions.ts", "utf8");

  assert.match(adminBookings, /<select\s+name="status"/);
  assert.match(adminBookings, /Offen \(beantragt \+ in Prüfung\)/);
  assert.match(adminActions, /"reviewed",\s*"IN_REVIEW"/);
  assert.match(adminActions, /"approved",\s*"APPROVED"/);
  assert.match(adminActions, /"rejected",\s*"REJECTED"/);
});

test("active waitlist entries are labelled as requested for portal users", () => {
  assert.equal(getWaitlistStatusLabel("ACTIVE"), "Beantragt");
});

test("phase 26 admin bookings keep organization filter through workflow actions", () => {
  const adminBookings = readFileSync("app/admin/bookings/page.tsx", "utf8");
  const adminActions = readFileSync("app/admin/bookings/actions.ts", "utf8");

  assert.match(adminBookings, /Organisation filtern/);
  assert.match(adminBookings, /name="organizationId"/);
  assert.match(adminActions, /organizationId/);
  assert.match(adminActions, /buildRedirect\(/);
});

test("phase 26 pilot UI hotfixes hide technical labels in key pages", () => {
  const dashboard = readFileSync("app/admin/page.tsx", "utf8");
  const series = readFileSync("app/admin/series/page.tsx", "utf8");
  const notifications = readFileSync("app/admin/notifications/page.tsx", "utf8");
  const publicPage = readFileSync("app/public/page.tsx", "utf8");

  assert.match(dashboard, /min-h-28 items-center justify-center/);
  assert.doesNotMatch(dashboard, /card\.value/);
  assert.match(series, /formatRecurrenceRule/);
  assert.doesNotMatch(series, /recurrenceRule\}\)/);
  assert.doesNotMatch(notifications, />\{eventCode\}</);
  assert.match(publicPage, /href="\/public\/calendar"/);
  assert.match(publicPage, /href="\/login"/);
  assert.doesNotMatch(publicPage, /Standorte/);
});
