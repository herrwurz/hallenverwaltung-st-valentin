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

test("phase 34 admin booking filters include all organizations buildings and rooms", () => {
  const adminBookings = readFileSync("app/admin/bookings/page.tsx", "utf8");
  const adminActions = readFileSync("app/admin/bookings/actions.ts", "utf8");
  const approvalService = readFileSync("lib/services/booking-approval-service.ts", "utf8");

  assert.match(adminBookings, /getAdminBookingFilterOptions/);
  assert.match(adminBookings, /Gebäude filtern/);
  assert.match(adminBookings, /Raum filtern/);
  assert.match(adminBookings, /Alle Gebäude/);
  assert.match(adminBookings, /Alle Räume/);
  assert.match(adminBookings, /room\.buildingId === selectedBuildingId/);
  assert.match(adminActions, /buildingId: optionalFormString/);
  assert.match(adminActions, /roomId: optionalFormString/);
  assert.match(adminActions, /query\.set\("buildingId"/);
  assert.match(adminActions, /query\.set\("roomId"/);
  assert.match(approvalService, /getAdminBookingFilterOptions/);
  assert.match(approvalService, /prisma\.organization\.findMany/);
  assert.match(approvalService, /roomId: filters\.roomId/);
  assert.match(approvalService, /buildingId: filters\.buildingId/);
});

test("phase 34 approval can explicitly override closure conflicts with a required comment", () => {
  const adminBookings = readFileSync("app/admin/bookings/page.tsx", "utf8");
  const adminActions = readFileSync("app/admin/bookings/actions.ts", "utf8");
  const approvalService = readFileSync("lib/services/booking-approval-service.ts", "utf8");
  const transitionService = readFileSync("lib/services/booking-transition-service.ts", "utf8");

  assert.match(adminBookings, /allowClosureOverride/);
  assert.match(adminBookings, /Sperre bewusst als Ausnahme genehmigen/);
  assert.match(adminBookings, /Kommentar ist erforderlich/);
  assert.match(adminActions, /allowClosureOverride: z\.boolean\(\)\.default\(false\)/);
  assert.match(adminActions, /formData\.get\("allowClosureOverride"\) === "on"/);
  assert.match(approvalService, /allowClosureOverride/);
  assert.match(transitionService, /nonClosureBlockingConflicts/);
  assert.match(transitionService, /Bei Genehmigung trotz Sperre ist ein Kommentar erforderlich/);
});

test("phase 34 demo seed restores demo account access predictably", () => {
  const demoSeed = readFileSync("scripts/seed-demo.ts", "utf8");

  assert.match(demoSeed, /userPermission\.deleteMany/);
  assert.match(demoSeed, /userId: user\.id/);
  assert.match(demoSeed, /isActive: true/);
  assert.match(demoSeed, /organizationMember\.updateMany/);
  assert.match(demoSeed, /organizationId: \{ not: organization\.id \}/);
  assert.match(demoSeed, /activeUntil: new Date\(\)/);
});

test("phase 34 low priority smtp placeholder and pilot dashboard are handled", () => {
  const mailService = readFileSync("lib/services/mail-service.ts", "utf8");
  const mailSettingsPage = readFileSync("app/admin/settings/mail/page.tsx", "utf8");
  const adminDashboard = readFileSync("app/admin/page.tsx", "utf8");

  assert.match(mailService, /getSmtpConfigurationStatus/);
  assert.match(mailService, /smtp\.example\.test/);
  assert.match(mailService, /Platzhalterwerten/);
  assert.match(mailSettingsPage, /SMTP ist noch nicht vollständig produktiv konfiguriert/);
  assert.match(mailSettingsPage, /Testmails werden service-seitig bewusst blockiert/);
  assert.match(adminDashboard, /Stammdaten/);
  assert.match(adminDashboard, /Buchungen/);
  assert.match(adminDashboard, /Kalender/);
  assert.match(adminDashboard, /Berichte/);
  assert.match(adminDashboard, /\/admin\/reports/);
  assert.match(adminDashboard, /Statistik-Karten/);
  assert.doesNotMatch(adminDashboard, /Mailfehler|Benachrichtigungs-Queue|Systemeinstellungen|Extras/);
});

test("phase 26 pilot UI hotfixes hide technical labels in key pages", () => {
  const dashboard = readFileSync("app/admin/page.tsx", "utf8");
  const series = readFileSync("app/admin/series/page.tsx", "utf8");
  const notifications = readFileSync("app/admin/notifications/page.tsx", "utf8");
  const publicPage = readFileSync("app/public/page.tsx", "utf8");

  assert.match(dashboard, /min-h-44 flex-col/);
  assert.match(dashboard, /Stammdaten/);
  assert.match(dashboard, /Buchungen/);
  assert.match(dashboard, /Kalender/);
  assert.doesNotMatch(dashboard, /card\.value/);
  assert.match(series, /formatRecurrenceRule/);
  assert.doesNotMatch(series, /recurrenceRule\}\)/);
  assert.doesNotMatch(notifications, />\{eventCode\}</);
  assert.match(publicPage, /redirect\("\/login"\)/);
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
  assert.match(adminLayout, /groupLabel: "Stammdaten"/);
  assert.match(adminLayout, /groupLabel: "Buchungen"/);
  assert.match(adminLayout, /groupLabel: "Extras"/);
  assert.doesNotMatch(adminLayout, /Einstellungen: /);
  assert.match(seed, /\["CLUB_TRAINING", "Training"/);
  assert.doesNotMatch(seed, /\["EMERGENCY_SERVICE", "Katastrophenschutz"\]/);
});

test("phase 34 medium fixes settings navigation membership count caretakers and waitlist", () => {
  const dashboard = readFileSync("app/admin/page.tsx", "utf8");
  const adminNavigation = readFileSync("components/admin-navigation.tsx", "utf8");
  const adminLayout = readFileSync("app/admin/layout.tsx", "utf8");
  const organizationService = readFileSync("lib/services/admin/organization-service.ts", "utf8");
  const userService = readFileSync("lib/services/admin/user-service.ts", "utf8");
  const waitlistStatus = readFileSync("lib/waitlist-status.ts", "utf8");
  const adminWaitlist = readFileSync("app/admin/waitlist/page.tsx", "utf8");

  assert.doesNotMatch(dashboard, /label: "Einstellungen"/);
  assert.match(adminNavigation, /<details/);
  assert.match(adminNavigation, /<summary/);
  assert.match(adminLayout, /href: "\/admin\/waitlist", label: "Warteliste", groupLabel: "Buchungen"/);
  assert.match(adminLayout, /href: "\/admin\/roles", label: "Rollen\/Rechte", groupLabel: "Stammdaten"/);
  assert.match(adminLayout, /href: "\/admin\/holidays", label: "Ferien", groupLabel: "Einstellungen"/);
  assert.match(adminLayout, /href: "\/admin\/settings", label: "Systemeinstellungen", groupLabel: "Einstellungen"/);
  assert.match(adminLayout, /href: "\/admin\/settings\/mail", label: "Mail \/ SMTP", groupLabel: "Einstellungen"/);
  assert.match(adminLayout, /href: "\/admin\/settings\/notifications", label: "Benachrichtigungsregeln", groupLabel: "Einstellungen"/);
  assert.match(adminLayout, /href: "\/admin\/access", label: "Zutritte", groupLabel: "Extras"/);
  assert.match(organizationService, /activeFrom: \{ lte: now \}/);
  assert.match(organizationService, /activeUntil: \{ gt: now \}/);
  assert.match(userService, /role\.code === "CARETAKER"/);
  assert.match(userService, /transaction\.caretaker\.upsert/);
  assert.match(waitlistStatus, /bg-amber-500\/10 text-amber-700/);
  assert.match(adminWaitlist, /Weiterbehandlung/);
  assert.match(adminWaitlist, /neuer\s+Buchungsantrag im Status Beantragt/);
});

test("phase 34 calendar filters and labels are clarified", () => {
  const filterForm = readFileSync("components/calendar-filter-form.tsx", "utf8");
  const calendarView = readFileSync("components/calendar-view.tsx", "utf8");
  const calendarService = readFileSync("lib/services/calendar-service.ts", "utf8");
  const adminCalendar = readFileSync("app/admin/calendar/page.tsx", "utf8");

  assert.match(filterForm, /name="organizationId"/);
  assert.match(filterForm, /type="hidden" name="view" defaultValue=\{view\}/);
  assert.match(filterForm, /Kalendernavigation/);
  assert.match(filterForm, /prepareSubmit\(\{ date: today, view \}\)/);
  assert.doesNotMatch(filterForm, /<option value="year">Jahr<\/option>/);
  assert.match(calendarView, /organizations=\{calendar\.organizations\}/);
  assert.match(calendarView, /Freie Zeitfenster für Buchungsanträge/);
  assert.match(calendarView, /Terminliste/);
  assert.match(calendarService, /organizationId\?: string/);
  assert.match(calendarService, /organizationId: organizationId \|\| undefined/);
  assert.match(adminCalendar, /organizationId: organizationId \|\| undefined/);
});

test("phase 34 holidays stay informational and create closures only explicitly", () => {
  const holidayService = readFileSync("lib/services/holiday-service.ts", "utf8");
  const holidayActions = readFileSync("app/admin/holidays/actions.ts", "utf8");
  const holidayPage = readFileSync("app/admin/holidays/page.tsx", "utf8");

  assert.match(holidayService, /default\("OPEN"\)/);
  assert.match(holidayService, /createClosureFromHolidayPeriod/);
  assert.match(holidayService, /createClosure\(/);
  assert.match(holidayActions, /createHolidayClosureAction/);
  assert.match(holidayPage, /Ferien- und Feiertagszeiträume sind Hinweisdaten/);
  assert.match(holidayPage, /defaultValue="OPEN"/);
  assert.match(holidayPage, /Aus Ferienzeitraum Hallensperre anlegen/);
  assert.match(holidayPage, /HolidayClosureTargetPicker/);
});

test("phase 36 separates system settings from notification queue and keeps SMTP secrets out of the database", () => {
  const settingsPage = readFileSync("app/admin/settings/page.tsx", "utf8");
  const mailPage = readFileSync("app/admin/settings/mail/page.tsx", "utf8");
  const mailActions = readFileSync("app/admin/settings/mail/actions.ts", "utf8");
  const notificationSettingsPage = readFileSync("app/admin/settings/notifications/page.tsx", "utf8");
  const notificationQueuePage = readFileSync("app/admin/notifications/page.tsx", "utf8");
  const navigation = readFileSync("components/admin-navigation.tsx", "utf8");
  const mailService = readFileSync("lib/services/mail-service.ts", "utf8");

  assert.match(settingsPage, /Systemeinstellungen/);
  assert.match(settingsPage, /technische Secrets/i);
  assert.match(settingsPage, /nicht über die\s+Weboberfläche geändert/);
  assert.match(mailPage, /Mail \/ SMTP/);
  assert.match(mailPage, /SMTP-Passwort/);
  assert.match(mailPage, /gesetzt, verborgen/);
  assert.match(mailActions, /sendSettingsTestMailAction/);
  assert.match(mailActions, /requirePermission\("MANAGE_USERS"\)/);
  assert.match(notificationSettingsPage, /Benachrichtigungsregeln/);
  assert.match(notificationSettingsPage, /updateSettingsNotificationEventsAction/);
  assert.match(notificationQueuePage, /Benachrichtigungs-Queue/);
  assert.doesNotMatch(notificationQueuePage, /Event-Schalter|Testmail senden/);
  assert.match(navigation, /Mail \/ SMTP/);
  assert.match(navigation, /Benachrichtigungsregeln/);
  assert.match(mailService, /passwordConfigured/);
  assert.doesNotMatch(mailPage, /SMTP_PASSWORD|process\.env\.SMTP_PASSWORD/);
});

test("phase 37 stabilizes the local pilot test start and documents current settings routes", () => {
  const batch = readFileSync("start-test-deployment.bat", "utf8");
  const localServer = readFileSync("scripts/start-local-testserver.cmd", "utf8");
  const pilotPlan = readFileSync("docs/pilot-testplan.md", "utf8");
  const freeze = readFileSync("docs/teststand-freeze.md", "utf8");
  const productionReadiness = readFileSync("docs/production-readiness.md", "utf8");

  assert.match(batch, /http:\/\/localhost:3000\/login/);
  assert.match(batch, /attrib -U \+P "\.next"/);
  assert.match(batch, /scripts\\start-local-testserver\.cmd/);
  assert.doesNotMatch(batch, /standalone\\server\.js/);
  assert.match(localServer, /npm\.cmd run start/);
  assert.doesNotMatch(localServer, /standalone\\server\.js/);
  assert.match(pilotPlan, /\/admin\/settings\/mail/);
  assert.match(pilotPlan, /\/admin\/settings\/notifications/);
  assert.match(pilotPlan, /\/admin\/notifications/);
  assert.match(freeze, /SMTP-Status und Testmail liegen unter `\/admin\/settings\/mail`/);
  assert.match(productionReadiness, /\/admin\/settings\/mail/);
  assert.match(productionReadiness, /\/admin\/settings\/notifications/);
});

test("phase 38 keeps pilot-facing labels localized and free of visible mojibake", () => {
  const files = [
    "app/public/page.tsx",
    "app/admin/page.tsx",
    "app/admin/bookings/page.tsx",
    "app/admin/notifications/page.tsx",
    "app/admin/settings/calendar/page.tsx",
    "app/admin/settings/notifications/page.tsx",
    "app/admin/system/jobs/page.tsx",
    "app/admin/holidays/page.tsx",
    "app/admin/rooms/page.tsx",
    "components/admin-navigation.tsx",
  ];

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    assert.doesNotMatch(content, /Notification Queue|Gebaeude filtern|Alle Gebaeude|Alle Raeume|Oeffentlicher Bereich|oeffentliche|oeffentlicher|Ãƒ|Ã¼|Ã¤|Ã¶|Ã–/i, file);
  }

  const navigation = readFileSync("components/admin-navigation.tsx", "utf8");
  const queuePage = readFileSync("app/admin/notifications/page.tsx", "utf8");
  const publicPage = readFileSync("app/public/page.tsx", "utf8");

  assert.match(navigation, /Benachrichtigungs-Queue/);
  assert.match(queuePage, /Benachrichtigungs-Queue/);
  assert.match(publicPage, /redirect\("\/login"\)/);
});

test("pilot branding dashboard and room defaults match municipality feedback", () => {
  const adminShell = readFileSync("components/admin-shell.tsx", "utf8");
  const adminDashboard = readFileSync("app/admin/page.tsx", "utf8");
  const roomPage = readFileSync("app/admin/rooms/page.tsx", "utf8");
  const openingFields = readFileSync("components/room-opening-hours-fields.tsx", "utf8");
  const seed = readFileSync("prisma/seed.ts", "utf8");
  const calendarFilter = readFileSync("components/calendar-filter-form.tsx", "utf8");
  const fullCalendarBoard = readFileSync("components/full-calendar-board.tsx", "utf8");

  assert.match(adminShell, /\/brand\/logo-gde-transparent-500\.gif/);
  assert.match(adminShell, /Sankt Valentin meine Stadt/);
  assert.match(adminShell, /Hallenverwaltung/);
  assert.doesNotMatch(adminShell, /Building2/);
  assert.match(adminDashboard, /Stammdaten/);
  assert.match(adminDashboard, /Buchungen/);
  assert.match(adminDashboard, /Kalender/);
  assert.match(adminDashboard, /Berichte/);
  assert.match(adminDashboard, /\/admin\/reports/);
  assert.doesNotMatch(adminDashboard, /Mail \/ SMTP|Benachrichtigungs-Queue|Systemeinstellungen|Extras/);
  assert.match(roomPage, /<RoomOpeningHoursFields/);
  assert.match(openingFields, /Ganztags geöffnet/);
  assert.match(openingFields, /setOpening\("00:00"\)/);
  assert.match(openingFields, /setClosing\("23:59"\)/);
  assert.match(seed, /openingTime: "00:00"/);
  assert.match(seed, /closingTime: "23:59"/);
  assert.match(seed, /setupBufferMinutes: 0/);
  assert.match(seed, /teardownBufferMinutes: 0/);
  assert.match(calendarFilter, /Kalendernavigation/);
  assert.match(calendarFilter, /Zurück/);
  assert.match(calendarFilter, /Heute/);
  assert.match(calendarFilter, /Weiter/);
  assert.match(fullCalendarBoard, /left: ""/);
  assert.match(fullCalendarBoard, /right: ""/);
  assert.doesNotMatch(fullCalendarBoard, /prev,next today/);
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
  assert.match(actions, /isAllDay: formData\.get\("isAllDay"\) === "on"/);
  assert.match(buildingPage, /<AdminClosurePanel/);
  assert.match(roomPage, /<AdminClosurePanel/);
  assert.match(buildingService, /closures:\s*\{/);
  assert.match(roomService, /closures:\s*\{/);
  assert.match(closurePanel, /Sperre speichern/);
  assert.match(closurePanel, /name="isAllDay"/);
  assert.match(closurePanel, /name="startsOn"/);
});

test("phase 34 closure visibility shows inherited building and room closures", () => {
  const closurePanel = readFileSync("components/admin-closure-panel.tsx", "utf8");
  const buildingPage = readFileSync("app/admin/buildings/page.tsx", "utf8");
  const roomPage = readFileSync("app/admin/rooms/page.tsx", "utf8");
  const buildingService = readFileSync("lib/services/admin/building-service.ts", "utf8");
  const roomService = readFileSync("lib/services/admin/room-service.ts", "utf8");

  assert.match(closurePanel, /relatedClosures/);
  assert.match(closurePanel, /Weitere wirksame Sperren/);
  assert.match(buildingService, /rooms:\s*\{/);
  assert.match(buildingService, /closures:\s*\{/);
  assert.match(roomService, /building:\s*\{/);
  assert.match(roomService, /closures:\s*\{/);
  assert.match(buildingPage, /sourceLabel: `Raum:/);
  assert.match(roomPage, /sourceLabel: `Gebäude:/);
});

test("phase 34 closures can be edited and deleted through protected server actions", () => {
  const closureService = readFileSync("lib/services/admin/closure-admin-service.ts", "utf8");
  const actions = readFileSync("app/admin/actions.ts", "utf8");
  const closurePanel = readFileSync("components/admin-closure-panel.tsx", "utf8");
  const buildingPage = readFileSync("app/admin/buildings/page.tsx", "utf8");
  const roomPage = readFileSync("app/admin/rooms/page.tsx", "utf8");

  assert.match(closureService, /export async function updateClosure/);
  assert.match(closureService, /export async function deleteClosure/);
  assert.match(closureService, /hasPermission\(actorUserId, "BLOCK_ROOM"\)/);
  assert.match(actions, /updateBuildingClosureAction/);
  assert.match(actions, /deleteBuildingClosureAction/);
  assert.match(actions, /updateRoomClosureAction/);
  assert.match(actions, /deleteRoomClosureAction/);
  assert.match(closurePanel, /updateAction/);
  assert.match(closurePanel, /deleteAction/);
  assert.match(closurePanel, /Sperre löschen/);
  assert.match(buildingPage, /updateAction=\{updateBuildingClosureAction\}/);
  assert.match(roomPage, /updateAction=\{updateRoomClosureAction\}/);
});

test("phase 27.1 series approval actions use the central booking workflow", () => {
  const approvalService = readFileSync("lib/services/booking-approval-service.ts", "utf8");
  const actions = readFileSync("app/admin/bookings/actions.ts", "utf8");
  const page = readFileSync("app/admin/bookings/page.tsx", "utf8");

  assert.match(approvalService, /markSeriesInReviewForAdmin/);
  assert.match(approvalService, /approveSeriesForAdmin/);
  assert.match(approvalService, /rejectSeriesForAdmin/);
  assert.match(approvalService, /markBookingInReviewForAdmin\(bookingId/);
  assert.match(approvalService, /approveBookingForAdmin\(\s*\{\s*bookingId,\s*decisionNote,\s*allowClosureOverride\s*\}/);
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

test("phase 30 holiday presets and semester shortcuts are exposed", () => {
  const holidayService = readFileSync("lib/services/holiday-service.ts", "utf8");
  const holidayActions = readFileSync("app/admin/holidays/actions.ts", "utf8");
  const holidayPage = readFileSync("app/admin/holidays/page.tsx", "utf8");
  const seriesForm = readFileSync("components/series-request-form.tsx", "utf8");

  assert.match(holidayService, /holidayPresetOptions/);
  assert.match(holidayService, /AT_NO_SCHOOL_HOLIDAYS/);
  assert.match(holidayService, /Semesterferien Niederösterreich/);
  assert.match(holidayActions, /importHolidayPresetAction/);
  assert.match(holidayPage, /Vorlagen übernehmen/);
  assert.match(holidayPage, /name="presetKey"/);
  assert.match(seriesForm, /Semester\/Saison/);
  assert.match(seriesForm, /SCHOOL_SEMESTER/);
  assert.match(seriesForm, /Schuljahr \/ Saison bis 30\. Juni/);
});
