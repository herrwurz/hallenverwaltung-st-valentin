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

  assert.match(organizationField, /organizations\.length === 1/);
  assert.match(organizationField, /type="hidden" name="organizationId"/);
  assert.match(organizationField, /select name="organizationId"/);
  assert.match(portalBookings, /PortalOrganizationField/);
  assert.match(portalWaitlist, /PortalOrganizationField/);
  assert.match(portalDocuments, /PortalOrganizationField/);
});

test("admin master data forms use shared form actions", () => {
  const pages = [
    "app/admin/buildings/page.tsx",
    "app/admin/rooms/page.tsx",
    "app/admin/organizations/page.tsx",
    "app/admin/users/page.tsx",
  ];

  for (const page of pages) {
    const source = readFileSync(page, "utf8");
    assert.match(source, /FormActions/, `${page} should use FormActions`);
    assert.doesNotMatch(source, /lg:text-right[\s\S]*bg-sky-500/, `${page} should not hand-roll primary form actions`);
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
