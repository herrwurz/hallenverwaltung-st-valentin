import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("admin status filters use the shared combobox component", () => {
  const pages = [
    "app/admin/booking-changes/page.tsx",
    "app/admin/damages/page.tsx",
    "app/admin/no-shows/page.tsx",
    "app/admin/notifications/page.tsx",
    "app/admin/waitlist/page.tsx",
  ];

  for (const page of pages) {
    const source = readFileSync(page, "utf8");
    assert.match(source, /StatusFilterSelect/, `${page} should use StatusFilterSelect`);
  }
});

test("portal forms expose cancel actions and back navigation", () => {
  const portalDocuments = readFileSync("app/portal/documents/page.tsx", "utf8");
  const portalDamages = readFileSync("app/portal/damages/page.tsx", "utf8");
  const portalBookings = readFileSync("app/portal/bookings/page.tsx", "utf8");
  const portalWaitlist = readFileSync("app/portal/waitlist/page.tsx", "utf8");
  const formActions = readFileSync("components/form-actions.tsx", "utf8");

  assert.match(portalDocuments, /Zurück zum Portal/);
  assert.match(portalDamages, /Zurück zum Portal/);
  assert.match(portalBookings, /FormActions/);
  assert.match(portalWaitlist, /FormActions/);
  assert.match(portalDocuments, /FormActions/);
  assert.match(portalDamages, /FormActions/);
  assert.match(formActions, /type="submit"/);
});

test("portal forms hide organization selection when there is only one organization", () => {
  const organizationField = readFileSync("components/portal-organization-field.tsx", "utf8");
  const portalDocuments = readFileSync("app/portal/documents/page.tsx", "utf8");
  const portalBookings = readFileSync("app/portal/bookings/page.tsx", "utf8");
  const portalWaitlist = readFileSync("app/portal/waitlist/page.tsx", "utf8");
  const bookingRequestForm = readFileSync("components/booking-request-form.tsx", "utf8");
  const seriesRequestForm = readFileSync("components/series-request-form.tsx", "utf8");

  assert.match(organizationField, /organizations\.length === 1/);
  assert.match(organizationField, /type="hidden" name="organizationId"/);
  assert.match(organizationField, /select name="organizationId"/);
  assert.match(portalBookings, /BookingRequestForm/);
  assert.match(portalBookings, /SeriesRequestForm/);
  assert.match(bookingRequestForm, /PortalOrganizationField/);
  assert.match(seriesRequestForm, /PortalOrganizationField/);
  assert.match(portalWaitlist, /PortalOrganizationField/);
  assert.match(portalDocuments, /PortalOrganizationField/);
});

test("admin master data forms use shared form actions", () => {
  const modalManagers = [
    "components/building-manager.tsx",
    "components/room-manager.tsx",
    "components/organization-manager.tsx",
    "components/usage-type-manager.tsx",
    "components/user-manager.tsx",
    "components/role-manager.tsx",
    "components/tariff-manager.tsx",
  ];
  for (const manager of modalManagers) {
    const source = readFileSync(manager, "utf8");
    assert.match(source, /ModalFormActions/, `${manager} should use ModalFormActions`);
    assert.doesNotMatch(source, /lg:text-right[\s\S]*bg-sky-500/, `${manager} should not hand-roll primary form actions`);
  }
});

test("admin core management pages expose shared back navigation", () => {
  const pages = [
    "app/admin/buildings/page.tsx",
    "app/admin/rooms/page.tsx",
    "app/admin/organizations/page.tsx",
    "app/admin/users/page.tsx",
    "app/admin/roles/page.tsx",
  ];
  const backLink = readFileSync("components/admin-back-link.tsx", "utf8");

  assert.match(backLink, /Zurück zum Dashboard/);
  assert.match(backLink, /href = "\/admin"/);

  for (const page of pages) {
    const source = readFileSync(page, "utf8");
    assert.match(source, /AdminBackLink/, `${page} should use AdminBackLink`);
  }
});

test("damage forms use building filtered room selection", () => {
  const portalDamages = readFileSync("app/portal/damages/page.tsx", "utf8");

  assert.match(portalDamages, /BuildingRoomSelect/);
});

test("admin roles expose guarded role permission editing", () => {
  const rolePage = readFileSync("components/role-manager.tsx", "utf8");
  const roleActions = readFileSync("app/admin/roles/actions.ts", "utf8");
  const roleService = readFileSync("lib/services/admin/role-service.ts", "utf8");

  assert.match(rolePage, /updateRolePermissionsAction/);
  assert.match(rolePage, /name="permissionIds"/);
  assert.match(rolePage, /Rechte speichern/);
  assert.match(rolePage, /SUPER_ADMIN darf nur durch SUPER_ADMIN/);
  assert.match(roleActions, /requirePermission\("MANAGE_USERS"\)/);
  assert.match(roleService, /updateRolePermissions/);
  assert.match(roleService, /role\.code === "SUPER_ADMIN"/);
  assert.match(roleService, /SUPER_ADMIN muss alle Rechte behalten/);
  assert.match(roleService, /PERMISSIONS_UPDATED/);
});

test("single-day forms bind the end time to the start day", () => {
  const rangeFields = readFileSync("components/single-day-time-range-fields.tsx", "utf8");
  const bookingForm = readFileSync("components/booking-request-form.tsx", "utf8");
  const portalBookings = readFileSync("app/portal/bookings/page.tsx", "utf8");
  const portalWaitlist = readFileSync("app/portal/waitlist/page.tsx", "utf8");

  assert.match(rangeFields, /type="time"/);
  assert.match(rangeFields, /type="hidden" name=\{endName\}/);
  assert.match(rangeFields, /\$\{startDate\}T\$\{endTime\}/);
  assert.match(rangeFields, /Die Endzeit muss nach der Beginnzeit liegen\./);
  assert.match(rangeFields, /Serienantrag/);
  assert.match(bookingForm, /SingleDayTimeRangeFields/);
  assert.match(portalBookings, /startName="newStartAt"/);
  assert.match(portalWaitlist, /SingleDayTimeRangeFields/);
});

test("series request form supports all-day series with synced end date", () => {
  const seriesForm = readFileSync("components/series-request-form.tsx", "utf8");
  const portalBookings = readFileSync("app/portal/bookings/page.tsx", "utf8");

  assert.match(seriesForm, /Ganztägig/);
  assert.match(seriesForm, /name="firstStartsAt" value=\{allDayStartDate \? `\$\{allDayStartDate\}T00:00` : ""\}/);
  assert.match(seriesForm, /name="firstEndsAt" value=\{allDayEndDate \? `\$\{allDayEndDate\}T23:59` : ""\}/);
  assert.match(seriesForm, /Das erste Ende muss nach dem Beginn liegen\./);
  assert.match(seriesForm, /setFirstEndsAt\(\(current\) => `\$\{startDate\}T/);
  assert.match(portalBookings, /täglich, wöchentlich, monatlich oder jährlich/);
});

test("buildings and rooms admin pages use click-to-open modals instead of inline edit lists", () => {
  const buildingsPage = readFileSync("app/admin/buildings/page.tsx", "utf8");
  const roomsPage = readFileSync("app/admin/rooms/page.tsx", "utf8");
  const buildingManager = readFileSync("components/building-manager.tsx", "utf8");
  const roomManager = readFileSync("components/room-manager.tsx", "utf8");
  const dataTable = readFileSync("components/ui/data-table.tsx", "utf8");
  const tables = readFileSync("components/admin-master-data-tables.tsx", "utf8");

  assert.match(buildingsPage, /<BuildingManager/);
  assert.match(roomsPage, /<RoomManager/);
  assert.doesNotMatch(buildingsPage, /Gebäude bearbeiten/);
  assert.doesNotMatch(roomsPage, /Räume bearbeiten/);

  assert.match(dataTable, /onRowClick/);
  assert.match(tables, /rowHintColumn/);

  for (const manager of [buildingManager, roomManager]) {
    assert.match(manager, /"use client"/);
    assert.match(manager, /<Dialog open=\{open\} onOpenChange=\{setOpen\}>/);
    assert.match(manager, /onRowClick=\{\(row\) => openEdit\(row\.id\)\}/);
    assert.match(manager, /searchParams\.get\("saved"\)/);
    assert.match(manager, /<Tabs value=\{tab\}/);
    assert.match(manager, /value="closures"/);
  }
});

test("remaining Stammdaten admin pages use click-to-open modals", () => {
  const pages = [
    ["app/admin/organizations/page.tsx", "OrganizationManager"],
    ["app/admin/usage-types/page.tsx", "UsageTypeManager"],
    ["app/admin/users/page.tsx", "UserManager"],
    ["app/admin/roles/page.tsx", "RoleManager"],
    ["app/admin/tariffs/page.tsx", "TariffManager"],
  ] as const;

  for (const [page, componentName] of pages) {
    const source = readFileSync(page, "utf8");
    assert.match(source, new RegExp(`<${componentName}`), `${page} should render <${componentName}`);
  }

  const rowClickManagers = [
    "components/organization-manager.tsx",
    "components/usage-type-manager.tsx",
    "components/user-manager.tsx",
    "components/role-manager.tsx",
  ];
  for (const manager of rowClickManagers) {
    const source = readFileSync(manager, "utf8");
    assert.match(source, /"use client"/, `${manager} should be a client component`);
    assert.match(source, /<Dialog open=\{open\} onOpenChange=\{setOpen\}>/, `${manager} should use a controlled Dialog`);
    assert.match(source, /onRowClick=\{\(row\) => openEdit\(row\.id\)\}/, `${manager} should open the modal on row click`);
    assert.match(source, /searchParams\.get\("saved"\)/, `${manager} should auto-close on save`);
  }

  const tariffManager = readFileSync("components/tariff-manager.tsx", "utf8");
  assert.match(tariffManager, /"use client"/);
  assert.match(tariffManager, /onClick=\{\(\) => openEdit\(group\.id\)\}/);
  assert.match(tariffManager, /onClick=\{\(\) => openEdit\(tariff\.id\)\}/);
  assert.match(tariffManager, /ModalFormActions/);

  const usersPage = readFileSync("app/admin/users/page.tsx", "utf8");
  assert.match(usersPage, /Hallenwarte ohne Benutzerkonto/);
  const rolesPage = readFileSync("app/admin/roles/page.tsx", "utf8");
  assert.match(rolesPage, /PermissionsTable/);
});
