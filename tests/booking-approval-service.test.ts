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
import { lockBookingApprovalContext } from "../lib/services/booking-conflict-service";

const start = new Date("2026-06-01T18:00:00Z");
const end = new Date("2026-06-01T20:00:00Z");
type TransitionTestClient = NonNullable<Parameters<typeof approveBooking>[1]>;
type WorkflowBooking = {
  id: string;
  organizationId: string;
  roomId: string;
  requestedByUserId: string;
  processedByUserId: string | null;
  status: "DRAFT" | "REQUESTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED" | "MOVED" | "ARCHIVED";
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  blockedFrom: Date;
  blockedUntil: Date;
  requestedAt: Date;
  processedAt: Date | null;
};

test("approval lock query returns a serializable value for Prisma", async () => {
  const queries: string[] = [];
  const values: unknown[] = [];

  await lockBookingApprovalContext("room-child", {
    roomComposition: {
      async findMany() {
        return [];
      },
    },
    async $queryRawUnsafe<T = unknown>(query: string, value: unknown): Promise<T> {
      queries.push(query);
      values.push(value);
      return [{ locked: 1 }] as T;
    },
  });

  assert.equal(queries.length, 1);
  assert.match(queries[0] ?? "", /AS locked/);
  assert.equal(values[0], "booking-approval-room:room-child");
});

function makeWorkflowBooking(overrides: Partial<WorkflowBooking> = {}): WorkflowBooking {
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
      async $queryRawUnsafe() {
        return [];
      },
    } as unknown as TransitionTestClient,
  };
}

function waitForNextTick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function createAdvisoryLockManager() {
  const heldLocks = new Map<string, string>();
  const ownerLocks = new Map<string, Set<string>>();
  const waitQueues = new Map<string, Array<() => void>>();
  const ownerWaiters = new Map<string, Array<() => void>>();

  function notifyOwner(ownerId: string) {
    const listeners = ownerWaiters.get(ownerId) ?? [];
    ownerWaiters.delete(ownerId);
    for (const listener of listeners) {
      listener();
    }
  }

  async function acquire(ownerId: string, lockKey: string) {
    while (true) {
      const currentOwner = heldLocks.get(lockKey);

      if (!currentOwner || currentOwner === ownerId) {
        heldLocks.set(lockKey, ownerId);
        const locks = ownerLocks.get(ownerId) ?? new Set<string>();
        const wasEmpty = locks.size === 0;
        locks.add(lockKey);
        ownerLocks.set(ownerId, locks);
        if (wasEmpty) {
          notifyOwner(ownerId);
        }
        return;
      }

      await new Promise<void>((resolve) => {
        const queue = waitQueues.get(lockKey) ?? [];
        queue.push(resolve);
        waitQueues.set(lockKey, queue);
      });
    }
  }

  function releaseAll(ownerId: string) {
    const locks = ownerLocks.get(ownerId);
    if (!locks) {
      return;
    }

    for (const lockKey of locks) {
      if (heldLocks.get(lockKey) === ownerId) {
        heldLocks.delete(lockKey);
        const queue = waitQueues.get(lockKey);
        const next = queue?.shift();
        if (queue && queue.length === 0) {
          waitQueues.delete(lockKey);
        }
        next?.();
      }
    }

    ownerLocks.delete(ownerId);
  }

  async function waitForOwner(ownerId: string) {
    if ((ownerLocks.get(ownerId)?.size ?? 0) > 0) {
      return;
    }

    await new Promise<void>((resolve) => {
      const listeners = ownerWaiters.get(ownerId) ?? [];
      listeners.push(resolve);
      ownerWaiters.set(ownerId, listeners);
    });
  }

  return {
    acquire,
    releaseAll,
    waitForOwner,
  };
}

function createConcurrentApprovalHarness({
  bookings,
  links = [],
  closures = [],
  pauseAfterLockOwners = [],
}: {
  bookings: WorkflowBooking[];
  links?: Array<{ parentRoomId: string; childRoomId: string }>;
  closures?: Array<{
    id: string;
    buildingId: string | null;
    roomId: string | null;
    reason: string;
    status: "RESTRICTED" | "CLOSED";
    startsAt: Date;
    endsAt: Date;
  }>;
  pauseAfterLockOwners?: string[];
}) {
  const lockManager = createAdvisoryLockManager();
  const pauses = new Map(
    pauseAfterLockOwners.map((ownerId) => {
      let resume!: () => void;
      const waitForResume = new Promise<void>((resolve) => {
        resume = resolve;
      });

      return [ownerId, { waitForResume, resume }] as const;
    }),
  );
  const state = {
    bookings: bookings.map((booking) => ({ ...booking })),
    history: [] as Array<Record<string, unknown>>,
  };

  function getBookingById(id: string) {
    return state.bookings.find((booking) => booking.id === id) ?? null;
  }

  function createClient(ownerId: string): TransitionTestClient {
    return {
      booking: {
        async create() {
          throw new Error("not used");
        },
        async findFirst(args: Parameters<TransitionTestClient["booking"]["findFirst"]>[0]) {
          const bookingId = typeof args.where.id === "string" ? args.where.id : "";
          return getBookingById(bookingId);
        },
        async findUnique(args: Parameters<TransitionTestClient["booking"]["findUnique"]>[0]) {
          return getBookingById(typeof args.where.id === "string" ? args.where.id : "");
        },
        async updateMany(args: Parameters<TransitionTestClient["booking"]["updateMany"]>[0]) {
          const bookingId = typeof args.where.id === "string" ? args.where.id : "";
          const expectedStatus = typeof args.where.status === "string" ? args.where.status : undefined;
          const booking = getBookingById(bookingId);

          if (!booking || booking.status !== expectedStatus) {
            return { count: 0 };
          }

          booking.status = (args.data.status as typeof booking.status) ?? booking.status;
          booking.processedByUserId =
            (args.data.processedByUserId as string | null | undefined) ?? booking.processedByUserId;
          booking.processedAt = (args.data.processedAt as Date | null | undefined) ?? booking.processedAt;
          return { count: 1 };
        },
        async findMany(args: unknown) {
          const where = (args as { where: Record<string, unknown> }).where;
          const roomIdFilter = where.roomId as { in?: string[] } | undefined;
          const statusFilter = where.status as { in?: WorkflowBooking["status"][] } | undefined;
          const blockedFromFilter = where.blockedFrom as { lt?: Date } | undefined;
          const blockedUntilFilter = where.blockedUntil as { gt?: Date } | undefined;
          const excludedFilter = where.NOT as { id?: string } | undefined;
          const roomIds = roomIdFilter?.in ?? [];
          const statuses = statusFilter?.in ?? [];
          const blockedFrom = blockedFromFilter?.lt ?? null;
          const blockedUntil = blockedUntilFilter?.gt ?? null;
          const excludedId = excludedFilter?.id ?? null;

          return state.bookings.filter((booking) => {
            if (excludedId && booking.id === excludedId) {
              return false;
            }

            if (roomIds.length > 0 && !roomIds.includes(booking.roomId)) {
              return false;
            }

            if (statuses.length > 0 && !statuses.includes(booking.status)) {
              return false;
            }

            if (blockedFrom && !(booking.blockedFrom < blockedFrom)) {
              return false;
            }

            if (blockedUntil && !(booking.blockedUntil > blockedUntil)) {
              return false;
            }

            return true;
          });
        },
      },
      roomComposition: {
        async findMany() {
          return links;
        },
      },
      closure: {
        async findMany(args: unknown) {
          const where = (args as { where: Record<string, unknown> }).where;
          const startsAtFilter = where.startsAt as { lt?: Date } | undefined;
          const endsAtFilter = where.endsAt as { gt?: Date } | undefined;
          const orFilters = Array.isArray(where.OR) ? (where.OR as Array<Record<string, unknown>>) : [];
          const startsAt = startsAtFilter?.lt ?? null;
          const endsAt = endsAtFilter?.gt ?? null;
          const roomIds = orFilters[1] && "roomId" in orFilters[1]
            ? (((orFilters[1].roomId as { in?: string[] })?.in) ?? [])
            : [];
          const buildingId = orFilters[0] && "buildingId" in orFilters[0]
            ? (orFilters[0].buildingId as string | null)
            : null;

          return closures.filter((closure) => {
            if (startsAt && !(closure.startsAt < startsAt)) {
              return false;
            }

            if (endsAt && !(closure.endsAt > endsAt)) {
              return false;
            }

            return closure.buildingId === buildingId || (closure.roomId !== null && roomIds.includes(closure.roomId));
          });
        },
      },
      bookingStatusHistory: {
        async create(args: { data: Record<string, unknown> }) {
          state.history.push(args.data as Record<string, unknown>);
          return args.data;
        },
      },
      async $queryRawUnsafe(_query: string, lockKey: unknown) {
        await lockManager.acquire(ownerId, String(lockKey));
        const pause = pauses.get(ownerId);
        if (pause) {
          await pause.waitForResume;
        }
        return [];
      },
    } as unknown as TransitionTestClient;
  }

  async function runApproval(
    ownerId: string,
    input: Parameters<typeof approveBooking>[0],
  ) {
    const client = createClient(ownerId);

    try {
      return await approveBooking(input, client);
    } finally {
      lockManager.releaseAll(ownerId);
    }
  }

  return {
    history: state.history,
    bookings: state.bookings,
    runApproval,
    waitForOwner: lockManager.waitForOwner,
    resumeOwner(ownerId: string) {
      pauses.get(ownerId)?.resume();
      pauses.delete(ownerId);
    },
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
    reason: "Zur PrÃ¼fung Ã¼bernommen.",
    oldStartAt: start,
    oldEndAt: end,
    newStartAt: start,
    newEndAt: end,
  });
});

test("approves a booking directly from REQUESTED and writes history", async () => {
  const harness = createWorkflowClient({
    currentBooking: makeWorkflowBooking({ status: "REQUESTED" }),
    updatedBooking: makeWorkflowBooking({ status: "APPROVED", processedByUserId: "admin-1", processedAt: end }),
  });

  const updated = await approveBooking(
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
  );

  assert.equal(updated.status, "APPROVED");
  assert.deepEqual(harness.writes[0], {
    bookingId: "booking-1",
    actorUserId: "admin-1",
    oldStatus: "REQUESTED",
    newStatus: "APPROVED",
    reason: "Bitte freigeben",
    oldStartAt: start,
    oldEndAt: end,
    newStartAt: start,
    newEndAt: end,
  });
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

test("rejects a booking directly from REQUESTED and writes history", async () => {
  const harness = createWorkflowClient({
    currentBooking: makeWorkflowBooking({ status: "REQUESTED" }),
    updatedBooking: makeWorkflowBooking({ status: "REJECTED", processedByUserId: "admin-1", processedAt: end }),
  });

  const updated = await rejectBooking(
    {
      bookingId: "booking-1",
      actorUserId: "admin-1",
      decisionNote: "Termin ist fachlich nicht möglich.",
    },
    harness.client,
  );

  assert.equal(updated.status, "REJECTED");
  assert.deepEqual(harness.writes[0], {
    bookingId: "booking-1",
    actorUserId: "admin-1",
    oldStatus: "REQUESTED",
    newStatus: "REJECTED",
    reason: "Termin ist fachlich nicht möglich.",
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
    /zwischenzeitlich geändert/,
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

test("serializes two parallel approvals for overlapping bookings and writes history only once", async () => {
  const harness = createConcurrentApprovalHarness({
    pauseAfterLockOwners: ["approval-1"],
    bookings: [
      makeWorkflowBooking({ id: "booking-1", status: "IN_REVIEW", roomId: "room-child" }),
      makeWorkflowBooking({
        id: "booking-2",
        status: "IN_REVIEW",
        roomId: "room-child",
        title: "Kurs",
        blockedFrom: new Date("2026-06-01T18:30:00Z"),
        blockedUntil: new Date("2026-06-01T20:30:00Z"),
        startsAt: new Date("2026-06-01T18:45:00Z"),
        endsAt: new Date("2026-06-01T20:15:00Z"),
      }),
    ],
  });

  const firstApproval = harness.runApproval("approval-1", {
    bookingId: "booking-1",
    actorUserId: "admin-1",
    roomId: "room-child",
    buildingId: "building-1",
    blockedFrom: start,
    blockedUntil: end,
  });
  await harness.waitForOwner("approval-1");

  let secondSettled = false;
  const secondApprovalPromise = harness.runApproval("approval-2", {
    bookingId: "booking-2",
    actorUserId: "admin-2",
    roomId: "room-child",
    buildingId: "building-1",
    blockedFrom: new Date("2026-06-01T18:30:00Z"),
    blockedUntil: new Date("2026-06-01T20:30:00Z"),
  });
  const secondApproval = assert.rejects(secondApprovalPromise, /genehmigten Buchung/).finally(() => {
      secondSettled = true;
    });

  await waitForNextTick();
  assert.equal(secondSettled, false);

  harness.resumeOwner("approval-1");
  const approved = await firstApproval;
  assert.equal(approved.status, "APPROVED");

  await secondApproval;
  assert.equal(harness.history.length, 1);
  assert.deepEqual(
    harness.bookings.map((booking) => ({ id: booking.id, status: booking.status })),
    [
      { id: "booking-1", status: "APPROVED" },
      { id: "booking-2", status: "IN_REVIEW" },
    ],
  );
});

test("serializes parallel approval between child room and parent room", async () => {
  const childStart = new Date("2026-06-02T18:00:00Z");
  const childEnd = new Date("2026-06-02T20:00:00Z");
  const parentStart = new Date("2026-06-02T18:15:00Z");
  const parentEnd = new Date("2026-06-02T19:45:00Z");
  const harness = createConcurrentApprovalHarness({
    links: [{ parentRoomId: "room-parent", childRoomId: "room-child" }],
    bookings: [
      makeWorkflowBooking({
        id: "booking-child",
        status: "IN_REVIEW",
        roomId: "room-child",
        blockedFrom: childStart,
        blockedUntil: childEnd,
        startsAt: childStart,
        endsAt: childEnd,
      }),
      makeWorkflowBooking({
        id: "booking-parent",
        status: "IN_REVIEW",
        roomId: "room-parent",
        title: "Gesamthalle",
        blockedFrom: parentStart,
        blockedUntil: parentEnd,
        startsAt: parentStart,
        endsAt: parentEnd,
      }),
    ],
  });

  const firstApproval = harness.runApproval("approval-parent", {
    bookingId: "booking-parent",
    actorUserId: "admin-1",
    roomId: "room-parent",
    buildingId: "building-1",
    blockedFrom: parentStart,
    blockedUntil: parentEnd,
  });
  await harness.waitForOwner("approval-parent");

  const secondApproval = harness.runApproval("approval-child", {
    bookingId: "booking-child",
    actorUserId: "admin-2",
    roomId: "room-child",
    buildingId: "building-1",
    blockedFrom: childStart,
    blockedUntil: childEnd,
  });

  const approved = await firstApproval;
  assert.equal(approved.status, "APPROVED");
  await assert.rejects(secondApproval, /genehmigten Buchung/);
  assert.equal(harness.history.length, 1);
});

test("allows serialized approvals to succeed when no hard conflict exists", async () => {
  const earlyStart = new Date("2026-06-03T18:00:00Z");
  const earlyEnd = new Date("2026-06-03T19:00:00Z");
  const lateStart = new Date("2026-06-03T19:00:00Z");
  const lateEnd = new Date("2026-06-03T20:00:00Z");
  const harness = createConcurrentApprovalHarness({
    bookings: [
      makeWorkflowBooking({
        id: "booking-early",
        status: "IN_REVIEW",
        blockedFrom: earlyStart,
        blockedUntil: earlyEnd,
        startsAt: earlyStart,
        endsAt: earlyEnd,
      }),
      makeWorkflowBooking({
        id: "booking-late",
        status: "IN_REVIEW",
        title: "Abendkurs",
        blockedFrom: lateStart,
        blockedUntil: lateEnd,
        startsAt: lateStart,
        endsAt: lateEnd,
      }),
    ],
  });

  const firstApproval = harness.runApproval("approval-early", {
    bookingId: "booking-early",
    actorUserId: "admin-1",
    roomId: "room-child",
    buildingId: "building-1",
    blockedFrom: earlyStart,
    blockedUntil: earlyEnd,
  });
  await harness.waitForOwner("approval-early");

  const secondApproval = harness.runApproval("approval-late", {
    bookingId: "booking-late",
    actorUserId: "admin-2",
    roomId: "room-child",
    buildingId: "building-1",
    blockedFrom: lateStart,
    blockedUntil: lateEnd,
  });

  const [approvedEarly, approvedLate] = await Promise.all([firstApproval, secondApproval]);
  assert.equal(approvedEarly.status, "APPROVED");
  assert.equal(approvedLate.status, "APPROVED");
  assert.equal(harness.history.length, 2);
});

