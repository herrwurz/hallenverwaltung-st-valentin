import assert from "node:assert/strict";
import test from "node:test";
import { evaluateBookingConflicts } from "../lib/services/booking-conflicts";
import {
  assertBookingRequestPermission,
  assertOrganizationBookingAccess,
  BookingValidationError,
  validateBookingAvailability,
} from "../lib/services/booking-rules";
import { cancelBooking, requestBooking } from "../lib/services/booking-transition-service";

const start = new Date("2026-06-01T18:00:00Z");
const end = new Date("2026-06-01T20:00:00Z");
const requestNow = new Date("2026-05-01T10:00:00Z");

function localDate(year: number, month: number, day: number, hours: number, minutes: number) {
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function makeTransitionBooking(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "booking-1",
    organizationId: "organization-1",
    roomId: "room-child",
    requestedByUserId: "user-1",
    processedByUserId: null,
    status: "REQUESTED" as const,
    title: "Training",
    description: null,
    startsAt: start,
    endsAt: end,
    blockedFrom: start,
    blockedUntil: end,
    requestedAt: start,
    processedAt: null,
    ...overrides,
  };
}

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

test("requires REQUEST_BOOKING before a request may be created", () => {
  assert.throws(() => assertBookingRequestPermission(false), BookingValidationError);
  assert.doesNotThrow(() => assertBookingRequestPermission(true));
});

test("rejects a request outside the opening hours", () => {
  assert.throws(
    () =>
      validateBookingAvailability({
        startsAt: localDate(2026, 6, 1, 5, 45),
        endsAt: localDate(2026, 6, 1, 7, 0),
        blockedFrom: localDate(2026, 6, 1, 5, 45),
        blockedUntil: localDate(2026, 6, 1, 7, 0),
        openingTime: "06:00",
        closingTime: "23:00",
        maximumBookingMinutes: null,
        singleBookingLeadDays: 180,
        now: requestNow,
      }),
    /Oeffnungszeit/,
  );
});

test("rejects a request after the closing time", () => {
  assert.throws(
    () =>
      validateBookingAvailability({
        startsAt: localDate(2026, 6, 1, 22, 0),
        endsAt: localDate(2026, 6, 1, 23, 10),
        blockedFrom: localDate(2026, 6, 1, 22, 0),
        blockedUntil: localDate(2026, 6, 1, 23, 10),
        openingTime: "06:00",
        closingTime: "23:00",
        maximumBookingMinutes: null,
        singleBookingLeadDays: 180,
        now: requestNow,
      }),
    /Schliesszeit/,
  );
});

test("rejects a request exceeding the maximum duration", () => {
  assert.throws(
    () =>
      validateBookingAvailability({
        startsAt: localDate(2026, 6, 1, 18, 0),
        endsAt: localDate(2026, 6, 1, 21, 15),
        blockedFrom: localDate(2026, 6, 1, 18, 0),
        blockedUntil: localDate(2026, 6, 1, 21, 15),
        openingTime: "06:00",
        closingTime: "23:30",
        maximumBookingMinutes: 180,
        singleBookingLeadDays: 180,
        now: requestNow,
      }),
    /maximale Buchungsdauer/,
  );
});

test("rejects a request outside the configured lead time", () => {
  assert.throws(
    () =>
      validateBookingAvailability({
        startsAt: new Date("2026-12-01T18:00:00Z"),
        endsAt: new Date("2026-12-01T20:00:00Z"),
        blockedFrom: new Date("2026-12-01T18:00:00Z"),
        blockedUntil: new Date("2026-12-01T20:00:00Z"),
        openingTime: "06:00",
        closingTime: "23:00",
        maximumBookingMinutes: null,
        singleBookingLeadDays: 30,
        now: requestNow,
      }),
    /Buchungsvorlaufs/,
  );
});

test("writes the initial status history with oldStatus = null", async () => {
  const writes: Array<{ kind: string; data: unknown }> = [];

  await requestBooking(
    {
      actorUserId: "user-1",
      organizationId: "organization-1",
      roomId: "room-child",
      usageTypeId: "usage-1",
      title: "Training",
      description: null,
      startsAt: start,
      endsAt: end,
      blockedFrom: start,
      blockedUntil: end,
    },
    {
      booking: {
        async create(args) {
          writes.push({ kind: "booking", data: args.data });
          return makeTransitionBooking({ id: "booking-1" });
        },
        async findFirst() {
          throw new Error("not used");
        },
        async findUnique() {
          throw new Error("not used");
        },
        async updateMany() {
          throw new Error("not used");
        },
      },
      bookingStatusHistory: {
        async create(args) {
          writes.push({ kind: "history", data: args.data });
          return args.data;
        },
      },
    },
  );

  assert.equal(writes.length, 2);
  assert.deepEqual(writes[1], {
    kind: "history",
    data: {
      bookingId: "booking-1",
      actorUserId: "user-1",
      oldStatus: null,
      newStatus: "REQUESTED",
      reason: "Buchungsantrag erstellt.",
      oldStartAt: null,
      oldEndAt: null,
      newStartAt: start,
      newEndAt: end,
    },
  });
});

test("rejects an atomic cancellation when the status changed in parallel", async () => {
  await assert.rejects(
    () =>
      cancelBooking(
        {
          bookingId: "booking-1",
          actorUserId: "user-1",
          scope: { requestedByUserId: "user-1" },
        },
        {
          booking: {
            async create() {
              throw new Error("not used");
            },
            async findFirst() {
              return makeTransitionBooking();
            },
            async findUnique() {
              return null;
            },
            async updateMany() {
              return { count: 0 };
            },
          },
          bookingStatusHistory: {
            async create() {
              return null;
            },
          },
        },
      ),
    /zwischenzeitlich geaendert/,
  );
});

test("writes status history for a successful cancellation", async () => {
  const writes: Array<{ kind: string; data: unknown }> = [];

  const cancelled = await cancelBooking(
    {
      bookingId: "booking-2",
      actorUserId: "user-2",
      scope: { requestedByUserId: "user-2" },
    },
    {
      booking: {
        async create() {
          throw new Error("not used");
        },
        async findFirst() {
          return makeTransitionBooking({ id: "booking-2", requestedByUserId: "user-2" });
        },
        async findUnique() {
          return makeTransitionBooking({
            id: "booking-2",
            requestedByUserId: "user-2",
            status: "CANCELLED",
          });
        },
        async updateMany() {
          return { count: 1 };
        },
      },
      bookingStatusHistory: {
        async create(args) {
          writes.push({ kind: "history", data: args.data });
          return args.data;
        },
      },
    },
  );

  assert.equal(cancelled.status, "CANCELLED");
  assert.deepEqual(writes[0], {
    kind: "history",
    data: {
      bookingId: "booking-2",
      actorUserId: "user-2",
      oldStatus: "REQUESTED",
      newStatus: "CANCELLED",
      reason: "Vom Antragsteller storniert.",
      oldStartAt: start,
      oldEndAt: end,
      newStartAt: start,
      newEndAt: end,
    },
  });
});
