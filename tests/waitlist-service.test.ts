import assert from "node:assert/strict";
import test from "node:test";
import { BookingValidationError } from "../lib/services/booking-rules";
import { createBookingRequest } from "../lib/services/booking-request-service";
import {
  acceptWaitlistOffer,
  activateNextWaitlistEntryForSlot,
  createWaitlistEntry,
  declineWaitlistOffer,
  expireWaitlistOffers,
} from "../lib/services/waitlist-service";

const roomId = "room-1";
const buildingId = "building-1";
const organizationId = "organization-1";
const usageTypeId = "usage-1";
const actorUserId = "user-1";
const requestNow = new Date("2026-05-27T12:00:00Z");
const slotStart = new Date("2026-06-10T18:00:00Z");
const slotEnd = new Date("2026-06-10T20:00:00Z");

type WaitlistStatus = "ACTIVE" | "OFFERED" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "CANCELLED";

type WaitlistEntryRecord = {
  id: string;
  organizationId: string;
  roomId: string;
  usageTypeId: string;
  requestedByUserId: string | null;
  title: string;
  startsAt: Date;
  endsAt: Date;
  status: WaitlistStatus;
  placedAt: Date;
  offeredAt: Date | null;
  offerExpiresAt: Date | null;
};

type ConflictBooking = {
  id: string;
  roomId: string;
  title: string;
  status: "REQUESTED" | "IN_REVIEW" | "APPROVED";
  blockedFrom: Date;
  blockedUntil: Date;
};

type ConflictClosure = {
  id: string;
  buildingId: string | null;
  roomId: string | null;
  reason: string;
  status: "RESTRICTED" | "CLOSED";
  startsAt: Date;
  endsAt: Date;
};

type RoomLink = {
  parentRoomId: string;
  childRoomId: string;
};

function makeWaitlistEntry(overrides: Partial<WaitlistEntryRecord> = {}): WaitlistEntryRecord {
  return {
    id: "waitlist-1",
    organizationId,
    roomId,
    usageTypeId,
    requestedByUserId: actorUserId,
    title: "Training",
    startsAt: slotStart,
    endsAt: slotEnd,
    status: "ACTIVE",
    placedAt: new Date("2026-05-20T09:00:00Z"),
    offeredAt: null,
    offerExpiresAt: null,
    ...overrides,
  };
}

function makeRoom(
  overrides: Partial<{
    id: string;
    name: string;
    status: "ACTIVE" | "RESTRICTED" | "OUT_OF_SERVICE";
    openingTime: string;
    closingTime: string;
    maximumBookingMinutes: number | null;
    singleBookingLeadDays: number;
    setupBufferMinutes: number;
    teardownBufferMinutes: number;
    building: {
      id: string;
      isActive: boolean;
      name?: string;
    };
  }> = {},
) {
  return {
    id: roomId,
    name: "Turnsaal",
    status: "ACTIVE" as const,
    openingTime: "06:00",
    closingTime: "23:00",
    maximumBookingMinutes: 180,
    singleBookingLeadDays: 180,
    setupBufferMinutes: 15,
    teardownBufferMinutes: 15,
    building: {
      id: buildingId,
      isActive: true,
      name: "Sporthalle",
    },
    ...overrides,
  };
}

function makeOrganization(status: "ACTIVE" | "BLOCKED" | "INACTIVE" = "ACTIVE") {
  return {
    id: organizationId,
    name: "Verein",
    status,
    canRequestBookings: true,
  };
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

function createRootClient({
  entries,
  room = makeRoom(),
  organization = makeOrganization(),
  hasMembership = true,
  conflictingBookings = [],
  closures = [],
  links = [],
  ownerId = "default-owner",
  lockManager,
  pauseAfterFirstLock = false,
  sharedState,
}: {
  entries: WaitlistEntryRecord[];
  room?: ReturnType<typeof makeRoom>;
  organization?: ReturnType<typeof makeOrganization>;
  hasMembership?: boolean;
  conflictingBookings?: ConflictBooking[];
  closures?: ConflictClosure[];
  links?: RoomLink[];
  ownerId?: string;
  lockManager?: ReturnType<typeof createAdvisoryLockManager>;
  pauseAfterFirstLock?: boolean;
  sharedState?: {
    entries: WaitlistEntryRecord[];
    notifications: Array<Record<string, unknown>>;
    bookingCreates: Array<Record<string, unknown>>;
    historyCreates: Array<Record<string, unknown>>;
  };
}) {
  let paused = false;
  let resumeLock!: () => void;
  const waitForResume = new Promise<void>((resolve) => {
    resumeLock = resolve;
  });

  const state =
    sharedState ??
    {
      entries: entries.map((entry) => ({ ...entry })),
      notifications: [] as Array<Record<string, unknown>>,
      bookingCreates: [] as Array<Record<string, unknown>>,
      historyCreates: [] as Array<Record<string, unknown>>,
    };

  function entryWithRelations(entry: WaitlistEntryRecord) {
    return {
      ...entry,
      organization,
      room,
      usageType: { id: usageTypeId, name: "Training" },
      requestedBy: {
        id: actorUserId,
        displayName: "Max Mustermann",
        email: "max@example.com",
      },
    };
  }

  function findEntry(id: string) {
    return state.entries.find((entry) => entry.id === id) ?? null;
  }

  function filterBookings(where: Record<string, unknown>) {
    const roomIds = ((where.roomId as { in?: string[] })?.in) ?? [];
    const statuses = ((where.status as { in?: ConflictBooking["status"][] })?.in) ?? [];
    const blockedFrom = (where.blockedFrom as { lt?: Date })?.lt;
    const blockedUntil = (where.blockedUntil as { gt?: Date })?.gt;
    const excludedId = (where.NOT as { id?: string } | undefined)?.id;

    return conflictingBookings.filter((booking) => {
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
  }

  function filterClosures(where: Record<string, unknown>) {
    const startsAt = (where.startsAt as { lt?: Date })?.lt;
    const endsAt = (where.endsAt as { gt?: Date })?.gt;
    const roomIds = Array.isArray(where.OR) && where.OR[1] && "roomId" in where.OR[1]
      ? ((((where.OR[1] as { roomId?: { in?: string[] } }).roomId)?.in) ?? [])
      : [];
    const filterBuildingId = Array.isArray(where.OR) && where.OR[0] && "buildingId" in where.OR[0]
      ? ((where.OR[0] as { buildingId?: string | null }).buildingId ?? null)
      : null;

    return closures.filter((closure) => {
      if (startsAt && !(closure.startsAt < startsAt)) {
        return false;
      }

      if (endsAt && !(closure.endsAt > endsAt)) {
        return false;
      }

      return closure.buildingId === filterBuildingId || (closure.roomId !== null && roomIds.includes(closure.roomId));
    });
  }

  const transactionClient = {
    organization: {
      async findUnique() {
        return organization;
      },
    },
    organizationMember: {
      async findFirst() {
        return hasMembership ? { id: "member-1" } : null;
      },
    },
    room: {
      async findUnique() {
        return room;
      },
    },
    usageType: {
      async findUnique() {
        return { id: usageTypeId };
      },
    },
    roomComposition: {
      async findMany() {
        return links;
      },
    },
    booking: {
      async findMany(args: { where: Record<string, unknown> }) {
        return filterBookings(args.where);
      },
      async create(args: { data: Record<string, unknown> }) {
        state.bookingCreates.push(args.data);
        return {
          id: `booking-${state.bookingCreates.length}`,
          organizationId,
          roomId: String(args.data.roomId),
          requestedByUserId: actorUserId,
          processedByUserId: null,
          status: "REQUESTED" as const,
          title: String(args.data.title),
          description: args.data.description ?? null,
          startsAt: args.data.startsAt as Date,
          endsAt: args.data.endsAt as Date,
          blockedFrom: args.data.blockedFrom as Date,
          blockedUntil: args.data.blockedUntil as Date,
          requestedAt: requestNow,
          processedAt: null,
        };
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
    closure: {
      async findMany(args: { where: Record<string, unknown> }) {
        return filterClosures(args.where);
      },
    },
    bookingStatusHistory: {
      async create(args: { data: Record<string, unknown> }) {
        state.historyCreates.push(args.data);
        return args.data;
      },
    },
    notification: {
      async create(args: { data: Record<string, unknown> }) {
        state.notifications.push(args.data);
        return args.data;
      },
    },
    waitlistEntry: {
      async create(args: { data: Record<string, unknown> }) {
        const created = makeWaitlistEntry({
          id: `waitlist-${state.entries.length + 1}`,
          organizationId: String(args.data.organizationId),
          roomId: String(args.data.roomId),
          usageTypeId: String(args.data.usageTypeId),
          requestedByUserId: String(args.data.requestedByUserId),
          title: String(args.data.title),
          startsAt: args.data.startsAt as Date,
          endsAt: args.data.endsAt as Date,
          status: "ACTIVE",
          placedAt: requestNow,
        });
        state.entries.push(created);
        return entryWithRelations(created);
      },
      async findMany(args: { where: Record<string, unknown> }) {
        const where = args.where;
        const statusFilter = where.status as WaitlistStatus | { in?: WaitlistStatus[] } | undefined;
        const roomIds = ((where.roomId as { in?: string[] })?.in) ?? [];
        const expiresAfter = (where.offerExpiresAt as { gt?: Date; lte?: Date } | undefined)?.gt;
        const expiresUntil = (where.offerExpiresAt as { gt?: Date; lte?: Date } | undefined)?.lte;

        const statuses =
          typeof statusFilter === "string"
            ? [statusFilter]
            : statusFilter?.in ?? null;

        return state.entries
          .filter((entry) => {
            if (statuses && !statuses.includes(entry.status)) {
              return false;
            }

            if (roomIds.length > 0 && !roomIds.includes(entry.roomId)) {
              return false;
            }

            if (expiresAfter && (!entry.offerExpiresAt || !(entry.offerExpiresAt > expiresAfter))) {
              return false;
            }

            if (expiresUntil && (!entry.offerExpiresAt || !(entry.offerExpiresAt <= expiresUntil))) {
              return false;
            }

            return true;
          })
          .sort((left, right) => {
            const placedDiff = left.placedAt.getTime() - right.placedAt.getTime();
            return placedDiff !== 0 ? placedDiff : left.startsAt.getTime() - right.startsAt.getTime();
          })
          .map((entry) => entryWithRelations(entry));
      },
      async findUnique(args: { where: { id: string } }) {
        const entry = findEntry(args.where.id);
        return entry ? entryWithRelations(entry) : null;
      },
      async findUniqueOrThrow(args: { where: { id: string } }) {
        const entry = findEntry(args.where.id);
        if (!entry) {
          throw new Error("waitlist entry missing");
        }
        return entryWithRelations(entry);
      },
      async updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }) {
        const target = state.entries.find((entry) => {
          if (args.where.id && entry.id !== args.where.id) {
            return false;
          }

          if (args.where.status && entry.status !== args.where.status) {
            return false;
          }

          const expires = args.where.offerExpiresAt as { gt?: Date; lte?: Date } | undefined;
          if (expires?.gt && (!entry.offerExpiresAt || !(entry.offerExpiresAt > expires.gt))) {
            return false;
          }

          if (expires?.lte && (!entry.offerExpiresAt || !(entry.offerExpiresAt <= expires.lte))) {
            return false;
          }

          return true;
        });

        if (!target) {
          return { count: 0 };
        }

        target.status = (args.data.status as WaitlistStatus) ?? target.status;
        target.offeredAt = (args.data.offeredAt as Date | null | undefined) ?? target.offeredAt;
        target.offerExpiresAt = (args.data.offerExpiresAt as Date | null | undefined) ?? target.offerExpiresAt;
        return { count: 1 };
      },
    },
    async $queryRawUnsafe(_query: string, lockKey: unknown) {
      if (lockManager) {
        await lockManager.acquire(ownerId, String(lockKey));
      }

      if (pauseAfterFirstLock && !paused) {
        paused = true;
        await waitForResume;
      }

      return [];
    },
  };

  const rootClient = {
    waitlistEntry: {
      findMany: transactionClient.waitlistEntry.findMany,
    },
    async $transaction<T>(callback: (client: typeof transactionClient) => Promise<T>) {
      try {
        return await callback(transactionClient);
      } finally {
        lockManager?.releaseAll(ownerId);
      }
    },
  };

  return {
    state,
    room,
    organization,
    rootClient,
    transactionClient,
    resumeLock() {
      resumeLock();
    },
  };
}

test("creates a waitlist entry for an active organization membership", async () => {
  const harness = createRootClient({ entries: [] });

  const entry = await createWaitlistEntry(
    {
      organizationId,
      roomId,
      usageTypeId,
      title: "Wunschtraining",
      startsAt: slotStart,
      endsAt: slotEnd,
    },
    actorUserId,
    {
      hasRequestBookingPermission: true,
      isAdmin: false,
    },
    harness.rootClient as never,
  );

  assert.equal(entry.status, "ACTIVE");
  assert.equal(harness.state.entries[0]?.title, "Wunschtraining");
});

test("blocks waitlist creation for organizations without active membership", async () => {
  const harness = createRootClient({ entries: [], hasMembership: false });

  await assert.rejects(
    () =>
      createWaitlistEntry(
        {
          organizationId,
          roomId,
          usageTypeId,
          title: "Training",
          startsAt: slotStart,
          endsAt: slotEnd,
        },
        actorUserId,
        {
          hasRequestBookingPermission: true,
          isAdmin: false,
        },
        harness.rootClient as never,
      ),
    /fuer diese Organisation keine Buchung beantragen/,
  );
});

test("blocks waitlist creation for blocked organizations", async () => {
  const harness = createRootClient({
    entries: [],
    organization: makeOrganization("BLOCKED"),
  });

  await assert.rejects(
    () =>
      createWaitlistEntry(
        {
          organizationId,
          roomId,
          usageTypeId,
          title: "Training",
          startsAt: slotStart,
          endsAt: slotEnd,
        },
        actorUserId,
        {
          hasRequestBookingPermission: true,
          isAdmin: false,
        },
        harness.rootClient as never,
      ),
    /gesperrt oder fuer Wartelistenplaetze nicht aktiv/,
  );
});

test("offers the earliest matching waitlist entry first, writes notification payload and sets a 48-hour deadline", async () => {
  const firstPlacedAt = new Date("2026-05-20T08:00:00Z");
  const secondPlacedAt = new Date("2026-05-20T09:00:00Z");
  const now = new Date("2026-05-27T12:00:00Z");
  const harness = createRootClient({
    entries: [
      makeWaitlistEntry({ id: "waitlist-1", placedAt: secondPlacedAt }),
      makeWaitlistEntry({ id: "waitlist-2", placedAt: firstPlacedAt }),
    ],
  });

  const offered = await activateNextWaitlistEntryForSlot(
    {
      roomId,
      blockedFrom: slotStart,
      blockedUntil: slotEnd,
    },
    {
      client: harness.transactionClient as never,
      now,
    },
  );

  assert.equal(offered?.id, "waitlist-2");
  assert.equal(harness.state.entries.find((entry) => entry.id === "waitlist-2")?.status, "OFFERED");
  assert.deepEqual(
    harness.state.entries.find((entry) => entry.id === "waitlist-2")?.offerExpiresAt,
    new Date("2026-05-29T12:00:00Z"),
  );
  assert.deepEqual(harness.state.notifications[0], {
    bookingId: null,
    waitlistEntryId: "waitlist-2",
    recipientUserId: actorUserId,
    recipient: "max@example.com",
    eventCode: "WAITLIST_OFFER_CREATED",
    payload: {
      waitlistEntryId: "waitlist-2",
      title: "Training",
      organizationName: "Verein",
      buildingName: "Sporthalle",
      roomName: "Turnsaal",
      startsAt: slotStart.toISOString(),
      endsAt: slotEnd.toISOString(),
      offerExpiresAt: "2026-05-29T12:00:00.000Z",
    },
  });
});

test("accepting a valid offer creates a new REQUESTED booking", async () => {
  const harness = createRootClient({
    entries: [
      makeWaitlistEntry({
        id: "waitlist-offer",
        status: "OFFERED",
        offeredAt: requestNow,
        offerExpiresAt: new Date("2099-05-29T12:00:00Z"),
      }),
    ],
  });

  const result = await acceptWaitlistOffer(
    "waitlist-offer",
    actorUserId,
    {
      hasRequestBookingPermission: true,
      isAdmin: false,
    },
    harness.rootClient as never,
  );

  assert.equal(result.waitlistEntry.status, "ACCEPTED");
  assert.equal(harness.state.bookingCreates.length, 1);
  assert.equal(harness.state.historyCreates[0]?.newStatus, "REQUESTED");
});

test("rejects acceptance of an expired waitlist offer", async () => {
  const harness = createRootClient({
    entries: [
      makeWaitlistEntry({
        id: "waitlist-expired",
        status: "OFFERED",
        offeredAt: requestNow,
        offerExpiresAt: new Date("2020-05-26T11:59:00Z"),
      }),
    ],
  });

  await assert.rejects(
    () =>
      acceptWaitlistOffer(
        "waitlist-expired",
        actorUserId,
        {
          hasRequestBookingPermission: true,
          isAdmin: false,
        },
        harness.rootClient as never,
      ),
    /nicht mehr gueltig/,
  );
});

test("declining an offer activates the next waitlist position", async () => {
  const harness = createRootClient({
    entries: [
      makeWaitlistEntry({
        id: "waitlist-offer",
        status: "OFFERED",
        offeredAt: requestNow,
        offerExpiresAt: new Date("2099-05-29T12:00:00Z"),
        placedAt: new Date("2026-05-20T08:00:00Z"),
      }),
      makeWaitlistEntry({
        id: "waitlist-next",
        status: "ACTIVE",
        placedAt: new Date("2026-05-20T09:00:00Z"),
      }),
    ],
  });

  const declined = await declineWaitlistOffer(
    "waitlist-offer",
    actorUserId,
    {
      hasRequestBookingPermission: true,
      isAdmin: false,
    },
    harness.rootClient as never,
  );

  assert.equal(declined.status, "DECLINED");
  assert.equal(harness.state.entries.find((entry) => entry.id === "waitlist-next")?.status, "OFFERED");
});

test("does not allow waitlist creation without REQUEST_BOOKING", async () => {
  const harness = createRootClient({ entries: [] });

  await assert.rejects(
    () =>
      createWaitlistEntry(
        {
          organizationId,
          roomId,
          usageTypeId,
          title: "Training",
          startsAt: slotStart,
          endsAt: slotEnd,
        },
        actorUserId,
        {
          hasRequestBookingPermission: false,
          isAdmin: false,
        },
        harness.rootClient as never,
      ),
    BookingValidationError,
  );
});

test("prevents duplicate active waitlist processing during parallel acceptance", async () => {
  const lockManager = createAdvisoryLockManager();
  const sharedState = {
    entries: [
      makeWaitlistEntry({
        id: "waitlist-offer",
        status: "OFFERED",
        offeredAt: requestNow,
        offerExpiresAt: new Date("2099-05-29T12:00:00Z"),
      }),
    ],
    notifications: [] as Array<Record<string, unknown>>,
    bookingCreates: [] as Array<Record<string, unknown>>,
    historyCreates: [] as Array<Record<string, unknown>>,
  };
  const firstHarness = createRootClient({
    entries: sharedState.entries,
    ownerId: "accept-1",
    lockManager,
    pauseAfterFirstLock: true,
    sharedState,
  });
  const secondHarness = createRootClient({
    entries: sharedState.entries,
    ownerId: "accept-2",
    lockManager,
    sharedState,
  });

  const firstAccept = acceptWaitlistOffer(
    "waitlist-offer",
    actorUserId,
    { hasRequestBookingPermission: true, isAdmin: false },
    firstHarness.rootClient as never,
  );
  await lockManager.waitForOwner("accept-1");

  const secondAccept = assert.rejects(
    () =>
      acceptWaitlistOffer(
        "waitlist-offer",
        actorUserId,
        { hasRequestBookingPermission: true, isAdmin: false },
        secondHarness.rootClient as never,
      ),
    /zwischenzeitlich geaendert|nicht mehr gueltig/,
  );

  firstHarness.resumeLock();
  const accepted = await firstAccept;
  assert.equal(accepted.waitlistEntry.status, "ACCEPTED");
  await secondAccept;
  assert.equal(firstHarness.state.bookingCreates.length, 1);
});

test("serializes acceptance against expiry and keeps the accepted offer intact", async () => {
  const lockManager = createAdvisoryLockManager();
  const sharedState = {
    entries: [
      makeWaitlistEntry({
        id: "waitlist-offer",
        status: "OFFERED",
        offeredAt: requestNow,
        offerExpiresAt: new Date("2099-05-29T12:00:00Z"),
      }),
    ],
    notifications: [] as Array<Record<string, unknown>>,
    bookingCreates: [] as Array<Record<string, unknown>>,
    historyCreates: [] as Array<Record<string, unknown>>,
  };
  const acceptHarness = createRootClient({
    entries: sharedState.entries,
    ownerId: "accept-owner",
    lockManager,
    pauseAfterFirstLock: true,
    sharedState,
  });
  const expireHarness = createRootClient({
    entries: sharedState.entries,
    ownerId: "expire-owner",
    lockManager,
    sharedState,
  });

  const acceptPromise = acceptWaitlistOffer(
    "waitlist-offer",
    actorUserId,
    { hasRequestBookingPermission: true, isAdmin: false },
    acceptHarness.rootClient as never,
  );
  await lockManager.waitForOwner("accept-owner");

  const expiryPromise = expireWaitlistOffers(new Date("2099-05-29T12:00:00Z"), expireHarness.rootClient as never);
  acceptHarness.resumeLock();

  const accepted = await acceptPromise;
  const expiredIds = await expiryPromise;
  assert.equal(accepted.waitlistEntry.status, "ACCEPTED");
  assert.deepEqual(expiredIds, []);
  assert.equal(acceptHarness.state.entries[0]?.status, "ACCEPTED");
});

test("respects setup buffer conflicts when offering a waitlist slot", async () => {
  const bufferCandidateStart = new Date("2026-06-10T20:20:00Z");
  const bufferCandidateEnd = new Date("2026-06-10T21:00:00Z");
  const harness = createRootClient({
    entries: [
      makeWaitlistEntry({
        id: "buffer-candidate",
        startsAt: bufferCandidateStart,
        endsAt: bufferCandidateEnd,
      }),
    ],
    conflictingBookings: [
      {
        id: "approved-buffer-block",
        roomId,
        title: "Vorbelegung",
        status: "APPROVED",
        blockedFrom: new Date("2026-06-10T20:00:00Z"),
        blockedUntil: new Date("2026-06-10T20:10:00Z"),
      },
    ],
  });

  const offered = await activateNextWaitlistEntryForSlot(
    {
      roomId,
      blockedFrom: new Date("2026-06-10T19:30:00Z"),
      blockedUntil: new Date("2026-06-10T21:15:00Z"),
    },
    {
      client: harness.transactionClient as never,
      now: requestNow,
    },
  );

  assert.equal(offered, null);
  assert.equal(harness.state.entries[0]?.status, "ACTIVE");
});

test("evaluates waitlist and booking conflicts identically for buffer-sensitive slots", async () => {
  const candidateStart = new Date("2026-06-10T20:00:00Z");
  const candidateEnd = new Date("2026-06-10T20:30:00Z");
  const conflictingBookings: ConflictBooking[] = [
    {
      id: "approved-buffer-block",
      roomId,
      title: "Vorbelegung",
      status: "APPROVED",
      blockedFrom: new Date("2026-06-10T20:00:00Z"),
      blockedUntil: new Date("2026-06-10T20:10:00Z"),
    },
  ];
  const harness = createRootClient({
    entries: [
      makeWaitlistEntry({
        id: "buffer-candidate",
        startsAt: candidateStart,
        endsAt: candidateEnd,
      }),
    ],
    conflictingBookings,
  });

  const offered = await activateNextWaitlistEntryForSlot(
    {
      roomId,
      blockedFrom: new Date("2026-06-10T19:00:00Z"),
      blockedUntil: new Date("2026-06-10T21:00:00Z"),
    },
    {
      client: harness.transactionClient as never,
      now: requestNow,
    },
  );

  await assert.rejects(
    () =>
      createBookingRequest(
        {
          organizationId,
          roomId,
          usageTypeId,
          title: "Training",
          startsAt: candidateStart,
          endsAt: candidateEnd,
        },
        actorUserId,
        {
          client: harness.transactionClient as never,
          now: requestNow,
          permissions: {
            hasRequestBookingPermission: true,
            isAdmin: false,
          },
        },
      ),
    /Vorbelegung/,
  );

  assert.equal(offered, null);
});

test("expires old offers and activates the next queue position", async () => {
  const sharedEntries = [
    makeWaitlistEntry({
      id: "waitlist-expiring",
      status: "OFFERED",
      offeredAt: requestNow,
      offerExpiresAt: new Date("2026-05-27T12:00:00Z"),
      placedAt: new Date("2026-05-20T08:00:00Z"),
    }),
    makeWaitlistEntry({
      id: "waitlist-next",
      status: "ACTIVE",
      placedAt: new Date("2026-05-20T09:00:00Z"),
    }),
  ];
  const harness = createRootClient({
    entries: sharedEntries,
  });

  const expiredIds = await expireWaitlistOffers(new Date("2026-05-27T12:00:00Z"), harness.rootClient as never);

  assert.deepEqual(expiredIds, ["waitlist-expiring"]);
  assert.equal(harness.state.entries.find((entry) => entry.id === "waitlist-expiring")?.status, "EXPIRED");
  assert.equal(harness.state.entries.find((entry) => entry.id === "waitlist-next")?.status, "OFFERED");
});
