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
  assert.match(adminLayout, /groupLabel: "Einstellungen"/);
  assert.doesNotMatch(adminLayout, /Einstellungen: /);
  assert.match(seed, /\["CLUB_TRAINING", "Training"/);
  assert.doesNotMatch(seed, /\["EMERGENCY_SERVICE", "Katastrophenschutz"\]/);
});


test("phase 26.8 and 27.3 organization blocking preserves reasons and respects multi memberships", () => {
  const organizationService = readFileSync("lib/services/admin/organization-service.ts", "utf8");
  const userService = readFileSync("lib/services/admin/user-service.ts", "utf8");
  const loginAction = readFileSync("app/login/actions.ts", "utf8");
  const organizationPage = readFileSync("app/admin/organizations/page.tsx", "utf8");
  const usersPage = readFileSync("app/admin/users/page.tsx", "utf8");
  const adminActions = readFileSync("app/admin/actions.ts", "utf8");

  assert.match(organizationService, /data\.status !== "ACTIVE"/);
  assert.match(organizationService, /blockedReason/);
  assert.match(organizationService, /usersWithRemainingActiveOrganizations/);
  assert.match(organizationService, /userIdsToDeactivate/);
  assert.match(organizationService, /user\.updateMany/);
  assert.match(organizationService, /isActive: false/);
  assert.match(organizationService, /organizationMember\.updateMany/);
  assert.match(userService, /where: \{ status: "ACTIVE" \}/);
  assert.match(userService, /Benutzer dürfen nur aktiven Organisationen zugeordnet werden/);
  assert.match(adminActions, /Benutzer dürfen nur aktiven Organisationen zugeordnet werden/);
  assert.match(loginAction, /compare\(password, user\.passwordHash\)/);
  assert.match(loginAction, /Der Login ist gesperrt/);
  assert.match(organizationPage, /Stilllegungsgrund/);
  assert.match(usersPage, /gesperrt/);
  assert.match(usersPage, /Mindestens eine aktive Mitgliedschaft/);
});

test("phase 27 building contact fields are persisted and visible in admin", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const migration = readFileSync("prisma/migrations/20260609180000_phase27_building_contact_fields/migration.sql", "utf8");
  const buildingService = readFileSync("lib/services/admin/building-service.ts", "utf8");
  const adminActions = readFileSync("app/admin/actions.ts", "utf8");
  const buildingPage = readFileSync("app/admin/buildings/page.tsx", "utf8");
  const tables = readFileSync("components/admin-master-data-tables.tsx", "utf8");

  assert.match(schema, /postalCode\s+String\?/);
  assert.match(schema, /city\s+String\?/);
  assert.match(schema, /email\s+String\?/);
  assert.match(schema, /phone\s+String\?/);
  assert.match(migration, /ADD COLUMN "postalCode"/);
  assert.match(buildingService, /postalCode/);
  assert.match(buildingService, /email[\s\S]*E-Mail/);
  assert.match(adminActions, /optionalValue\(formData, "postalCode"\)/);
  assert.match(buildingPage, /name="postalCode"/);
  assert.match(buildingPage, /name="phone"/);
  assert.match(tables, /header: "Kontakt"/);
});

test("phase 27 building and room closures use the central closure model", () => {
  const closureService = readFileSync("lib/services/admin/closure-admin-service.ts", "utf8");
  const closurePanel = readFileSync("components/admin-closure-panel.tsx", "utf8");
  const actions = readFileSync("app/admin/actions.ts", "utf8");
  const buildingPage = readFileSync("app/admin/buildings/page.tsx", "utf8");
  const roomPage = readFileSync("app/admin/rooms/page.tsx", "utf8");
  const buildingService = readFileSync("lib/services/admin/building-service.ts", "utf8");
  const roomService = readFileSync("lib/services/admin/room-service.ts", "utf8");

  assert.match(closureService, /validateClosureTarget/);
  assert.match(closureService, /hasPermission\(actorUserId, "BLOCK_ROOM"\)/);
  assert.match(closureService, /prisma\.closure\.create/);
  assert.match(actions, /createBuildingClosureAction/);
  assert.match(actions, /createRoomClosureAction/);
  assert.match(actions, /requirePermission\("BLOCK_ROOM"\)/);
  assert.match(buildingPage, /<AdminClosurePanel/);
  assert.match(roomPage, /<AdminClosurePanel/);
  assert.match(buildingService, /closures:\s*\{/);
  assert.match(roomService, /closures:\s*\{/);
  assert.match(closurePanel, /Sperre speichern/);
});

test("phase 27.1 series approval actions use the central booking workflow", () => {
  const approvalService = readFileSync("lib/services/booking-approval-service.ts", "utf8");
  const actions = readFileSync("app/admin/bookings/actions.ts", "utf8");
  const page = readFileSync("app/admin/bookings/page.tsx", "utf8");

  assert.match(approvalService, /markSeriesInReviewForAdmin/);
  assert.match(approvalService, /approveSeriesForAdmin/);
  assert.match(approvalService, /rejectSeriesForAdmin/);
  assert.match(approvalService, /markBookingInReviewForAdmin\(bookingId/);
  assert.match(approvalService, /approveBookingForAdmin\(\{ bookingId, decisionNote \}/);
  assert.match(approvalService, /rejectBookingForAdmin\(\{ bookingId, decisionNote \}/);
  assert.match(actions, /markSeriesInReviewAction/);
  assert.match(actions, /approveSeriesAction/);
  assert.match(actions, /rejectSeriesAction/);
  assert.match(page, /Ganze Serie bearbeiten/);
  assert.match(page, /name="seriesId"/);
  assert.match(page, /Serie genehmigen/);
  assert.match(page, /Serie ablehnen/);
});

test("phase 27.2 holidays support Austria and federal-state scopes", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const migration = readFileSync("prisma/migrations/20260609193000_phase27_2_holiday_regions/migration.sql", "utf8");
  const service = readFileSync("lib/services/holiday-service.ts", "utf8");
  const actions = readFileSync("app/admin/holidays/actions.ts", "utf8");
  const page = readFileSync("app/admin/holidays/page.tsx", "utf8");

  assert.match(schema, /countryCode\s+String\s+@default\("AT"\)/);
  assert.match(schema, /regionCode\s+String\?/);
  assert.match(schema, /@@index\(\[countryCode, regionCode, startsOn, endsOn\]\)/);
  assert.match(migration, /ADD COLUMN "countryCode"/);
  assert.match(service, /holidayCountryOptions/);
  assert.match(service, /Österreich/);
  assert.match(service, /AT-NO/);
  assert.match(service, /Wien/);
  assert.match(service, /getHolidayScopeLabel/);
  assert.match(actions, /countryCode: formData\.get\("countryCode"\)/);
  assert.match(actions, /regionCode: formData\.get\("regionCode"\)/);
  assert.match(page, /name="countryCode"/);
  assert.match(page, /name="regionCode"/);
  assert.match(page, /Bundesweit/);
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
