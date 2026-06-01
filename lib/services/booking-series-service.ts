import type { ClosureStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createBookingRequest } from "@/lib/services/booking-request-service";
import { BookingValidationError } from "@/lib/services/booking-rules";

const maxSeriesOccurrences = 80;

export const bookingSeriesRequestSchema = z.object({
  organizationId: z.string().trim().min(1, "Eine Organisation ist erforderlich."),
  roomId: z.string().trim().min(1, "Ein Raum ist erforderlich."),
  usageTypeId: z.string().trim().min(1, "Ein Nutzungstyp ist erforderlich."),
  title: z.string().trim().min(2, "Ein Titel ist erforderlich.").max(160),
  description: z.string().trim().max(1000).optional(),
  firstStartsAt: z.coerce.date(),
  firstEndsAt: z.coerce.date(),
  repeatUntil: z.coerce.date(),
});

type SeriesOccurrence = {
  startsAt: Date;
  endsAt: Date;
};

type HolidayOverlap = {
  id: string;
  name: string;
  status: ClosureStatus;
  reason: string;
};

function endOfDay(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized;
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && startB < endA;
}

export function generateWeeklyOccurrences({
  firstStartsAt,
  firstEndsAt,
  repeatUntil,
}: {
  firstStartsAt: Date;
  firstEndsAt: Date;
  repeatUntil: Date;
}) {
  if (!(firstStartsAt < firstEndsAt)) {
    throw new BookingValidationError("Der erste Serientermin muss vor seinem Ende beginnen.");
  }

  if (repeatUntil < firstStartsAt) {
    throw new BookingValidationError("Das Serienende darf nicht vor dem ersten Termin liegen.");
  }

  const durationMs = firstEndsAt.getTime() - firstStartsAt.getTime();
  const occurrences: SeriesOccurrence[] = [];
  let startsAt = new Date(firstStartsAt);

  while (startsAt <= repeatUntil && occurrences.length < maxSeriesOccurrences) {
    occurrences.push({
      startsAt: new Date(startsAt),
      endsAt: new Date(startsAt.getTime() + durationMs),
    });
    startsAt = new Date(startsAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  if (occurrences.length === maxSeriesOccurrences && startsAt <= repeatUntil) {
    throw new BookingValidationError("Die Serie ist zu lang. Maximal 80 woechentliche Termine sind erlaubt.");
  }

  return occurrences;
}

export function evaluateHolidayOverlap(
  occurrence: SeriesOccurrence,
  holidays: Array<{
    id: string;
    name: string;
    startsOn: Date;
    endsOn: Date;
    defaultStatus: ClosureStatus;
    reason: string;
  }>,
): HolidayOverlap | null {
  const holiday = holidays.find((period) =>
    overlaps(occurrence.startsAt, occurrence.endsAt, period.startsOn, period.endsOn),
  );

  return holiday
    ? {
        id: holiday.id,
        name: holiday.name,
        status: holiday.defaultStatus,
        reason: holiday.reason,
      }
    : null;
}

export async function createBookingSeriesRequest(input: unknown, actorUserId: string) {
  const data = bookingSeriesRequestSchema.parse(input);
  const repeatUntil = endOfDay(data.repeatUntil);
  const occurrences = generateWeeklyOccurrences({ ...data, repeatUntil });
  const startsOn = occurrences[0]?.startsAt;
  const endsOn = occurrences.at(-1)?.endsAt;

  if (!startsOn || !endsOn) {
    throw new BookingValidationError("Die Serie enthaelt keine Termine.");
  }

  return prisma.$transaction(async (transaction) => {
    const holidays = await transaction.holidayPeriod.findMany({
      where: {
        startsOn: { lt: endsOn },
        endsOn: { gt: startsOn },
      },
      orderBy: { startsOn: "asc" },
    });

    const series = await transaction.bookingSeries.create({
      data: {
        organizationId: data.organizationId,
        roomId: data.roomId,
        usageTypeId: data.usageTypeId,
        title: data.title,
        startsOn,
        endsOn,
        recurrenceRule: "FREQ=WEEKLY;INTERVAL=1",
      },
    });

    const createdBookings: Array<{ id: string; startsAt: Date; endsAt: Date }> = [];
    const skipped: Array<{ startsAt: Date; endsAt: Date; reason: string }> = [];
    const warnings: string[] = [];

    for (const occurrence of occurrences) {
      const holiday = evaluateHolidayOverlap(occurrence, holidays);

      if (holiday?.status === "CLOSED") {
        skipped.push({
          startsAt: occurrence.startsAt,
          endsAt: occurrence.endsAt,
          reason: `${holiday.name}: ${holiday.reason}`,
        });
        continue;
      }

      if (holiday?.status === "RESTRICTED") {
        warnings.push(`${holiday.name}: eingeschraenkter Betrieb fuer ${occurrence.startsAt.toLocaleDateString("de-AT")}.`);
      }

      try {
        const result = await createBookingRequest(
          {
            organizationId: data.organizationId,
            roomId: data.roomId,
            usageTypeId: data.usageTypeId,
            title: data.title,
            description: data.description,
            startsAt: occurrence.startsAt,
            endsAt: occurrence.endsAt,
          },
          actorUserId,
          {
            client: transaction,
            bookingMeta: {
              seriesId: series.id,
              kind: "SERIES_OCCURRENCE",
            },
          },
        );
        createdBookings.push({
          id: result.booking.id,
          startsAt: result.booking.startsAt,
          endsAt: result.booking.endsAt,
        });
        warnings.push(
          ...result.conflicts
            .filter((conflict) => conflict.severity === "soft")
            .map((conflict) => conflict.message),
        );
      } catch (error) {
        if (error instanceof BookingValidationError) {
          skipped.push({
            startsAt: occurrence.startsAt,
            endsAt: occurrence.endsAt,
            reason: error.message,
          });
          continue;
        }
        throw error;
      }
    }

    if (createdBookings.length === 0) {
      throw new BookingValidationError("Es konnte kein Serientermin angelegt werden.");
    }

    await transaction.auditEntry.create({
      data: {
        actorUserId,
        entityType: "BookingSeries",
        entityId: series.id,
        action: "REQUESTED",
        payload: {
          createdCount: createdBookings.length,
          skippedCount: skipped.length,
          recurrenceRule: series.recurrenceRule,
        } satisfies Prisma.InputJsonObject,
      },
    });

    return {
      series,
      createdBookings,
      skipped,
      warnings: Array.from(new Set(warnings)),
    };
  });
}

export async function getBookingSeriesForOrganization(userId: string) {
  const now = new Date();
  return prisma.bookingSeries.findMany({
    where: {
      organization: {
        members: {
          some: {
            userId,
            activeFrom: { lte: now },
            OR: [{ activeUntil: null }, { activeUntil: { gt: now } }],
          },
        },
      },
    },
    include: {
      organization: true,
      room: { include: { building: true } },
      usageType: true,
      bookings: { orderBy: { startsAt: "asc" } },
    },
    orderBy: { startsOn: "desc" },
  });
}

export async function getBookingSeriesForAdmin() {
  return prisma.bookingSeries.findMany({
    include: {
      organization: true,
      room: { include: { building: true } },
      usageType: true,
      bookings: { orderBy: { startsAt: "asc" } },
    },
    orderBy: { startsOn: "desc" },
  });
}
