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

  assert.match(portalDocuments, /Zurück zum Portal/);
  assert.match(portalDamages, /Zurück zum Portal/);
  assert.match(portalBookings, /FormActions/);
  assert.match(portalWaitlist, /FormActions/);
  assert.match(portalDocuments, /FormActions/);
  assert.match(portalDamages, /FormActions/);
});

test("damage forms use building filtered room selection", () => {
  const portalDamages = readFileSync("app/portal/damages/page.tsx", "utf8");

  assert.match(portalDamages, /BuildingRoomSelect/);
});
