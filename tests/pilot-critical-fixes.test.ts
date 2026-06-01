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
  assert.match(adminBookings, /Offen \(beantragt \+ in Pruefung\)/);
  assert.match(adminActions, /"reviewed",\s*"IN_REVIEW"/);
  assert.match(adminActions, /"approved",\s*"APPROVED"/);
  assert.match(adminActions, /"rejected",\s*"REJECTED"/);
});

test("active waitlist entries are labelled as requested for portal users", () => {
  assert.equal(getWaitlistStatusLabel("ACTIVE"), "Beantragt");
});
