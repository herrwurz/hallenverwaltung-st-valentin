import type { BookingStatus, ClosureStatus, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getPublicCalendarVisibilityMode,
  type PublicCalendarVisibilityMode,
} from "@/lib/services/calendar-settings-service";
import { getBookingConflictRoomIds } from "@/lib/services/booking-conflict-service";
import type { CalendarEventStatus } from "@/lib/calendar-status";

export type CalendarView = "day" | "week";

export type CalendarQuery = {
  date?: string | Date;
  view?: CalendarView;
  buildingId?: string;
  roomId?: string;
};

type CalendarServiceClient = Pick<
  PrismaClient,
  "building" | "room" | "roomComposition" | "booking" | "closure" | "organizationMember" | "systemSetting"
>;

type CalendarRoom = {
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
  building: {
    id: string;
    name: string;
    isActive: boolean;
  };
};

type CalendarBooking = {
  id: string;
  organizationId: string;
  roomId: string;
  title: string;
  status: BookingStatus;
  startsAt: Date;
  endsAt: Date;
  blockedFrom: Date;
  blockedUntil: Date;
  organization: {
    id: string;
    name: string;
  };
  room: CalendarRoom;
};

type CalendarClosure = {
  id: string;
  buildingId: string | null;
  roomId: string | null;
  status: ClosureStatus;
  reason: string;
  startsAt: Date;
  endsAt: Date;
  isPublic: boolean;
  building: {
    id: string;
    name: string;
  } | null;
  room: {
    id: string;
    name: string;
    building: {
      id: string;
      name: string;
      isActive: boolean;
    };
  } | null;
};

export type CalendarEvent = {
  id: string;
  sourceType: "booking" | "closure";
  status: CalendarEventStatus;
  title: string;
  subtitle: string | null;
  startsAt: Date;
  endsAt: Date;
  blockedFrom: Date;
  blockedUntil: Date;
  buildingId: string;
  buildingName: string;
  roomId: string | null;
  roomName: string | null;
  organizationName: string | null;
  isOwn: boolean;
  visibility: "full" | "limited" | "occupied_only";
};

export type CalendarFilterOption = {
  id: string;
  name: string;
  rooms: Array<{ id: string; name: string }>;
};

export type CalendarDay = {
  key: string;
  label: string;
  date: Date;
};

export type CalendarResult = {
  selectedDate: string;
  view: CalendarView;
  rangeStart: Date;
  rangeEnd: Date;
  days: CalendarDay[];
  filters: {
    buildingId?: string;
    roomId?: string;
  };
  buildings: CalendarFilterOption[];
  events: CalendarEvent[];
};

export type FreeSlot = {
  startsAt: Date;
  endsAt: Date;
};

export type FreeSlotResult = {
  room: {
    id: string;
    name: string;
    buildingName: string;
  };
  date: string;
  openingStartsAt: Date;
  openingEndsAt: Date;
  freeSlots: FreeSlot[];
};

const bookingStatusesForCalendar: BookingStatus[] = ["REQUESTED", "IN_REVIEW", "APPROVED", "CANCELLED"];
const publicBookingStatusesForCalendar: BookingStatus[] = ["REQUESTED", "IN_REVIEW", "APPROVED"];
const bookingStatusesBlockingFreeSlots: BookingStatus[] = ["APPROVED"];
const closureStatusesBlocking: ClosureStatus[] = ["RESTRICTED", "CLOSED"];
const dayFormatter = new Intl.DateTimeFormat("de-AT", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});

function parseClockTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return { hours, minutes };
}

function toLocalDateKey(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseCalendarDateInput(input?: string | Date) {
  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate(), 0, 0, 0, 0);
  }

  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [year, month, day] = input.split("-").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function getRangeStart(date: Date, view: CalendarView) {
  if (view === "day") {
    return date;
  }

  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + mondayOffset, 0, 0, 0, 0);
}

function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount, date.getHours(), date.getMinutes(), 0, 0);
}

function buildDays(rangeStart: Date, view: CalendarView) {
  const dayCount = view === "day" ? 1 : 7;
  return Array.from({ length: dayCount }, (_, index) => {
    const date = addDays(rangeStart, index);
    return {
      key: toLocalDateKey(date),
      label: dayFormatter.format(date),
      date,
    };
  });
}

function getRangeEnd(rangeStart: Date, view: CalendarView) {
  return addDays(rangeStart, view === "day" ? 1 : 7);
}

function buildOpeningWindow(date: Date, room: Pick<CalendarRoom, "openingTime" | "closingTime">) {
  const opening = parseClockTime(room.openingTime);
  const closing = parseClockTime(room.closingTime);

  return {
    openingStartsAt: new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      opening.hours,
      opening.minutes,
      0,
      0,
    ),
    openingEndsAt: new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      closing.hours,
      closing.minutes,
      0,
      0,
    ),
  };
}

function mergeIntervals(intervals: Array<{ startsAt: Date; endsAt: Date }>) {
  const sorted = [...intervals]
    .filter((interval) => interval.startsAt < interval.endsAt)
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());

  if (sorted.length === 0) {
    return [];
  }

  const merged = [sorted[0]!];
  for (const interval of sorted.slice(1)) {
    const last = merged[merged.length - 1]!;
    if (interval.startsAt <= last.endsAt) {
      last.endsAt = new Date(Math.max(last.endsAt.getTime(), interval.endsAt.getTime()));
    } else {
      merged.push({ ...interval });
    }
  }

  return merged;
}

function subtractIntervals(
  openingStartsAt: Date,
  openingEndsAt: Date,
  blockedIntervals: Array<{ startsAt: Date; endsAt: Date }>,
) {
  const relevantBlocked = mergeIntervals(
    blockedIntervals.map((interval) => ({
      startsAt: new Date(Math.max(interval.startsAt.getTime(), openingStartsAt.getTime())),
      endsAt: new Date(Math.min(interval.endsAt.getTime(), openingEndsAt.getTime())),
    })),
  ).filter((interval) => interval.startsAt < interval.endsAt);

  const freeSlots: FreeSlot[] = [];
  let cursor = openingStartsAt;

  for (const blocked of relevantBlocked) {
    if (cursor < blocked.startsAt) {
      freeSlots.push({ startsAt: cursor, endsAt: blocked.startsAt });
    }

    if (cursor < blocked.endsAt) {
      cursor = blocked.endsAt;
    }
  }

  if (cursor < openingEndsAt) {
    freeSlots.push({ startsAt: cursor, endsAt: openingEndsAt });
  }

  return freeSlots;
}

function mapBookingStatus(status: BookingStatus): CalendarEventStatus | null {
  switch (status) {
    case "REQUESTED":
    case "IN_REVIEW":
    case "APPROVED":
    case "CANCELLED":
      return status;
    default:
      return null;
  }
}

async function loadCalendarFilters(client: CalendarServiceClient) {
  const buildings = await client.building.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      rooms: {
        where: {
          status: { in: ["ACTIVE", "RESTRICTED"] },
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return buildings.map((building) => ({
    id: building.id,
    name: building.name,
    rooms: building.rooms.map((room) => ({ id: room.id, name: room.name })),
  }));
}

async function resolveRoomScope({
  buildingId,
  roomId,
  client,
}: {
  buildingId?: string;
  roomId?: string;
  client: CalendarServiceClient;
}) {
  if (roomId) {
    const [selectedRoom, conflictRoomIds] = await Promise.all([
      client.room.findUnique({
        where: { id: roomId },
        select: {
          buildingId: true,
        },
      }),
      getBookingConflictRoomIds(roomId, client),
    ]);

    return {
      roomIds: conflictRoomIds,
      buildingIds: selectedRoom ? [selectedRoom.buildingId] : [],
      selectedRoomId: roomId,
    };
  }

  const rooms = await client.room.findMany({
    where: {
      buildingId,
      status: { in: ["ACTIVE", "RESTRICTED"] },
      building: { isActive: true },
    },
    select: {
      id: true,
      buildingId: true,
    },
  });

  const buildingIds = buildingId
    ? [buildingId]
    : [...new Set(rooms.map((room) => room.buildingId))];

  return {
    roomIds: rooms.map((room) => room.id),
    buildingIds,
    selectedRoomId: undefined,
  };
}

async function loadCalendarRecords({
  client,
  rangeStart,
  rangeEnd,
  buildingId,
  roomId,
  bookingStatuses,
  publicClosuresOnly = false,
}: {
  client: CalendarServiceClient;
  rangeStart: Date;
  rangeEnd: Date;
  buildingId?: string;
  roomId?: string;
  bookingStatuses: BookingStatus[];
  publicClosuresOnly?: boolean;
}) {
  const { roomIds, buildingIds, selectedRoomId } = await resolveRoomScope({ client, buildingId, roomId });

  const bookingRoomFilter =
    roomIds.length > 0
      ? { in: roomIds }
      : selectedRoomId
        ? selectedRoomId
        : undefined;

  const closureScopeFilters: Array<Record<string, unknown>> = [];
  if (buildingIds.length > 0) {
    closureScopeFilters.push({ buildingId: { in: buildingIds } });
  }

  if (roomIds.length > 0) {
    closureScopeFilters.push({ roomId: { in: roomIds } });
  }

  const bookings = (await client.booking.findMany({
    where: {
      status: { in: bookingStatuses },
      blockedFrom: { lt: rangeEnd },
      blockedUntil: { gt: rangeStart },
      roomId: bookingRoomFilter,
      room: buildingId
        ? {
            buildingId,
          }
        : undefined,
    },
    select: {
      id: true,
      organizationId: true,
      roomId: true,
      title: true,
      status: true,
      startsAt: true,
      endsAt: true,
      blockedFrom: true,
      blockedUntil: true,
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
      room: {
        select: {
          id: true,
          name: true,
          status: true,
          buildingId: true,
          openingTime: true,
          closingTime: true,
          setupBufferMinutes: true,
          teardownBufferMinutes: true,
          publicShowOrganization: true,
          publicShowEventName: true,
          building: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
          },
        },
      },
    },
    orderBy: [{ blockedFrom: "asc" }, { startsAt: "asc" }],
  })) as CalendarBooking[];

  const closures = (await client.closure.findMany({
    where: {
      status: { in: closureStatusesBlocking },
      startsAt: { lt: rangeEnd },
      endsAt: { gt: rangeStart },
      isPublic: publicClosuresOnly ? true : undefined,
      OR: closureScopeFilters,
    },
    select: {
      id: true,
      buildingId: true,
      roomId: true,
      status: true,
      reason: true,
      startsAt: true,
      endsAt: true,
      isPublic: true,
      building: {
        select: {
          id: true,
          name: true,
        },
      },
      room: {
        select: {
          id: true,
          name: true,
          building: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
          },
        },
      },
    },
    orderBy: [{ startsAt: "asc" }],
  })) as CalendarClosure[];

  return { bookings, closures };
}

function toPortalBookingEvent(booking: CalendarBooking, ownOrganizationIds: Set<string>): CalendarEvent | null {
  const status = mapBookingStatus(booking.status);
  if (!status) {
    return null;
  }

  const isOwn = ownOrganizationIds.has(booking.organizationId);
  return {
    id: booking.id,
    sourceType: "booking",
    status,
    title: isOwn ? booking.title : "Fremde Buchung",
    subtitle: isOwn
      ? `${booking.organization.name} | ${booking.room.building.name} - ${booking.room.name}`
      : `${booking.room.building.name} - ${booking.room.name}`,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    blockedFrom: booking.blockedFrom,
    blockedUntil: booking.blockedUntil,
    buildingId: booking.room.building.id,
    buildingName: booking.room.building.name,
    roomId: booking.room.id,
    roomName: booking.room.name,
    organizationName: isOwn ? booking.organization.name : null,
    isOwn,
    visibility: isOwn ? "full" : "limited",
  };
}

function toAdminBookingEvent(booking: CalendarBooking): CalendarEvent | null {
  const status = mapBookingStatus(booking.status);
  if (!status) {
    return null;
  }

  return {
    id: booking.id,
    sourceType: "booking",
    status,
    title: booking.title,
    subtitle: `${booking.organization.name} | ${booking.room.building.name} - ${booking.room.name}`,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    blockedFrom: booking.blockedFrom,
    blockedUntil: booking.blockedUntil,
    buildingId: booking.room.building.id,
    buildingName: booking.room.building.name,
    roomId: booking.room.id,
    roomName: booking.room.name,
    organizationName: booking.organization.name,
    isOwn: false,
    visibility: "full",
  };
}

function resolvePublicTitle(booking: CalendarBooking, visibilityMode: PublicCalendarVisibilityMode) {
  if (visibilityMode === "event" && booking.room.publicShowEventName) {
    return booking.title;
  }

  if (visibilityMode !== "occupied_only" && booking.room.publicShowOrganization) {
    return booking.organization.name;
  }

  return "Belegt";
}

function toPublicBookingEvent(
  booking: CalendarBooking,
  visibilityMode: PublicCalendarVisibilityMode,
): CalendarEvent | null {
  const status = mapBookingStatus(booking.status);
  if (!status) {
    return null;
  }

  const title = resolvePublicTitle(booking, visibilityMode);
  const subtitle = `${booking.room.building.name} - ${booking.room.name}`;

  return {
    id: booking.id,
    sourceType: "booking",
    status,
    title,
    subtitle,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    blockedFrom: booking.blockedFrom,
    blockedUntil: booking.blockedUntil,
    buildingId: booking.room.building.id,
    buildingName: booking.room.building.name,
    roomId: booking.room.id,
    roomName: booking.room.name,
    organizationName: title === booking.organization.name ? booking.organization.name : null,
    isOwn: false,
    visibility: title === "Belegt" ? "occupied_only" : "limited",
  };
}

function toClosureEvent(closure: CalendarClosure): CalendarEvent {
  const buildingName = closure.room?.building.name ?? closure.building?.name ?? "Gebaeude";
  const buildingId = closure.room?.building.id ?? closure.building?.id ?? "";
  const roomName = closure.room?.name ?? null;
  const roomIdValue = closure.room?.id ?? closure.roomId ?? null;

  return {
    id: closure.id,
    sourceType: "closure",
    status: "CLOSURE",
    title: `Sperre: ${closure.reason}`,
    subtitle: roomName ? `${buildingName} - ${roomName}` : buildingName,
    startsAt: closure.startsAt,
    endsAt: closure.endsAt,
    blockedFrom: closure.startsAt,
    blockedUntil: closure.endsAt,
    buildingId,
    buildingName,
    roomId: roomIdValue,
    roomName,
    organizationName: null,
    isOwn: false,
    visibility: "full",
  };
}

function isCalendarEvent(event: CalendarEvent | null): event is CalendarEvent {
  return event !== null;
}

async function getPortalOrganizationIds(actorUserId: string, client: CalendarServiceClient) {
  const now = new Date();
  const memberships = await client.organizationMember.findMany({
    where: {
      userId: actorUserId,
      activeFrom: { lte: now },
      OR: [{ activeUntil: null }, { activeUntil: { gt: now } }],
    },
    select: {
      organizationId: true,
    },
  });

  return new Set(memberships.map((membership) => membership.organizationId));
}

async function buildCalendarResult({
  query,
  client,
  eventFactory,
  includeBookingStatuses = bookingStatusesForCalendar,
  publicClosuresOnly = false,
}: {
  query: CalendarQuery;
  client: CalendarServiceClient;
  eventFactory: (booking: CalendarBooking) => CalendarEvent | null;
  includeBookingStatuses?: BookingStatus[];
  publicClosuresOnly?: boolean;
}) {
  const selectedDate = parseCalendarDateInput(query.date);
  const view = query.view === "week" ? "week" : "day";
  const rangeStart = getRangeStart(selectedDate, view);
  const rangeEnd = getRangeEnd(rangeStart, view);
  const days = buildDays(rangeStart, view);
  const buildings = await loadCalendarFilters(client);
  const { bookings, closures } = await loadCalendarRecords({
    client,
    rangeStart,
    rangeEnd,
    buildingId: query.buildingId,
    roomId: query.roomId,
    bookingStatuses: includeBookingStatuses,
    publicClosuresOnly,
  });

  const events = [
    ...bookings.map(eventFactory).filter(isCalendarEvent),
    ...closures.map(toClosureEvent),
  ]
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());

  return {
    selectedDate: toLocalDateKey(selectedDate),
    view,
    rangeStart,
    rangeEnd,
    days,
    filters: {
      buildingId: query.buildingId,
      roomId: query.roomId,
    },
    buildings,
    events,
  } satisfies CalendarResult;
}

export async function getAdminCalendarEvents(
  query: CalendarQuery,
  client: CalendarServiceClient = prisma,
) {
  return buildCalendarResult({
    query,
    client,
    eventFactory: toAdminBookingEvent,
  });
}

export async function getPortalCalendarEvents(
  query: CalendarQuery,
  actorUserId: string,
  client: CalendarServiceClient = prisma,
) {
  const ownOrganizationIds = await getPortalOrganizationIds(actorUserId, client);
  return buildCalendarResult({
    query,
    client,
    eventFactory: (booking) => toPortalBookingEvent(booking, ownOrganizationIds),
  });
}

export async function getPublicCalendarEvents(
  query: CalendarQuery,
  client: CalendarServiceClient = prisma,
) {
  const visibilityMode = await getPublicCalendarVisibilityMode(client);
  return buildCalendarResult({
    query,
    client,
    eventFactory: (booking) => toPublicBookingEvent(booking, visibilityMode),
    includeBookingStatuses: publicBookingStatusesForCalendar,
    publicClosuresOnly: true,
  });
}

export async function getFreeSlots(
  {
    roomId,
    date,
  }: {
    roomId?: string;
    date?: string | Date;
  },
  client: CalendarServiceClient = prisma,
): Promise<FreeSlotResult | null> {
  if (!roomId) {
    return null;
  }

  const room = (await client.room.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      name: true,
      status: true,
      openingTime: true,
      closingTime: true,
      setupBufferMinutes: true,
      teardownBufferMinutes: true,
      publicShowOrganization: true,
      publicShowEventName: true,
      buildingId: true,
      building: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
    },
  })) as CalendarRoom | null;

  if (!room || !room.building.isActive || room.status === "OUT_OF_SERVICE") {
    return null;
  }

  const selectedDate = parseCalendarDateInput(date);
  const { openingStartsAt, openingEndsAt } = buildOpeningWindow(selectedDate, room);
  const conflictRoomIds = await getBookingConflictRoomIds(roomId, client);

  const [bookings, closures] = await Promise.all([
    client.booking.findMany({
      where: {
        roomId: { in: conflictRoomIds },
        status: { in: bookingStatusesBlockingFreeSlots },
        blockedFrom: { lt: openingEndsAt },
        blockedUntil: { gt: openingStartsAt },
      },
      select: {
        id: true,
        organizationId: true,
        roomId: true,
        title: true,
        status: true,
        startsAt: true,
        endsAt: true,
        blockedFrom: true,
        blockedUntil: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
            status: true,
            buildingId: true,
            openingTime: true,
            closingTime: true,
            setupBufferMinutes: true,
            teardownBufferMinutes: true,
            publicShowOrganization: true,
            publicShowEventName: true,
            building: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
        },
      },
    }),
    client.closure.findMany({
      where: {
        status: { in: closureStatusesBlocking },
        startsAt: { lt: openingEndsAt },
        endsAt: { gt: openingStartsAt },
        OR: [{ buildingId: room.building.id }, { roomId: { in: conflictRoomIds } }],
      },
      select: {
        id: true,
        buildingId: true,
        roomId: true,
        status: true,
        reason: true,
        startsAt: true,
        endsAt: true,
        isPublic: true,
        building: {
          select: {
            id: true,
            name: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
            building: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const blockedIntervals = [
    ...bookings.map((booking) => ({
      startsAt: booking.blockedFrom,
      endsAt: booking.blockedUntil,
    })),
    ...closures.map((closure) => ({
      startsAt: closure.startsAt,
      endsAt: closure.endsAt,
    })),
  ];

  return {
    room: {
      id: room.id,
      name: room.name,
      buildingName: room.building.name,
    },
    date: toLocalDateKey(selectedDate),
    openingStartsAt,
    openingEndsAt,
    freeSlots: subtractIntervals(openingStartsAt, openingEndsAt, blockedIntervals),
  };
}
