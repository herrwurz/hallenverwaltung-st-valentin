import assert from "node:assert/strict";
import test from "node:test";
import { evaluateBookingConflicts } from "../lib/services/booking-conflicts";
import {
  assertOrganizationBookingAccess,
  BookingValidationError,
} from "../lib/services/booking-rules";
import { persistBookingRequest, type BookingRequestWriteData } from "../lib/services/booking-write";

const start = new Date("2026-06-01T18:00:00Z");
const end = new Date("2026-06-01T20:00:00Z");

function conflicts({
  bookings = [],
  closures = [],
  links = [],
}: Partial<Parameters<typeof evaluateBookingConflicts>[0]> = {}) {
  return evaluateBookingConflicts({
    roomId: "room-child",
    buildingId: "building-1",
    blockedFrom: start,
    blockedUntil: end,
    links,
    bookings,
    closures,
  });
}

test("marks an overlapping approved booking as blocking and a request as soft conflict", () => {
  const result = conflicts({
    bookings: [
      {
        id: "booking-approved",
        roomId: "room-child",
        title: "Training",
        status: "APPROVED",
        blockedFrom: new Date("2026-06-01T17:30:00Z"),
        blockedUntil: new Date("2026-06-01T18:30:00Z"),
      },
      {
        id: "booking-requested",
        roomId: "room-child",
        title: "Kurs",
        status: "REQUESTED",
        blockedFrom: new Date("2026-06-01T19:00:00Z"),
        blockedUntil: new Date("2026-06-01T21:00:00Z"),
      },
    ],
  });

  assert.deepEqual(
    result.map(({ type, severity }) => ({ type, severity })),
    [
      { type: "APPROVED_BOOKING", severity: "blocking" },
      { type: "REQUESTED_BOOKING", severity: "soft" },
    ],
  );
});

test("allows a booking without time overlap", () => {
  const result = conflicts({
    bookings: [
      {
        id: "booking-earlier",
        roomId: "room-child",
        title: "Vormittag",
        status: "APPROVED",
        blockedFrom: new Date("2026-06-01T15:00:00Z"),
        blockedUntil: start,
      },
    ],
  });

  assert.deepEqual(result, []);
});

test("detects a conflict between a parent room and its component room", () => {
  const result = conflicts({
    links: [{ parentRoomId: "room-parent", childRoomId: "room-child" }],
    bookings: [
      {
        id: "booking-parent",
        roomId: "room-parent",
        title: "Gesamthalle",
        status: "APPROVED",
        blockedFrom: start,
        blockedUntil: end,
      },
    ],
  });

  assert.equal(result[0]?.type, "APPROVED_BOOKING");
});

test("detects a closure affecting the selected building", () => {
  const result = conflicts({
    closures: [
      {
        id: "closure-1",
        buildingId: "building-1",
        roomId: null,
        reason: "Reinigung",
        status: "CLOSED",
        startsAt: new Date("2026-06-01T17:00:00Z"),
        endsAt: new Date("2026-06-01T21:00:00Z"),
      },
    ],
  });

  assert.deepEqual(result.map(({ type, severity }) => ({ type, severity })), [
    { type: "CLOSURE", severity: "blocking" },
  ]);
});

test("rejects a request without an active organization membership for non-admin users", () => {
  assert.throws(
    () => assertOrganizationBookingAccess({ isAdmin: false, hasActiveMembership: false }),
    BookingValidationError,
  );
  assert.doesNotThrow(() => assertOrganizationBookingAccess({ isAdmin: true, hasActiveMembership: false }));
});

test("persists a requested booking together with its initial status history", async () => {
  const writes: Array<{ kind: string; data: unknown }> = [];
  const data: BookingRequestWriteData = {
    organizationId: "organization-1",
    roomId: "room-child",
    usageTypeId: "usage-1",
    requestedByUserId: "user-1",
    kind: "SINGLE",
    status: "REQUESTED",
    title: "Training",
    description: null,
    startsAt: start,
    endsAt: end,
    blockedFrom: start,
    blockedUntil: end,
  };

  await persistBookingRequest(
    {
      booking: {
        async create(args) {
          writes.push({ kind: "booking", data: args.data });
          return { id: "booking-1" };
        },
      },
      bookingStatusHistory: {
        async create(args) {
          writes.push({ kind: "history", data: args.data });
          return args.data;
        },
      },
    },
    data,
  );

  assert.equal(writes.length, 2);
  assert.deepEqual(writes[1], {
    kind: "history",
    data: {
      bookingId: "booking-1",
      actorUserId: "user-1",
      oldStatus: "REQUESTED",
      newStatus: "REQUESTED",
      reason: "Buchungsantrag erstellt.",
      newStartAt: start,
      newEndAt: end,
    },
  });
});
