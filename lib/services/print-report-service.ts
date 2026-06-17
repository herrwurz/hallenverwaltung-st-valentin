import type { BookingStatus, ClosureStatus, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PrintReportType = "daily" | "weekly" | "monthly" | "organization";

export type PrintReportFilter = {
  periodStart: Date;
  periodEnd: Date;
  organizationId?: string;
  buildingId?: string;
  roomId?: string;
  status?: BookingStatus;
};

export type PrintReportBookingRow = {
  id: string;
  title: string;
  status: BookingStatus;
  organizationId: string;
  organizationName: string;
  buildingId: string;
  buildingName: string;
  roomId: string;
  roomName: string;
  usageTypeName: string;
  startsAt: Date;
  endsAt: Date;
};

export type PrintReportClosureRow = {
  id: string;
  status: ClosureStatus;
  reason: string;
  buildingId: string | null;
  buildingName: string | null;
  roomId: string | null;
  roomName: string | null;
  startsAt: Date;
  endsAt: Date;
};

export type DailyOccupancyReport = {
  bookings: PrintReportBookingRow[];
  closures: PrintReportClosureRow[];
};

export type WeeklyPlanDay = {
  date: string;
  bookings: PrintReportBookingRow[];
  closures: PrintReportClosureRow[];
};

export type WeeklyPlanReport = {
  days: WeeklyPlanDay[];
};

export type MonthlyOverviewDay = {
  date: string;
  bookingCount: number;
  closureCount: number;
  approvedCount: number;
  requestedCount: number;
  inReviewCount: number;
};

export type MonthlyOverviewReport = {
  days: MonthlyOverviewDay[];
};

export type OrganizationOverviewReport = {
  organizations: Array<{
    id: string;
    name: string;
    typeName: string;
    status: string;
    contacts: Array<{ name: string; function: string; email: string | null; phone: string | null; isPrimary: boolean }>;
    bookings: PrintReportBookingRow[];
  }>;
};

export type PrintReportFilterOptions = {
  organizations: Array<{ id: string; name: string }>;
  buildings: Array<{ id: string; name: string }>;
  rooms: Array<{ id: string; name: string; buildingId: string; buildingName: string }>;
};

type PrintReportClient = Pick<PrismaClient, "booking" | "building" | "closure" | "organization" | "room">;

const includedBookingStatuses: BookingStatus[] = ["REQUESTED", "IN_REVIEW", "APPROVED"];

const bookingReportSelect = {
  id: true,
  title: true,
  status: true,
  startsAt: true,
  endsAt: true,
  organizationId: true,
  organization: { select: { name: true } },
  usageType: { select: { name: true } },
  room: {
    select: {
      id: true,
      name: true,
      building: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.BookingSelect;

type BookingReportRecord = Prisma.BookingGetPayload<{ select: typeof bookingReportSelect }>;

const closureReportSelect = {
  id: true,
  status: true,
  reason: true,
  startsAt: true,
  endsAt: true,
  buildingId: true,
  roomId: true,
  building: { select: { name: true } },
  room: {
    select: {
      name: true,
      building: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.ClosureSelect;

type ClosureReportRecord = Prisma.ClosureGetPayload<{ select: typeof closureReportSelect }>;

function assertValidPeriod(periodStart: Date, periodEnd: Date) {
  if (!(periodStart instanceof Date) || Number.isNaN(periodStart.getTime())) {
    throw new Error("Der Zeitraum-Beginn ist ungültig.");
  }

  if (!(periodEnd instanceof Date) || Number.isNaN(periodEnd.getTime())) {
    throw new Error("Das Zeitraum-Ende ist ungültig.");
  }

  if (periodStart >= periodEnd) {
    throw new Error("Der Zeitraum-Beginn muss vor dem Zeitraum-Ende liegen.");
  }
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toBookingRow(record: BookingReportRecord): PrintReportBookingRow {
  return {
    id: record.id,
    title: record.title,
    status: record.status,
    organizationId: record.organizationId,
    organizationName: record.organization.name,
    buildingId: record.room.building.id,
    buildingName: record.room.building.name,
    roomId: record.room.id,
    roomName: record.room.name,
    usageTypeName: record.usageType.name,
    startsAt: record.startsAt,
    endsAt: record.endsAt,
  };
}

function toClosureRow(record: ClosureReportRecord): PrintReportClosureRow {
  return {
    id: record.id,
    status: record.status,
    reason: record.reason,
    buildingId: record.buildingId ?? record.room?.building.id ?? null,
    buildingName: record.building?.name ?? record.room?.building.name ?? null,
    roomId: record.roomId,
    roomName: record.room?.name ?? null,
    startsAt: record.startsAt,
    endsAt: record.endsAt,
  };
}

async function resolveRoomBuildingId(roomId: string | undefined, client: PrintReportClient) {
  if (!roomId) {
    return undefined;
  }

  const room = await client.room.findUnique({
    where: { id: roomId },
    select: { buildingId: true },
  });

  return room?.buildingId;
}

function buildBookingWhere(input: PrintReportFilter): Prisma.BookingWhereInput {
  assertValidPeriod(input.periodStart, input.periodEnd);

  return {
    startsAt: { lt: input.periodEnd },
    endsAt: { gt: input.periodStart },
    status: input.status ? input.status : { in: includedBookingStatuses },
    organizationId: input.organizationId || undefined,
    roomId: input.roomId || undefined,
    room: {
      buildingId: input.buildingId || undefined,
    },
  };
}

async function buildClosureWhere(input: PrintReportFilter, client: PrintReportClient): Promise<Prisma.ClosureWhereInput> {
  assertValidPeriod(input.periodStart, input.periodEnd);
  const roomBuildingId = await resolveRoomBuildingId(input.roomId, client);

  const targetFilter: Prisma.ClosureWhereInput[] = [];

  if (input.roomId) {
    targetFilter.push({ roomId: input.roomId });
    if (roomBuildingId) {
      targetFilter.push({ buildingId: roomBuildingId });
    }
  } else if (input.buildingId) {
    targetFilter.push({ buildingId: input.buildingId }, { room: { buildingId: input.buildingId } });
  }

  return {
    startsAt: { lt: input.periodEnd },
    endsAt: { gt: input.periodStart },
    status: { not: "OPEN" },
    ...(targetFilter.length > 0 ? { OR: targetFilter } : {}),
  };
}

export async function getReportFilterOptions(client: PrintReportClient = prisma): Promise<PrintReportFilterOptions> {
  const [organizations, buildings, rooms] = await Promise.all([
    client.organization.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    client.building.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    client.room.findMany({
      orderBy: [{ building: { name: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        buildingId: true,
        building: { select: { name: true } },
      },
    }),
  ]);

  return {
    organizations,
    buildings,
    rooms: rooms.map((room) => ({
      id: room.id,
      name: room.name,
      buildingId: room.buildingId,
      buildingName: room.building.name,
    })),
  };
}

export async function getDailyOccupancyReport(
  input: PrintReportFilter,
  client: PrintReportClient = prisma,
): Promise<DailyOccupancyReport> {
  const [bookings, closures] = await Promise.all([
    client.booking.findMany({
      where: buildBookingWhere(input),
      orderBy: [{ startsAt: "asc" }, { room: { building: { name: "asc" } } }, { room: { name: "asc" } }],
      select: bookingReportSelect,
    }),
    client.closure.findMany({
      where: await buildClosureWhere(input, client),
      orderBy: [{ startsAt: "asc" }, { reason: "asc" }],
      select: closureReportSelect,
    }),
  ]);

  return {
    bookings: bookings.map(toBookingRow),
    closures: closures.map(toClosureRow),
  };
}

export async function getWeeklyPlanReport(
  input: PrintReportFilter,
  client: PrintReportClient = prisma,
): Promise<WeeklyPlanReport> {
  const report = await getDailyOccupancyReport(input, client);
  const days: WeeklyPlanDay[] = [];

  for (let day = new Date(input.periodStart); day < input.periodEnd; day = addDays(day, 1)) {
    const nextDay = addDays(day, 1);
    days.push({
      date: formatDateKey(day),
      bookings: report.bookings.filter((booking) => booking.startsAt < nextDay && booking.endsAt > day),
      closures: report.closures.filter((closure) => closure.startsAt < nextDay && closure.endsAt > day),
    });
  }

  return { days };
}

export async function getMonthlyOverviewReport(
  input: PrintReportFilter,
  client: PrintReportClient = prisma,
): Promise<MonthlyOverviewReport> {
  const weekly = await getWeeklyPlanReport(input, client);

  return {
    days: weekly.days.map((day) => ({
      date: day.date,
      bookingCount: day.bookings.length,
      closureCount: day.closures.length,
      approvedCount: day.bookings.filter((booking) => booking.status === "APPROVED").length,
      requestedCount: day.bookings.filter((booking) => booking.status === "REQUESTED").length,
      inReviewCount: day.bookings.filter((booking) => booking.status === "IN_REVIEW").length,
    })),
  };
}

export async function getOrganizationOverviewReport(
  input: PrintReportFilter,
  client: PrintReportClient = prisma,
): Promise<OrganizationOverviewReport> {
  assertValidPeriod(input.periodStart, input.periodEnd);

  const [organizations, bookingReport] = await Promise.all([
    client.organization.findMany({
      where: input.organizationId ? { id: input.organizationId } : undefined,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        status: true,
        organizationType: { select: { name: true } },
        contacts: {
          orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
          select: { name: true, function: true, email: true, phone: true, isPrimary: true },
        },
      },
    }),
    getDailyOccupancyReport(input, client),
  ]);

  return {
    organizations: organizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      typeName: organization.organizationType.name,
      status: organization.status,
      contacts: organization.contacts,
      bookings: bookingReport.bookings.filter((booking) => booking.organizationId === organization.id),
    })),
  };
}
