import type { BillingStatus, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ReportingClient = Pick<PrismaClient, "billingEntry" | "organization" | "building" | "room">;

export type BillingReportFilter = {
  periodStart: Date;
  periodEnd: Date;
  organizationId?: string;
  buildingId?: string;
  roomId?: string;
  status?: BillingStatus;
};

export type BillingReportRow = {
  id: string;
  bookingId: string;
  organizationId: string;
  organizationName: string;
  buildingId: string;
  buildingName: string;
  roomId: string;
  roomName: string;
  bookingTitle: string;
  usageTypeName: string;
  startsAt: Date;
  endsAt: Date;
  periodStart: Date;
  periodEnd: Date;
  durationMinutes: number;
  tariffName: string;
  tariffDayType: string;
  calculationType: string;
  unitPrice: string;
  amount: string;
  status: BillingStatus;
  exportedAt: Date | null;
};

export type BillingFilterOptions = {
  organizations: Array<{ id: string; name: string }>;
  buildings: Array<{ id: string; name: string }>;
  rooms: Array<{ id: string; name: string; buildingName: string }>;
};

const billingReportSelect = {
  id: true,
  bookingId: true,
  organizationId: true,
  status: true,
  amount: true,
  periodStart: true,
  periodEnd: true,
  durationMinutes: true,
  unitPrice: true,
  calculationType: true,
  exportedAt: true,
  organization: {
    select: {
      name: true,
    },
  },
  tariff: {
    select: {
      name: true,
      dayType: true,
    },
  },
  booking: {
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      usageType: {
        select: {
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
            },
          },
        },
      },
    },
  },
} satisfies Prisma.BillingEntrySelect;

type BillingReportRecord = Prisma.BillingEntryGetPayload<{ select: typeof billingReportSelect }>;

function assertValidPeriod(periodStart: Date, periodEnd: Date) {
  if (!(periodStart instanceof Date) || Number.isNaN(periodStart.getTime())) {
    throw new Error("Der Zeitraum-Beginn ist ungueltig.");
  }

  if (!(periodEnd instanceof Date) || Number.isNaN(periodEnd.getTime())) {
    throw new Error("Das Zeitraum-Ende ist ungueltig.");
  }

  if (periodStart >= periodEnd) {
    throw new Error("Der Zeitraum-Beginn muss vor dem Zeitraum-Ende liegen.");
  }
}

function decimalToString(value: { toString(): string } | null) {
  return value?.toString() ?? "0";
}

function toBillingReportRow(record: BillingReportRecord): BillingReportRow {
  return {
    id: record.id,
    bookingId: record.bookingId,
    organizationId: record.organizationId,
    organizationName: record.organization.name,
    buildingId: record.booking.room.building.id,
    buildingName: record.booking.room.building.name,
    roomId: record.booking.room.id,
    roomName: record.booking.room.name,
    bookingTitle: record.booking.title,
    usageTypeName: record.booking.usageType.name,
    startsAt: record.booking.startsAt,
    endsAt: record.booking.endsAt,
    periodStart: record.periodStart,
    periodEnd: record.periodEnd,
    durationMinutes: record.durationMinutes,
    tariffName: record.tariff?.name ?? "Kein Tarif",
    tariffDayType: record.tariff?.dayType ?? "ALL",
    calculationType: record.calculationType,
    unitPrice: decimalToString(record.unitPrice),
    amount: decimalToString(record.amount),
    status: record.status,
    exportedAt: record.exportedAt,
  };
}

function buildBillingReportWhere(input: BillingReportFilter): Prisma.BillingEntryWhereInput {
  assertValidPeriod(input.periodStart, input.periodEnd);

  return {
    periodStart: { gte: input.periodStart },
    periodEnd: { lte: input.periodEnd },
    organizationId: input.organizationId || undefined,
    status: input.status,
    booking: {
      roomId: input.roomId || undefined,
      room: {
        buildingId: input.buildingId || undefined,
      },
    },
  };
}

export async function getBillingReportData(
  input: BillingReportFilter,
  client: ReportingClient = prisma,
): Promise<BillingReportRow[]> {
  const entries = await client.billingEntry.findMany({
    where: buildBillingReportWhere(input),
    orderBy: [{ periodStart: "asc" }, { organization: { name: "asc" } }, { booking: { title: "asc" } }],
    select: billingReportSelect,
  });

  return entries.map(toBillingReportRow);
}

export async function getOrganizationBillingReport(
  input: BillingReportFilter & { organizationId: string },
  client: ReportingClient = prisma,
) {
  const rows = await getBillingReportData(input, client);
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount), 0);
  const totalMinutes = rows.reduce((sum, row) => sum + row.durationMinutes, 0);

  return {
    organizationId: input.organizationId,
    organizationName: rows[0]?.organizationName ?? "",
    rows,
    totalAmount,
    totalMinutes,
  };
}

export async function getRoomUsageReport(input: BillingReportFilter, client: ReportingClient = prisma) {
  const rows = await getBillingReportData(input, client);
  const byRoom = new Map<string, {
    roomId: string;
    roomName: string;
    buildingName: string;
    bookingCount: number;
    totalMinutes: number;
    totalAmount: number;
  }>();

  for (const row of rows) {
    const existing = byRoom.get(row.roomId) ?? {
      roomId: row.roomId,
      roomName: row.roomName,
      buildingName: row.buildingName,
      bookingCount: 0,
      totalMinutes: 0,
      totalAmount: 0,
    };
    existing.bookingCount += 1;
    existing.totalMinutes += row.durationMinutes;
    existing.totalAmount += Number(row.amount);
    byRoom.set(row.roomId, existing);
  }

  return [...byRoom.values()].sort((left, right) => left.buildingName.localeCompare(right.buildingName) || left.roomName.localeCompare(right.roomName));
}

export async function getMonthlyUsageSummary(input: BillingReportFilter, client: ReportingClient = prisma) {
  const rows = await getBillingReportData(input, client);
  const byMonth = new Map<string, { month: string; bookingCount: number; totalMinutes: number; totalAmount: number }>();

  for (const row of rows) {
    const month = row.periodStart.toISOString().slice(0, 7);
    const existing = byMonth.get(month) ?? { month, bookingCount: 0, totalMinutes: 0, totalAmount: 0 };
    existing.bookingCount += 1;
    existing.totalMinutes += row.durationMinutes;
    existing.totalAmount += Number(row.amount);
    byMonth.set(month, existing);
  }

  return [...byMonth.values()].sort((left, right) => left.month.localeCompare(right.month));
}

export async function getBillingFilterOptions(client: ReportingClient = prisma): Promise<BillingFilterOptions> {
  const [organizations, buildings, rooms] = await Promise.all([
    client.organization.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    client.building.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    client.room.findMany({
      orderBy: [{ building: { name: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        building: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  return {
    organizations,
    buildings,
    rooms: rooms.map((room) => ({ id: room.id, name: room.name, buildingName: room.building.name })),
  };
}
