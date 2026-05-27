import assert from "node:assert/strict";
import test from "node:test";
import {
  getAdminCalendarEvents,
  getFreeSlots,
  getPortalCalendarEvents,
  getPublicCalendarEvents,
} from "../lib/services/calendar-service";

const calendarDate = "2026-06-10";
type BuildingRecord = {
  id: string;
  name: string;
  isActive: boolean;
};

type RoomRecord = {
  id: string;
  name: string;
  status: "ACTIVE" | "RESTRICTED" | "OUT_OF_SERVICE";
  buildingId: string;
  openingTime: string;
  closingTime: string;
  setupBufferMinutes: number;
  teardownBufferMinutes: number;
  publicShowOrganization: boolean;
  publicShowEventName: boolean;
};

type OrganizationRecord = {
  id: string;
  name: string;
};

type BookingRecord = {
  id: string;
  organizationId: string;
  roomId: string;
  title: string;
  status: "REQUESTED" | "IN_REVIEW" | "APPROVED" | "CANCELLED";
  startsAt: Date;
  endsAt: Date;
  blockedFrom: Date;
  blockedUntil: Date;
};

type ClosureRecord = {
  id: string;
  buildingId: string | null;
  roomId: string | null;
  status: "RESTRICTED" | "CLOSED";
  reason: string;
  startsAt: Date;
  endsAt: Date;
};

type MembershipRecord = {
  userId: string;
  organizationId: string;
  activeFrom: Date;
  activeUntil: Date | null;
};

type RoomLink = {
  parentRoomId: string;
  childRoomId: string;
};

function makeBuilding(overrides: Partial<BuildingRecord> = {}): BuildingRecord {
  return {
    id: "building-1",
    name: "Sporthalle",
    isActive: true,
    ...overrides,
  };
}

function makeRoom(overrides: Partial<RoomRecord> = {}): RoomRecord {
  return {
    id: "room-1",
    name: "Turnsaal",
    status: "ACTIVE",
    buildingId: "building-1",
    openingTime: "08:00",
    closingTime: "20:00",
    setupBufferMinutes: 15,
    teardownBufferMinutes: 15,
    publicShowOrganization: true,
    publicShowEventName: true,
    ...overrides,
  };
}

function makeOrganization(overrides: Partial<OrganizationRecord> = {}): OrganizationRecord {
  return {
    id: "organization-1",
    name: "Verein Blau",
    ...overrides,
  };
}

function makeBooking(overrides: Partial<BookingRecord> = {}): BookingRecord {
  return {
    id: "booking-1",
    organizationId: "organization-1",
    roomId: "room-1",
    title: "Volleyball Training",
    status: "APPROVED",
    startsAt: new Date("2026-06-10T18:00:00Z"),
    endsAt: new Date("2026-06-10T20:00:00Z"),
    blockedFrom: new Date("2026-06-10T17:45:00Z"),
    blockedUntil: new Date("2026-06-10T20:15:00Z"),
    ...overrides,
  };
}

function makeClosure(overrides: Partial<ClosureRecord> = {}): ClosureRecord {
  return {
    id: "closure-1",
    buildingId: null,
    roomId: "room-1",
    status: "CLOSED",
    reason: "Reinigung",
    startsAt: new Date("2026-06-10T12:00:00Z"),
    endsAt: new Date("2026-06-10T13:00:00Z"),
    ...overrides,
  };
}

function createCalendarClient({
  buildings = [makeBuilding()],
  rooms = [makeRoom()],
  organizations = [makeOrganization()],
  bookings = [],
  closures = [],
  memberships = [],
  roomLinks = [],
  visibilityMode,
}: {
  buildings?: BuildingRecord[];
  rooms?: RoomRecord[];
  organizations?: OrganizationRecord[];
  bookings?: BookingRecord[];
  closures?: ClosureRecord[];
  memberships?: MembershipRecord[];
  roomLinks?: RoomLink[];
  visibilityMode?: "occupied_only" | "organization" | "event";
} = {}) {
  const buildingById = new Map(buildings.map((building) => [building.id, building]));
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const organizationById = new Map(organizations.map((organization) => [organization.id, organization]));

  return {
    building: {
      async findMany(args: { where?: { isActive?: boolean } } = {}) {
        return buildings
          .filter((building) => (args.where?.isActive === undefined ? true : building.isActive === args.where.isActive))
          .map((building) => ({
            id: building.id,
            name: building.name,
            rooms: rooms
              .filter(
                (room) =>
                  room.buildingId === building.id &&
                  (room.status === "ACTIVE" || room.status === "RESTRICTED"),
              )
              .map((room) => ({
                id: room.id,
                name: room.name,
              })),
          }));
      },
    },
    room: {
      async findMany(args: { where?: Record<string, unknown> } = {}) {
        const buildingId = typeof args.where?.buildingId === "string" ? args.where.buildingId : undefined;
        const statusFilter = (args.where?.status as { in?: RoomRecord["status"][] } | undefined)?.in;
        const requireActiveBuilding = (args.where?.building as { isActive?: boolean } | undefined)?.isActive;

        return rooms
          .filter((room) => (buildingId ? room.buildingId === buildingId : true))
          .filter((room) => (statusFilter ? statusFilter.includes(room.status) : true))
          .filter((room) =>
            requireActiveBuilding === undefined
              ? true
              : buildingById.get(room.buildingId)?.isActive === requireActiveBuilding,
          )
          .map((room) => ({
            id: room.id,
            buildingId: room.buildingId,
          }));
      },
      async findUnique(args: { where: { id: string } }) {
        const room = roomById.get(args.where.id);
        if (!room) {
          return null;
        }

        const building = buildingById.get(room.buildingId);
        if (!building) {
          return null;
        }

        return {
          ...room,
          building: {
            id: building.id,
            name: building.name,
            isActive: building.isActive,
          },
        };
      },
    },
    roomComposition: {
      async findMany() {
        return roomLinks;
      },
    },
    booking: {
      async findMany(args: { where: Record<string, unknown> }) {
        const roomFilter = args.where.roomId as string | { in?: string[] } | undefined;
        const roomIds =
          typeof roomFilter === "string"
            ? [roomFilter]
            : roomFilter?.in ?? [];
        const statuses = ((args.where.status as { in?: BookingRecord["status"][] } | undefined)?.in) ?? [];
        const blockedFrom = (args.where.blockedFrom as { lt?: Date } | undefined)?.lt;
        const blockedUntil = (args.where.blockedUntil as { gt?: Date } | undefined)?.gt;
        const buildingId = ((args.where.room as { buildingId?: string } | undefined)?.buildingId) ?? undefined;

        return bookings
          .filter((booking) => (roomIds.length > 0 ? roomIds.includes(booking.roomId) : true))
          .filter((booking) => (statuses.length > 0 ? statuses.includes(booking.status) : true))
          .filter((booking) => (blockedFrom ? booking.blockedFrom < blockedFrom : true))
          .filter((booking) => (blockedUntil ? booking.blockedUntil > blockedUntil : true))
          .filter((booking) => {
            if (!buildingId) {
              return true;
            }

            return roomById.get(booking.roomId)?.buildingId === buildingId;
          })
          .map((booking) => {
            const room = roomById.get(booking.roomId)!;
            const building = buildingById.get(room.buildingId)!;
            const organization = organizationById.get(booking.organizationId)!;

            return {
              ...booking,
              organization,
              room: {
                ...room,
                building,
              },
            };
          });
      },
    },
    closure: {
      async findMany(args: { where: Record<string, unknown> }) {
        const statuses = ((args.where.status as { in?: ClosureRecord["status"][] } | undefined)?.in) ?? [];
        const startsAt = (args.where.startsAt as { lt?: Date } | undefined)?.lt;
        const endsAt = (args.where.endsAt as { gt?: Date } | undefined)?.gt;
        const scopeFilters = Array.isArray(args.where.OR) ? args.where.OR : [];

        return closures
          .filter((closure) => (statuses.length > 0 ? statuses.includes(closure.status) : true))
          .filter((closure) => (startsAt ? closure.startsAt < startsAt : true))
          .filter((closure) => (endsAt ? closure.endsAt > endsAt : true))
          .filter((closure) => {
            if (scopeFilters.length === 0) {
              return true;
            }

            return scopeFilters.some((filter) => {
              const buildingFilter = (filter as { buildingId?: { in?: string[] } | string }).buildingId;
              const roomFilter = (filter as { roomId?: { in?: string[] } }).roomId;

              if (typeof buildingFilter === "string") {
                return closure.buildingId === buildingFilter;
              }

              if (buildingFilter && "in" in buildingFilter) {
                return closure.buildingId !== null && (buildingFilter.in ?? []).includes(closure.buildingId);
              }

              if (roomFilter?.in) {
                return closure.roomId !== null && roomFilter.in.includes(closure.roomId);
              }

              return false;
            });
          })
          .map((closure) => ({
            ...closure,
            building: closure.buildingId ? buildingById.get(closure.buildingId) ?? null : null,
            room: closure.roomId
              ? (() => {
                  const room = roomById.get(closure.roomId);
                  if (!room) {
                    return null;
                  }

                  const building = buildingById.get(room.buildingId)!;
                  return {
                    id: room.id,
                    name: room.name,
                    building,
                  };
                })()
              : null,
          }));
      },
    },
    organizationMember: {
      async findMany(args: { where: { userId: string; activeFrom: { lte: Date } } }) {
        return memberships
          .filter((membership) => membership.userId === args.where.userId)
          .filter((membership) => membership.activeFrom <= args.where.activeFrom.lte)
          .filter((membership) => membership.activeUntil === null || membership.activeUntil > args.where.activeFrom.lte);
      },
    },
    systemSetting: {
      async findUnique() {
        return visibilityMode
          ? {
              value: {
                mode: visibilityMode,
              },
            }
          : null;
      },
    },
  };
}

test("admin calendar shows all booking details", async () => {
  const client = createCalendarClient({
    bookings: [makeBooking()],
  });

  const calendar = await getAdminCalendarEvents({ date: calendarDate }, client as never);

  assert.equal(calendar.events.length, 1);
  assert.equal(calendar.events[0]?.title, "Volleyball Training");
  assert.equal(calendar.events[0]?.subtitle, "Verein Blau | Sporthalle - Turnsaal");
});

test("portal calendar shows own details and limits foreign bookings", async () => {
  const client = createCalendarClient({
    organizations: [makeOrganization(), makeOrganization({ id: "organization-2", name: "Gastverein" })],
    memberships: [
      {
        userId: "user-1",
        organizationId: "organization-1",
        activeFrom: new Date("2026-01-01T00:00:00Z"),
        activeUntil: null,
      },
    ],
    bookings: [
      makeBooking({ id: "own-booking", title: "Eigenes Training" }),
      makeBooking({
        id: "foreign-booking",
        organizationId: "organization-2",
        title: "Gastturnier",
        startsAt: new Date("2026-06-10T20:30:00Z"),
        endsAt: new Date("2026-06-10T21:30:00Z"),
        blockedFrom: new Date("2026-06-10T20:15:00Z"),
        blockedUntil: new Date("2026-06-10T21:45:00Z"),
      }),
    ],
  });

  const calendar = await getPortalCalendarEvents({ date: calendarDate }, "user-1", client as never);
  const ownEvent = calendar.events.find((event) => event.id === "own-booking");
  const foreignEvent = calendar.events.find((event) => event.id === "foreign-booking");

  assert.equal(ownEvent?.title, "Eigenes Training");
  assert.equal(foreignEvent?.title, "Fremde Buchung");
  assert.equal(foreignEvent?.organizationName, null);
  assert.equal(foreignEvent?.visibility, "limited");
});

test("public calendar falls back to occupied or free when details are not allowed", async () => {
  const client = createCalendarClient({
    rooms: [
      makeRoom({
        publicShowEventName: false,
        publicShowOrganization: false,
      }),
    ],
    bookings: [makeBooking({ title: "Sommerfest" })],
    visibilityMode: "event",
  });

  const calendar = await getPublicCalendarEvents({ date: calendarDate }, client as never);

  assert.equal(calendar.events[0]?.title, "Belegt");
  assert.equal(calendar.events[0]?.visibility, "occupied_only");
});

test("public calendar uses occupied or free when the privacy mode is set accordingly", async () => {
  const client = createCalendarClient({
    bookings: [makeBooking({ title: "Sommerfest" })],
    visibilityMode: "occupied_only",
  });

  const calendar = await getPublicCalendarEvents({ date: calendarDate }, client as never);

  assert.equal(calendar.events[0]?.title, "Belegt");
  assert.equal(calendar.events[0]?.organizationName, null);
});

test("public calendar can show the organization name", async () => {
  const client = createCalendarClient({
    bookings: [makeBooking()],
    visibilityMode: "organization",
  });

  const calendar = await getPublicCalendarEvents({ date: calendarDate }, client as never);

  assert.equal(calendar.events[0]?.title, "Verein Blau");
  assert.equal(calendar.events[0]?.organizationName, "Verein Blau");
});

test("public calendar can show the event title", async () => {
  const client = createCalendarClient({
    bookings: [makeBooking({ title: "Sommerfest" })],
    visibilityMode: "event",
  });

  const calendar = await getPublicCalendarEvents({ date: calendarDate }, client as never);

  assert.equal(calendar.events[0]?.title, "Sommerfest");
});

test("public calendar does not include cancelled bookings", async () => {
  const client = createCalendarClient({
    bookings: [
      makeBooking({
        id: "cancelled-public",
        status: "CANCELLED",
      }),
    ],
    visibilityMode: "organization",
  });

  const calendar = await getPublicCalendarEvents({ date: calendarDate }, client as never);

  assert.equal(calendar.events.length, 0);
});

test("cancelled bookings do not block free slots", async () => {
  const client = createCalendarClient({
    bookings: [
      makeBooking({
        status: "CANCELLED",
        blockedFrom: new Date("2026-06-10T09:00:00Z"),
        blockedUntil: new Date("2026-06-10T11:00:00Z"),
      }),
    ],
  });

  const freeSlots = await getFreeSlots({ roomId: "room-1", date: calendarDate }, client as never);

  assert.equal(freeSlots?.freeSlots.length, 1);
  assert.equal(freeSlots?.freeSlots[0]?.startsAt.toISOString(), "2026-06-10T06:00:00.000Z");
  assert.equal(freeSlots?.freeSlots[0]?.endsAt.toISOString(), "2026-06-10T18:00:00.000Z");
});

test("approved bookings block free slots including buffer times", async () => {
  const client = createCalendarClient({
    bookings: [
      makeBooking({
        blockedFrom: new Date("2026-06-10T09:15:00Z"),
        blockedUntil: new Date("2026-06-10T11:45:00Z"),
        startsAt: new Date("2026-06-10T09:30:00Z"),
        endsAt: new Date("2026-06-10T11:30:00Z"),
      }),
    ],
  });

  const freeSlots = await getFreeSlots({ roomId: "room-1", date: calendarDate }, client as never);

  assert.equal(freeSlots?.freeSlots.length, 2);
  assert.equal(freeSlots?.freeSlots[0]?.endsAt.toISOString(), "2026-06-10T09:15:00.000Z");
  assert.equal(freeSlots?.freeSlots[1]?.startsAt.toISOString(), "2026-06-10T11:45:00.000Z");
});

test("closures block free slots", async () => {
  const client = createCalendarClient({
    closures: [
      makeClosure({
        buildingId: "building-1",
        roomId: null,
        startsAt: new Date("2026-06-10T13:00:00Z"),
        endsAt: new Date("2026-06-10T14:00:00Z"),
      }),
    ],
  });

  const freeSlots = await getFreeSlots({ roomId: "room-1", date: calendarDate }, client as never);

  assert.equal(freeSlots?.freeSlots.length, 2);
  assert.equal(freeSlots?.freeSlots[0]?.endsAt.toISOString(), "2026-06-10T13:00:00.000Z");
  assert.equal(freeSlots?.freeSlots[1]?.startsAt.toISOString(), "2026-06-10T14:00:00.000Z");
});

test("free slot calculation respects opening hours", async () => {
  const client = createCalendarClient({
    rooms: [
      makeRoom({
        openingTime: "10:00",
        closingTime: "18:00",
      }),
    ],
  });

  const freeSlots = await getFreeSlots({ roomId: "room-1", date: calendarDate }, client as never);

  assert.equal(freeSlots?.freeSlots.length, 1);
  assert.equal(freeSlots?.openingStartsAt.toISOString(), "2026-06-10T08:00:00.000Z");
  assert.equal(freeSlots?.openingEndsAt.toISOString(), "2026-06-10T16:00:00.000Z");
});

test("room filters include parent and child room conflicts in the calendar and free slots", async () => {
  const client = createCalendarClient({
    rooms: [
      makeRoom({ id: "room-parent", name: "Gesamthalle" }),
      makeRoom({ id: "room-child", name: "Teilraum", buildingId: "building-1" }),
    ],
    roomLinks: [{ parentRoomId: "room-parent", childRoomId: "room-child" }],
    bookings: [
      makeBooking({
        id: "parent-booking",
        roomId: "room-parent",
        title: "Gesamtbelegung",
        blockedFrom: new Date("2026-06-10T15:00:00Z"),
        blockedUntil: new Date("2026-06-10T16:30:00Z"),
        startsAt: new Date("2026-06-10T15:15:00Z"),
        endsAt: new Date("2026-06-10T16:15:00Z"),
      }),
    ],
  });

  const calendar = await getAdminCalendarEvents({ date: calendarDate, roomId: "room-child" }, client as never);
  const freeSlots = await getFreeSlots({ roomId: "room-child", date: calendarDate }, client as never);

  assert.equal(calendar.events.some((event) => event.title === "Gesamtbelegung"), true);
  assert.equal(
    freeSlots?.freeSlots.some(
      (slot) => slot.startsAt <= new Date("2026-06-10T15:30:00Z") && slot.endsAt >= new Date("2026-06-10T16:00:00Z"),
    ),
    false,
  );
});
