import assert from "node:assert/strict";
import test from "node:test";
import {
  approveBookingForAdmin,
  rejectBookingForAdmin,
} from "../lib/services/booking-approval-service";
import {
  approveBooking,
  markBookingInReview,
  rejectBooking,
} from "../lib/services/booking-transition-service";

const start = new Date("2026-06-01T18:00:00Z");
const end = new Date("2026-06-01T20:00:00Z");
type TransitionTestClient = NonNullable<Parameters<typeof approveBooking>[1]>;

function makeWorkflowBooking(overrides: Partial<Record<string, unknown>> = {}) {
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

function createWorkflowClient({
  currentBooking = makeWorkflowBooking(),
  updatedBooking = currentBooking,
  updateCount = 1,
  conflictingBookings = [],
  closures = [],
  links = [],
}: {
  currentBooking?: ReturnType<typeof makeWorkflowBooking>;
  updatedBooking?: ReturnType<typeof makeWorkflowBooking> | null;
  updateCount?: number;
  conflictingBookings?: Array<{
    id: string;
    roomId: string;
    title: string;
    status: "REQUESTED" | "IN_REVIEW" | "APPROVED";
    blockedFrom: Date;
    blockedUntil: Date;
  }>;
  closures?: Array<{
    id: string;
    buildingId: string | null;
    roomId: string | null;
    reason: string;
    status: "RESTRICTED" | "CLOSED";
    startsAt: Date;
    endsAt: Date;
  }>;
  links?: Array<{ parentRoomId: string; childRoomId: string }>;
} = {}) {
  const writes: unknown[] = [];
  let updateAttempts = 0;

  return {
    writes,
    getUpdateAttempts: () => updateAttempts,
    client: {
      booking: {
        async create() {
          throw new Error("not used");
        },
        async findFirst() {
          return currentBooking;
        },
        async findUnique() {
          return updatedBooking;
        },
        async updateMany() {
          updateAttempts += 1;
          return { count: updateCount };
        },
        async findMany() {
          return conflictingBookings;
        },
      },
      roomComposition: {
        async findMany() {
          return links;
        },
      },
      closure: {
        async findMany() {
          return closures;
        },
      },
      bookingStatusHistory: {
        async create(args: { data: unknown }) {
          writes.push(args.data);
          return args.data;
        },
      },
    } as unknown as TransitionTestClient,
  };
}

test("moves a booking from REQUESTED to IN_REVIEW", async () => {
  const harness = createWorkflowClient({
    currentBooking: makeWorkflowBooking({ status: "REQUESTED" }),
    updatedBooking: makeWorkflowBooking({ status: "IN_REVIEW", processedByUserId: "admin-1", processedAt: end }),
  });

  const updated = await markBookingInReview(
    {
      bookingId: "booking-1",
      actorUserId: "admin-1",
    },
    harness.client,
  );

  assert.equal(updated.status, "IN_REVIEW");
  assert.deepEqual(harness.writes[0], {
    bookingId: "booking-1",
    actorUserId: "admin-1",
    oldStatus: "REQUESTED",
    newStatus: "IN_REVIEW",
    reason: "Zur Pruefung uebernommen.",
    oldStartAt: start,
    oldEndAt: end,
    newStartAt: start,
    newEndAt: end,
  });
});

test("does not allow direct approval from REQUESTED", async () => {
  const harness = createWorkflowClient({
    currentBooking: makeWorkflowBooking({ status: "REQUESTED" }),
    updatedBooking: makeWorkflowBooking({ status: "APPROVED" }),
  });

  await assert.rejects(
    () =>
      approveBooking(
        {
          bookingId: "booking-1",
          actorUserId: "admin-1",
          decisionNote: "Bitte freigeben",
          roomId: "room-child",
          buildingId: "building-1",
          blockedFrom: start,
          blockedUntil: end,
        },
        harness.client,
      ),
    /in Pruefung/,
  );
});

test("approves a booking from IN_REVIEW and writes history", async () => {
  const harness = createWorkflowClient({
    currentBooking: makeWorkflowBooking({ status: "IN_REVIEW" }),
    updatedBooking: makeWorkflowBooking({ status: "APPROVED", processedByUserId: "admin-1", processedAt: end }),
  });

  const updated = await approveBooking(
    {
      bookingId: "booking-1",
      actorUserId: "admin-1",
      decisionNote: "Freigegeben.",
      roomId: "room-child",
      buildingId: "building-1",
      blockedFrom: start,
      blockedUntil: end,
    },
    harness.client,
  );

  assert.equal(updated.status, "APPROVED");
  assert.deepEqual(harness.writes[0], {
    bookingId: "booking-1",
    actorUserId: "admin-1",
    oldStatus: "IN_REVIEW",
    newStatus: "APPROVED",
    reason: "Freigegeben.",
    oldStartAt: start,
    oldEndAt: end,
    newStartAt: start,
    newEndAt: end,
  });
});

test("rejects a booking from IN_REVIEW and writes history", async () => {
  const harness = createWorkflowClient({
    currentBooking: makeWorkflowBooking({ status: "IN_REVIEW" }),
    updatedBooking: makeWorkflowBooking({ status: "REJECTED", processedByUserId: "admin-1", processedAt: end }),
  });

  const updated = await rejectBooking(
    {
      bookingId: "booking-1",
      actorUserId: "admin-1",
      decisionNote: "Termin kollidiert mit einer internen Veranstaltung.",
    },
    harness.client,
  );

  assert.equal(updated.status, "REJECTED");
  assert.deepEqual(harness.writes[0], {
    bookingId: "booking-1",
    actorUserId: "admin-1",
    oldStatus: "IN_REVIEW",
    newStatus: "REJECTED",
    reason: "Termin kollidiert mit einer internen Veranstaltung.",
    oldStartAt: start,
    oldEndAt: end,
    newStartAt: start,
    newEndAt: end,
  });
});

test("blocks approval when an overlapping approved booking exists", async () => {
  const harness = createWorkflowClient({
    currentBooking: makeWorkflowBooking({ status: "IN_REVIEW" }),
    conflictingBookings: [
      {
        id: "booking-2",
        roomId: "room-child",
        title: "Ligaspiel",
        status: "APPROVED",
        blockedFrom: new Date("2026-06-01T17:30:00Z"),
        blockedUntil: new Date("2026-06-01T18:30:00Z"),
      },
    ],
  });

  await assert.rejects(
    () =>
      approveBooking(
        {
          bookingId: "booking-1",
          actorUserId: "admin-1",
          roomId: "room-child",
          buildingId: "building-1",
          blockedFrom: start,
          blockedUntil: end,
        },
        harness.client,
      ),
    /genehmigten Buchung/,
  );
  assert.equal(harness.getUpdateAttempts(), 0);
});

test("blocks approval when a closure overlaps", async () => {
  const harness = createWorkflowClient({
    currentBooking: makeWorkflowBooking({ status: "IN_REVIEW" }),
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

  await assert.rejects(
    () =>
      approveBooking(
        {
          bookingId: "booking-1",
          actorUserId: "admin-1",
          roomId: "room-child",
          buildingId: "building-1",
          blockedFrom: start,
          blockedUntil: end,
        },
        harness.client,
      ),
    /Sperre blockiert/,
  );
  assert.equal(harness.getUpdateAttempts(), 0);
});

test("prevents approval when the booking status changed in parallel", async () => {
  const harness = createWorkflowClient({
    currentBooking: makeWorkflowBooking({ status: "IN_REVIEW" }),
    updateCount: 0,
    updatedBooking: null,
  });

  await assert.rejects(
    () =>
      approveBooking(
        {
          bookingId: "booking-1",
          actorUserId: "admin-1",
          roomId: "room-child",
          buildingId: "building-1",
          blockedFrom: start,
          blockedUntil: end,
        },
        harness.client,
      ),
    /zwischenzeitlich geaendert/,
  );
});

test("blocks approval without APPROVE_BOOKING permission", async () => {
  await assert.rejects(
    () =>
      approveBookingForAdmin(
        {
          bookingId: "booking-1",
          decisionNote: "Freigegeben.",
        },
        "admin-1",
        { canApprove: false },
      ),
    /nicht genehmigen/,
  );
});

test("blocks rejection without REJECT_BOOKING permission", async () => {
  await assert.rejects(
    () =>
      rejectBookingForAdmin(
        {
          bookingId: "booking-1",
          decisionNote: "Nicht moeglich.",
        },
        "admin-1",
        { canReject: false },
      ),
    /nicht ablehnen/,
  );
});
