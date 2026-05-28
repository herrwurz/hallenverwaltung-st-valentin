import type { BillingCalculationType, BillingStatus, Prisma, PrismaClient, TariffDayType } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { markOpenBillingEntriesExported } from "@/lib/services/billing-transition-service";

type BillingClient = Pick<PrismaClient, "booking" | "billingEntry" | "tariff" | "holidayPeriod">;

export class BillingValidationError extends Error {}

export type BillingPeriodInput = {
  periodStart: Date;
  periodEnd: Date;
};

export type BillingPermissions = {
  canExport?: boolean;
};

const billingEntrySelect = {
  id: true,
  bookingId: true,
  organizationId: true,
  tariffId: true,
  status: true,
  amount: true,
  periodStart: true,
  periodEnd: true,
  durationMinutes: true,
  unitPrice: true,
  calculationType: true,
  exportedAt: true,
  billedAt: true,
  booking: {
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      room: {
        select: {
          name: true,
          building: {
            select: {
              name: true,
            },
          },
        },
      },
      usageType: {
        select: {
          name: true,
        },
      },
    },
  },
  organization: {
    select: {
      name: true,
    },
  },
  tariff: {
    select: {
      name: true,
      hourlyRate: true,
      flatRate: true,
      dayType: true,
    },
  },
} satisfies Prisma.BillingEntrySelect;

const billableBookingSelect = {
  id: true,
  organizationId: true,
  roomId: true,
  usageTypeId: true,
  title: true,
  startsAt: true,
  endsAt: true,
  status: true,
  billingEntry: {
    select: {
      id: true,
      status: true,
    },
  },
  organization: {
    select: {
      id: true,
      name: true,
      tariffGroupId: true,
      isBillingRelevant: true,
      organizationTypeId: true,
      organizationType: {
        select: {
          name: true,
        },
      },
    },
  },
  room: {
    select: {
      id: true,
      name: true,
      building: {
        select: {
          name: true,
        },
      },
    },
  },
  usageType: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.BookingSelect;

type BillableBooking = Prisma.BookingGetPayload<{ select: typeof billableBookingSelect }>;
type BillingEntryRecord = Prisma.BillingEntryGetPayload<{ select: typeof billingEntrySelect }>;

function assertValidPeriod(periodStart: Date, periodEnd: Date) {
  if (!(periodStart instanceof Date) || Number.isNaN(periodStart.getTime())) {
    throw new BillingValidationError("Der Zeitraum-Beginn ist ungueltig.");
  }

  if (!(periodEnd instanceof Date) || Number.isNaN(periodEnd.getTime())) {
    throw new BillingValidationError("Das Zeitraum-Ende ist ungueltig.");
  }

  if (periodStart >= periodEnd) {
    throw new BillingValidationError("Der Zeitraum-Beginn muss vor dem Zeitraum-Ende liegen.");
  }
}

async function assertBillingPermission(actorUserId: string, permissions: BillingPermissions = {}) {
  const canExport =
    typeof permissions.canExport === "boolean"
      ? permissions.canExport
      : await hasPermission(actorUserId, "BILLING_EXPORT");

  if (!canExport) {
    throw new BillingValidationError("Sie duerfen Abrechnungsdaten nicht bearbeiten.");
  }
}

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

async function resolveTariffDayType(booking: Pick<BillableBooking, "startsAt">, client: BillingClient): Promise<TariffDayType> {
  const dayStart = new Date(Date.UTC(
    booking.startsAt.getUTCFullYear(),
    booking.startsAt.getUTCMonth(),
    booking.startsAt.getUTCDate(),
  ));
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const holiday = await client.holidayPeriod.findFirst({
    where: {
      startsOn: { lt: dayEnd },
      endsOn: { gte: dayStart },
    },
    select: { id: true },
  });

  if (holiday) {
    return "HOLIDAY";
  }

  return isWeekend(booking.startsAt) ? "WEEKEND" : "WEEKDAY";
}

function tariffSpecificity(dayType: TariffDayType, targetDayType: TariffDayType) {
  if (dayType === targetDayType) {
    return 0;
  }

  if (dayType === "ALL") {
    return 1;
  }

  return 99;
}

function intervalsOverlap(
  left: { validFrom: Date; validUntil: Date | null },
  right: { validFrom: Date; validUntil: Date | null },
) {
  const leftEnd = left.validUntil?.getTime() ?? Number.POSITIVE_INFINITY;
  const rightEnd = right.validUntil?.getTime() ?? Number.POSITIVE_INFINITY;

  return left.validFrom.getTime() <= rightEnd && right.validFrom.getTime() <= leftEnd;
}

function assertNoConflictingTariffs(
  tariffs: Array<{
    id: string;
    validFrom: Date;
    validUntil: Date | null;
    dayType: TariffDayType;
  }>,
) {
  const byDayType = new Map<TariffDayType, typeof tariffs>();

  for (const tariff of tariffs) {
    const group = byDayType.get(tariff.dayType) ?? [];
    group.push(tariff);
    byDayType.set(tariff.dayType, group);
  }

  for (const group of byDayType.values()) {
    for (let index = 0; index < group.length; index += 1) {
      for (let nextIndex = index + 1; nextIndex < group.length; nextIndex += 1) {
        const left = group[index]!;
        const right = group[nextIndex]!;
        if (intervalsOverlap(left, right)) {
          throw new BillingValidationError("Es gibt widerspruechliche Tarife fuer diese Kombination.");
        }
      }
    }
  }
}

async function resolveTariff(booking: BillableBooking, client: BillingClient) {
  if (!booking.organization.tariffGroupId) {
    throw new BillingValidationError("Fuer die Organisation ist keine Tarifgruppe hinterlegt.");
  }

  const dayType = await resolveTariffDayType(booking, client);
  const tariffs = await client.tariff.findMany({
    where: {
      roomId: booking.roomId,
      tariffGroupId: booking.organization.tariffGroupId,
      organizationTypeId: booking.organization.organizationTypeId,
      usageTypeId: booking.usageTypeId,
      validFrom: { lte: booking.startsAt },
      OR: [{ validUntil: null }, { validUntil: { gte: booking.startsAt } }],
      dayType: { in: [dayType, "ALL"] },
    },
    orderBy: [{ validFrom: "desc" }],
  });

  assertNoConflictingTariffs(tariffs);

  const tariff = tariffs
    .sort((left, right) => tariffSpecificity(left.dayType, dayType) - tariffSpecificity(right.dayType, dayType))[0];

  if (!tariff) {
    throw new BillingValidationError("Fuer diese Buchung wurde kein passender Tarif gefunden.");
  }

  return tariff;
}

function calculateDurationMinutes(startsAt: Date, endsAt: Date) {
  return Math.max(0, Math.round((endsAt.getTime() - startsAt.getTime()) / 60000));
}

function calculateAmount({
  tariff,
  durationMinutes,
}: {
  tariff: {
    hourlyRate: PrismaNamespace.Decimal | null;
    flatRate: PrismaNamespace.Decimal | null;
  };
  durationMinutes: number;
}): {
  amount: PrismaNamespace.Decimal;
  unitPrice: PrismaNamespace.Decimal | null;
  calculationType: BillingCalculationType;
} {
  if (tariff.flatRate) {
    return {
      amount: tariff.flatRate,
      unitPrice: tariff.flatRate,
      calculationType: tariff.flatRate.equals(0) ? "ZERO" : "FLAT",
    };
  }

  if (tariff.hourlyRate) {
    const hours = new PrismaNamespace.Decimal(durationMinutes).div(60);
    const amount = tariff.hourlyRate.mul(hours).toDecimalPlaces(2);
    return {
      amount,
      unitPrice: tariff.hourlyRate,
      calculationType: amount.equals(0) ? "ZERO" : "HOURLY",
    };
  }

  return {
    amount: new PrismaNamespace.Decimal(0),
    unitPrice: new PrismaNamespace.Decimal(0),
    calculationType: "ZERO",
  };
}

export async function getBillableBookings(
  input: BillingPeriodInput,
  client: BillingClient = prisma,
): Promise<BillableBooking[]> {
  assertValidPeriod(input.periodStart, input.periodEnd);

  return client.booking.findMany({
    where: {
      status: "APPROVED",
      startsAt: { gte: input.periodStart },
      endsAt: { lte: input.periodEnd },
      organization: {
        isBillingRelevant: true,
      },
      billingEntry: null,
    },
    orderBy: { startsAt: "asc" },
    select: billableBookingSelect,
  });
}

export async function calculateBillingEntry(bookingId: string, client: BillingClient = prisma) {
  const booking = await client.booking.findUnique({
    where: { id: bookingId },
    select: billableBookingSelect,
  });

  if (!booking) {
    throw new BillingValidationError("Die Buchung wurde nicht gefunden.");
  }

  if (booking.status !== "APPROVED") {
    throw new BillingValidationError("Nur genehmigte Buchungen sind abrechnungsrelevant.");
  }

  if (!booking.organization.isBillingRelevant) {
    return {
      booking,
      tariff: null,
      status: "NOT_RELEVANT" as BillingStatus,
      amount: new PrismaNamespace.Decimal(0),
      unitPrice: new PrismaNamespace.Decimal(0),
      durationMinutes: calculateDurationMinutes(booking.startsAt, booking.endsAt),
      calculationType: "ZERO" as BillingCalculationType,
    };
  }

  const tariff = await resolveTariff(booking, client);
  const durationMinutes = calculateDurationMinutes(booking.startsAt, booking.endsAt);
  const calculation = calculateAmount({ tariff, durationMinutes });

  return {
    booking,
    tariff,
    status: "OPEN" as BillingStatus,
    durationMinutes,
    ...calculation,
  };
}

export async function createBillingEntriesForPeriod(
  input: BillingPeriodInput & { actorUserId: string },
  client: BillingClient = prisma,
  permissions: BillingPermissions = {},
) {
  await assertBillingPermission(input.actorUserId, permissions);
  const bookings = await getBillableBookings(input, client);
  const entries: BillingEntryRecord[] = [];
  const skipped: Array<{ bookingId: string; reason: string }> = [];

  for (const booking of bookings) {
    try {
      const calculation = await calculateBillingEntry(booking.id, client);
      const entry = await client.billingEntry.upsert({
        where: { bookingId: booking.id },
        update: {},
        create: {
          bookingId: booking.id,
          organizationId: booking.organizationId,
          tariffId: calculation.tariff?.id ?? null,
          status: calculation.status,
          amount: calculation.amount,
          periodStart: booking.startsAt,
          periodEnd: booking.endsAt,
          durationMinutes: calculation.durationMinutes,
          unitPrice: calculation.unitPrice,
          calculationType: calculation.calculationType,
        },
        select: billingEntrySelect,
      });
      entries.push(entry);
    } catch (error) {
      skipped.push({
        bookingId: booking.id,
        reason: error instanceof Error ? error.message : "Die Buchung konnte nicht abgerechnet werden.",
      });
    }
  }

  return { entries, skipped };
}

export async function getBillingEntries(
  input: BillingPeriodInput,
  client: BillingClient = prisma,
) {
  assertValidPeriod(input.periodStart, input.periodEnd);

  return client.billingEntry.findMany({
    where: {
      periodStart: { gte: input.periodStart },
      periodEnd: { lte: input.periodEnd },
    },
    orderBy: { periodStart: "asc" },
    select: billingEntrySelect,
  });
}

export async function markBillingEntriesExported(
  input: { entryIds: string[]; actorUserId: string; exportedAt?: Date },
  client: BillingClient = prisma,
  permissions: BillingPermissions = {},
) {
  await assertBillingPermission(input.actorUserId, permissions);
  return markOpenBillingEntriesExported(input, client);
}
