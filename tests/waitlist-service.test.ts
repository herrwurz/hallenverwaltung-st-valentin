import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../lib/prisma";
import { BookingValidationError } from "../lib/services/booking-rules";
import {
  acceptWaitlistOffer,
  activateNextWaitlistEntryForSlot,
  createWaitlistEntry,
  declineWaitlistOffer,
} from "../lib/services/waitlist-service";

const roomId = "room-1";
const buildingId = "building-1";
const organizationId = "organization-1";
const usageTypeId = "usage-1";
const actorUserId = "user-1";
const requestNow = new Date("2026-05-27T12:00:00Z");
const slotStart = new Date("2026-06-10T18:00:00Z");
const slotEnd = new Date("2026-06-10T20:00:00Z");

type WaitlistEntryRecord = {
  id: string;
  organizationId: string;
  roomId: string;
  usageTypeId: string;
  requestedByUserId: string | null;
  title: string;
  startsAt: Date;
  endsAt: Date;
  status: "ACTIVE" | "OFFERED" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "CANCELLED";
  placedAt: Date;
  offeredAt: Date | null;
  offerExpiresAt: Date | null;
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

function makeRoom() {
  return {
    id: roomId,
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
    },
  };
}

function makeOrganization(status: "ACTIVE" | "BLOCKED" | "INACTIVE" = "ACTIVE") {
  return {
    id: organizationId,
    status,
    canRequestBookings: true,
  };
}

function makeState(entries: WaitlistEntryRecord[]) {
  const notifications: Array<Record<string, unknown>> = [];
  const bookingCreates: Array<Record<string, unknown>> = [];
  const historyCreates: Array<Record<string, unknown>> = [];

  const state = {
    entries: entries.map((entry) => ({ ...entry })),
    notifications,
    bookingCreates,
    historyCreates,
  };

  function findEntry(id: string) {
    return state.entries.find((entry) => entry.id === id) ?? null;
  }

  const tx = {
    organization: {
      async findUnique() {
        return makeOrganization();
      },
    },
    organizationMember: {
      async findFirst() {
        return { id: "member-1" };
      },
    },
    room: {
      async findUnique() {
        return makeRoom();
      },
    },
    usageType: {
      async findUnique() {
        return { id: usageTypeId };
      },
    },
    roomComposition: {
      async findMany() {
        return [];
      },
    },
    booking: {
      async findMany() {
        return [];
      },
      async create(args: { data: Record<string, unknown> }) {
        bookingCreates.push(args.data);
        return {
          id: "booking-1",
          organizationId,
          roomId,
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
    },
    closure: {
      async findMany() {
        return [];
      },
    },
    bookingStatusHistory: {
      async create(args: { data: Record<string, unknown> }) {
        historyCreates.push(args.data);
        return args.data;
      },
    },
    notification: {
      async create(args: { data: Record<string, unknown> }) {
        notifications.push(args.data);
        return args.data;
      },
    },
    waitlistEntry: {
      async create(args: { data: Record<string, unknown> }) {
        const created = makeWaitlistEntry({
          id: "waitlist-created",
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
        return {
          ...created,
          organization: { id: organizationId, name: "Verein" },
          room: { ...makeRoom(), building: { id: buildingId, isActive: true, name: "Halle" } },
          usageType: { id: usageTypeId, name: "Training" },
        };
      },
      async findFirst(args: { where: Record<string, unknown> }) {
        const where = args.where;
        const roomIds = ((where.roomId as { in?: string[] })?.in) ?? [];
        const startsAt = (where.startsAt as { lt?: Date })?.lt;
        const endsAt = (where.endsAt as { gt?: Date })?.gt;
        const expiresAfter = (where.offerExpiresAt as { gt?: Date })?.gt;

        return (
          state.entries.find((entry) => {
            if (where.status && entry.status !== where.status) {
              return false;
            }

            if (roomIds.length > 0 && !roomIds.includes(entry.roomId)) {
              return false;
            }

            if (startsAt && !(entry.startsAt < startsAt)) {
              return false;
            }

            if (endsAt && !(entry.endsAt > endsAt)) {
              return false;
            }

            if (expiresAfter && (!entry.offerExpiresAt || !(entry.offerExpiresAt > expiresAfter))) {
              return false;
            }

            return true;
          }) ?? null
        );
      },
      async findMany(args: { where: Record<string, unknown> }) {
        const where = args.where;
        const roomIds = ((where.roomId as { in?: string[] })?.in) ?? [];
        const startsAt = (where.startsAt as { lt?: Date })?.lt;
        const endsAt = (where.endsAt as { gt?: Date })?.gt;
        const status = where.status as WaitlistEntryRecord["status"] | undefined;

        return state.entries
          .filter((entry) => {
            if (status && entry.status !== status) {
              return false;
            }

            if (roomIds.length > 0 && !roomIds.includes(entry.roomId)) {
              return false;
            }

            if (startsAt && !(entry.startsAt < startsAt)) {
              return false;
            }

            if (endsAt && !(entry.endsAt > endsAt)) {
              return false;
            }

            return true;
          })
          .sort((left, right) => left.placedAt.getTime() - right.placedAt.getTime())
          .map((entry) => ({
            ...entry,
            organization: { id: organizationId, name: "Verein", status: "ACTIVE", canRequestBookings: true },
            room: {
              ...makeRoom(),
              building: {
                id: buildingId,
                isActive: true,
                name: "Sporthalle",
              },
            },
            usageType: { id: usageTypeId, name: "Training" },
            requestedBy: {
              id: actorUserId,
              displayName: "Max Mustermann",
              email: "max@example.com",
            },
          }));
      },
      async updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }) {
        const where = args.where;
        const target = state.entries.find((entry) => {
          if (where.id && entry.id !== where.id) {
            return false;
          }

          if (where.status && entry.status !== where.status) {
            return false;
          }

          if (where.offerExpiresAt && "gt" in (where.offerExpiresAt as object)) {
            const compare = (where.offerExpiresAt as { gt: Date }).gt;
            if (!entry.offerExpiresAt || !(entry.offerExpiresAt > compare)) {
              return false;
            }
          }

          if (where.offerExpiresAt && "lte" in (where.offerExpiresAt as object)) {
            const compare = (where.offerExpiresAt as { lte: Date }).lte;
            if (!entry.offerExpiresAt || !(entry.offerExpiresAt <= compare)) {
              return false;
            }
          }

          return true;
        });

        if (!target) {
          return { count: 0 };
        }

        target.status = (args.data.status as WaitlistEntryRecord["status"]) ?? target.status;
        target.offeredAt = (args.data.offeredAt as Date | null | undefined) ?? target.offeredAt;
        target.offerExpiresAt = (args.data.offerExpiresAt as Date | null | undefined) ?? target.offerExpiresAt;
        return { count: 1 };
      },
      async findUnique(args: { where: { id: string } }) {
        const entry = findEntry(args.where.id);
        if (!entry) {
          return null;
        }

        return {
          ...entry,
          room: {
            ...makeRoom(),
            building: {
              id: buildingId,
              isActive: true,
            },
          },
        };
      },
      async findUniqueOrThrow(args: { where: { id: string } }) {
        const entry = findEntry(args.where.id);
        if (!entry) {
          throw new Error("waitlist entry missing");
        }

        return {
          ...entry,
          organization: { id: organizationId, name: "Verein" },
          room: {
            ...makeRoom(),
            building: {
              id: buildingId,
              isActive: true,
              name: "Sporthalle",
            },
          },
          usageType: { id: usageTypeId, name: "Training" },
        };
      },
    },
    async $queryRawUnsafe() {
      return [];
    },
  };

  return { state, tx };
}

async function withMockedTransaction<T>(tx: object, run: () => Promise<T>) {
  const original = prisma.$transaction.bind(prisma);
  (prisma as unknown as { $transaction: typeof prisma.$transaction }).$transaction = (async (
    callback: (client: object) => Promise<T>,
  ) => callback(tx)) as typeof prisma.$transaction;

  try {
    return await run();
  } finally {
    (prisma as unknown as { $transaction: typeof prisma.$transaction }).$transaction = original;
  }
}

test("creates a waitlist entry for an active organization membership", async () => {
  const { state, tx } = makeState([]);

  const entry = await withMockedTransaction(tx, () =>
    createWaitlistEntry(
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
    ),
  );

  assert.equal(entry.status, "ACTIVE");
  assert.equal(state.entries[0]?.title, "Wunschtraining");
});

test("blocks waitlist creation for organizations without active membership", async () => {
  const { tx } = makeState([]);
  tx.organizationMember.findFirst = (async () => null) as never;

  await assert.rejects(
    () =>
      withMockedTransaction(tx, () =>
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
        ),
      ),
    /fuer diese Organisation keine Buchung beantragen/,
  );
});

test("blocks waitlist creation for blocked organizations", async () => {
  const { tx } = makeState([]);
  tx.organization.findUnique = (async () => makeOrganization("BLOCKED")) as never;

  await assert.rejects(
    () =>
      withMockedTransaction(tx, () =>
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
        ),
      ),
    /gesperrt oder fuer Wartelistenplaetze nicht aktiv/,
  );
});

test("offers the earliest matching waitlist entry first and sets a 48-hour deadline", async () => {
  const firstPlacedAt = new Date("2026-05-20T08:00:00Z");
  const secondPlacedAt = new Date("2026-05-20T09:00:00Z");
  const now = new Date("2026-05-27T12:00:00Z");
  const { state, tx } = makeState([
    makeWaitlistEntry({ id: "waitlist-1", placedAt: secondPlacedAt }),
    makeWaitlistEntry({ id: "waitlist-2", placedAt: firstPlacedAt }),
  ]);

  const offered = await activateNextWaitlistEntryForSlot(
    {
      roomId,
      blockedFrom: slotStart,
      blockedUntil: slotEnd,
    },
    {
      client: tx as never,
      now,
    },
  );

  assert.equal(offered?.id, "waitlist-2");
  assert.equal(state.entries.find((entry) => entry.id === "waitlist-2")?.status, "OFFERED");
  assert.deepEqual(state.entries.find((entry) => entry.id === "waitlist-2")?.offerExpiresAt, new Date("2026-05-29T12:00:00Z"));
});

test("accepting a valid offer creates a new REQUESTED booking", async () => {
  const { state, tx } = makeState([
    makeWaitlistEntry({
      id: "waitlist-offer",
      status: "OFFERED",
      offeredAt: requestNow,
      offerExpiresAt: new Date("2026-05-29T12:00:00Z"),
    }),
  ]);

  const result = await withMockedTransaction(tx, () =>
    acceptWaitlistOffer("waitlist-offer", actorUserId, {
      hasRequestBookingPermission: true,
      isAdmin: false,
    }),
  );

  assert.equal(result.waitlistEntry.status, "ACCEPTED");
  assert.equal(state.bookingCreates.length, 1);
  assert.equal(state.historyCreates[0]?.newStatus, "REQUESTED");
});

test("rejects acceptance of an expired waitlist offer", async () => {
  const { tx } = makeState([
    makeWaitlistEntry({
      id: "waitlist-expired",
      status: "OFFERED",
      offeredAt: requestNow,
      offerExpiresAt: new Date("2026-05-26T11:59:00Z"),
    }),
  ]);

  await assert.rejects(
    () =>
      withMockedTransaction(tx, () =>
        acceptWaitlistOffer("waitlist-expired", actorUserId, {
          hasRequestBookingPermission: true,
          isAdmin: false,
        }),
      ),
    /nicht mehr gueltig/,
  );
});

test("declining an offer activates the next waitlist position", async () => {
  const { state, tx } = makeState([
    makeWaitlistEntry({
      id: "waitlist-offer",
      status: "OFFERED",
      offeredAt: requestNow,
      offerExpiresAt: new Date("2026-05-29T12:00:00Z"),
      placedAt: new Date("2026-05-20T08:00:00Z"),
    }),
    makeWaitlistEntry({
      id: "waitlist-next",
      status: "ACTIVE",
      placedAt: new Date("2026-05-20T09:00:00Z"),
    }),
  ]);

  const declined = await withMockedTransaction(tx, () =>
    declineWaitlistOffer("waitlist-offer", actorUserId, {
      hasRequestBookingPermission: true,
      isAdmin: false,
    }),
  );

  assert.equal(declined.status, "DECLINED");
  assert.equal(state.entries.find((entry) => entry.id === "waitlist-next")?.status, "OFFERED");
});

test("does not allow waitlist creation without REQUEST_BOOKING", async () => {
  const { tx } = makeState([]);

  await assert.rejects(
    () =>
      withMockedTransaction(tx, () =>
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
        ),
      ),
    BookingValidationError,
  );
});
