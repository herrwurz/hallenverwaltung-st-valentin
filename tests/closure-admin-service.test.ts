import assert from "node:assert/strict";
import test from "node:test";
import { resolveClosureRange } from "../lib/services/admin/closure-admin-service";

test("all-day closure range ends exclusively at the next local day", () => {
  const { startsAt, endsAt } = resolveClosureRange({
    buildingId: "building-1",
    status: "CLOSED",
    reason: "Ferien",
    startsOn: new Date(2026, 6, 6),
    isAllDay: true,
    isPublic: true,
  });

  assert.equal(startsAt.getFullYear(), 2026);
  assert.equal(startsAt.getMonth(), 6);
  assert.equal(startsAt.getDate(), 6);
  assert.equal(startsAt.getHours(), 0);
  assert.equal(startsAt.getMinutes(), 0);

  assert.equal(endsAt.getFullYear(), 2026);
  assert.equal(endsAt.getMonth(), 6);
  assert.equal(endsAt.getDate(), 7);
  assert.equal(endsAt.getHours(), 0);
  assert.equal(endsAt.getMinutes(), 0);
});

test("all-day closure range can span multiple selected dates", () => {
  const { startsAt, endsAt } = resolveClosureRange({
    roomId: "room-1",
    status: "CLOSED",
    reason: "Reinigung",
    startsOn: new Date(2026, 6, 6),
    endsOn: new Date(2026, 6, 8),
    isAllDay: true,
    isPublic: true,
  });

  assert.equal(startsAt.getDate(), 6);
  assert.equal(endsAt.getDate(), 9);
});

test("non-all-day closure range requires start and end timestamps", () => {
  assert.throws(
    () =>
      resolveClosureRange({
        buildingId: "building-1",
        status: "CLOSED",
        reason: "Ferien",
        isAllDay: false,
        isPublic: true,
      }),
    /Beginn- und Enddatum/,
  );
});
