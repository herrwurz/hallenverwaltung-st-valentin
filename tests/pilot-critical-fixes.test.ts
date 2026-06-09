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

test("phase 26.4 pilot master data fixes protect codes and settings navigation", () => {
  const buildingPage = readFileSync("app/admin/buildings/page.tsx", "utf8");
  const buildingService = readFileSync("lib/services/admin/building-service.ts", "utf8");
  const organizationService = readFileSync("lib/services/admin/organization-service.ts", "utf8");
  const adminLayout = readFileSync("app/admin/layout.tsx", "utf8");
  const seed = readFileSync("prisma/seed.ts", "utf8");
  const updateBlock = buildingService.split("transaction.building.update")[1]?.split("transaction.building.create")[0] ?? "";

  assert.match(buildingPage, /readOnly=\{Boolean\(building\)\}/);
  assert.doesNotMatch(updateBlock, /code: data\.code/);
  assert.match(organizationService, /notIn: \["EMERGENCY_SERVICE", "E2E_ASSOCIATION"\]/);
  assert.match(adminLayout, /Einstellungen: Öffentlicher Kalender/);
  assert.match(adminLayout, /Einstellungen: System-Jobs/);
  assert.match(seed, /\["CLUB_TRAINING", "Training"/);
  assert.doesNotMatch(seed, /\["EMERGENCY_SERVICE", "Katastrophenschutz"\]/);
});

test("phase 26.5 series form exposes daily weekly monthly yearly patterns and preview", () => {
  const seriesForm = readFileSync("components/series-request-form.tsx", "utf8");
  const portalBookings = readFileSync("app/portal/bookings/page.tsx", "utf8");
  const actions = readFileSync("app/portal/bookings/actions.ts", "utf8");

  assert.match(portalBookings, /<SeriesRequestForm/);
  assert.match(seriesForm, /Täglich/);
  assert.match(seriesForm, /Wöchentlich/);
  assert.match(seriesForm, /Monatlich/);
  assert.match(seriesForm, /Jährlich/);
  assert.match(seriesForm, /Vorschau \(max\. 50 Einträge\)/);
  assert.match(actions, /formData\.getAll\("weekdays"\)/);
});
