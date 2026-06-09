import type { ClosureStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createBookingRequest } from "@/lib/services/booking-request-service";
import { BookingValidationError } from "@/lib/services/booking-rules";

const maxSeriesOccurrences = 80;
const weekdays = [0, 1, 2, 3, 4, 5, 6] as const;
const recurrenceTypes = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;
const monthlyModes = ["DAY_OF_MONTH", "NTH_WEEKDAY"] as const;
const ordinalValues = ["FIRST", "SECOND", "THIRD", "FOURTH", "LAST"] as const;

type Weekday = (typeof weekdays)[number];
type OrdinalValue = (typeof ordinalValues)[number];

function emptyToUndefined(value: unknown) {
  return value === null || value === "" ? undefined : value;
}

export const bookingSeriesRequestSchema = z.object({
  organizationId: z.string().trim().min(1, "Eine Organisation ist erforderlich."),
  roomId: z.string().trim().min(1, "Ein Raum ist erforderlich."),
  usageTypeId: z.string().trim().min(1, "Ein Nutzungstyp ist erforderlich."),
  title: z.string().trim().min(2, "Ein Titel ist erforderlich.").max(160),
  description: z.string().trim().max(1000).optional(),
  firstStartsAt: z.coerce.date(),
  firstEndsAt: z.coerce.date(),
  repeatUntil: z.coerce.date(),
  recurrenceType: z.preprocess(emptyToUndefined, z.enum(recurrenceTypes).default("WEEKLY")),
  interval: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(99).default(1)),
  weekdays: z.preprocess((value) => parseWeekdays(value), z.array(z.number().int().min(0).max(6))).default([]),
  monthlyMode: z.preprocess(emptyToUndefined, z.enum(monthlyModes).default("DAY_OF_MONTH")),
  dayOfMonth: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(31).optional()),
  ordinal: z.preprocess(emptyToUndefined, z.enum(ordinalValues).optional()),
  weekday: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(6).optional()),
  month: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(12).optional()),
  excludedDates: z
    .preprocess((value) => parseExcludedDates(value), z.array(z.date()))
    .default([]),
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

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function atTimeOf(baseDate: Date, timeSource: Date) {
  const date = new Date(baseDate);
  date.setHours(timeSource.getHours(), timeSource.getMinutes(), timeSource.getSeconds(), timeSource.getMilliseconds());
  return date;
}

function startOfWeek(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  const mondayBasedOffset = (normalized.getDay() + 6) % 7;
  normalized.setDate(normalized.getDate() - mondayBasedOffset);
  return normalized;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function getNthWeekdayOfMonth(year: number, monthIndex: number, weekday: Weekday, ordinal: OrdinalValue) {
  if (ordinal === "LAST") {
    const date = new Date(year, monthIndex + 1, 0);
    while (date.getDay() !== weekday) {
      date.setDate(date.getDate() - 1);
    }
    return date;
  }

  const ordinalIndex = ordinalValues.indexOf(ordinal) + 1;
  const date = new Date(year, monthIndex, 1);
  while (date.getDay() !== weekday) {
    date.setDate(date.getDate() + 1);
  }
  date.setDate(date.getDate() + (ordinalIndex - 1) * 7);

  return date.getMonth() === monthIndex ? date : null;
}

function monthsBetween(first: Date, candidate: Date) {
  return (candidate.getFullYear() - first.getFullYear()) * 12 + candidate.getMonth() - first.getMonth();
}

function yearsBetween(first: Date, candidate: Date) {
  return candidate.getFullYear() - first.getFullYear();
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && startB < endA;
}

export function parseExcludedDates(value: unknown): Date[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => parseExcludedDates(entry));
  }

  if (value instanceof Date) {
    return [value];
  }

  return String(value)
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const parsed = new Date(`${entry}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) {
        throw new BookingValidationError(`Das Ausnahmedatum "${entry}" ist ungültig.`);
      }
      return parsed;
    });
}

export function parseWeekdays(value: unknown): Weekday[] {
  const values = Array.isArray(value) ? value : String(value ?? "").split(/[,;]+/);
  const normalized = values.map((entry) => String(entry).trim()).filter(Boolean);

  for (const entry of normalized) {
    if (!weekdays.includes(Number(entry) as Weekday)) {
      throw new BookingValidationError(`Der Wochentag "${entry}" ist ungültig.`);
    }
  }

  return Array.from(
    new Set(
      normalized
        .map((entry) => Number(entry))
        .filter((entry): entry is Weekday => weekdays.includes(entry as Weekday)),
    ),
  ).sort((a, b) => a - b);
}

export function isExcludedOccurrence(occurrence: SeriesOccurrence, excludedDates: Date[]) {
  const excludedDateKeys = new Set(excludedDates.map(dateKey));
  return excludedDateKeys.has(dateKey(occurrence.startsAt));
}

function appendExcludedDates(rule: string, excludedDates: Date[]) {
  const excluded = Array.from(new Set(excludedDates.map(dateKey))).sort();
  return excluded.length ? `${rule};EXDATE=${excluded.join(",")}` : rule;
}

function buildRecurrenceRule(data: z.infer<typeof bookingSeriesRequestSchema>) {
  const interval = `INTERVAL=${data.interval}`;

  if (data.recurrenceType === "DAILY") {
    return appendExcludedDates(`FREQ=DAILY;${interval}`, data.excludedDates);
  }

  if (data.recurrenceType === "WEEKLY") {
    const selectedWeekdays = (data.weekdays.length > 0 ? data.weekdays : [data.firstStartsAt.getDay()]).join(",");
    return appendExcludedDates(`FREQ=WEEKLY;${interval};BYDAY=${selectedWeekdays}`, data.excludedDates);
  }

  if (data.recurrenceType === "MONTHLY" && data.monthlyMode === "NTH_WEEKDAY") {
    return appendExcludedDates(
      `FREQ=MONTHLY;${interval};BYSETPOS=${data.ordinal ?? "FIRST"};BYDAY=${data.weekday ?? data.firstStartsAt.getDay()}`,
      data.excludedDates,
    );
  }

  if (data.recurrenceType === "MONTHLY") {
    return appendExcludedDates(`FREQ=MONTHLY;${interval};BYMONTHDAY=${data.dayOfMonth ?? data.firstStartsAt.getDate()}`, data.excludedDates);
  }

  if (data.monthlyMode === "NTH_WEEKDAY") {
    return appendExcludedDates(
      `FREQ=YEARLY;${interval};BYMONTH=${data.month ?? data.firstStartsAt.getMonth() + 1};BYSETPOS=${data.ordinal ?? "FIRST"};BYDAY=${data.weekday ?? data.firstStartsAt.getDay()}`,
      data.excludedDates,
    );
  }

  return appendExcludedDates(
    `FREQ=YEARLY;${interval};BYMONTH=${data.month ?? data.firstStartsAt.getMonth() + 1};BYMONTHDAY=${data.dayOfMonth ?? data.firstStartsAt.getDate()}`,
    data.excludedDates,
  );
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
  return generateSeriesOccurrences({
    firstStartsAt,
    firstEndsAt,
    repeatUntil,
    recurrenceType: "WEEKLY",
    interval: 1,
    weekdays: [firstStartsAt.getDay()],
    monthlyMode: "DAY_OF_MONTH",
    excludedDates: [],
  });
}

export function generateSeriesOccurrences(data: Pick<
  z.infer<typeof bookingSeriesRequestSchema>,
  "firstStartsAt" | "firstEndsAt" | "repeatUntil" | "recurrenceType" | "interval" | "weekdays" | "monthlyMode" | "dayOfMonth" | "ordinal" | "weekday" | "month" | "excludedDates"
>) {
  if (!(data.firstStartsAt < data.firstEndsAt)) {
    throw new BookingValidationError("Der erste Serientermin muss vor seinem Ende beginnen.");
  }

  if (data.repeatUntil < data.firstStartsAt) {
    throw new BookingValidationError("Das Serienende darf nicht vor dem ersten Termin liegen.");
  }

  const durationMs = data.firstEndsAt.getTime() - data.firstStartsAt.getTime();
  const occurrences: SeriesOccurrence[] = [];
  let overflow = false;
  const pushOccurrence = (startsAt: Date | null) => {
    if (!startsAt || startsAt < data.firstStartsAt || startsAt > data.repeatUntil) {
      return;
    }
    if (occurrences.length >= maxSeriesOccurrences) {
      overflow = true;
      return;
    }
    occurrences.push({ startsAt, endsAt: new Date(startsAt.getTime() + durationMs) });
  };

  if (data.recurrenceType === "DAILY") {
    for (let candidate = new Date(data.firstStartsAt); candidate <= data.repeatUntil; candidate = addDays(candidate, data.interval)) {
      pushOccurrence(new Date(candidate));
    }
  }

  if (data.recurrenceType === "WEEKLY") {
    const selectedWeekdays = data.weekdays.length > 0 ? data.weekdays : [data.firstStartsAt.getDay()];
    const firstWeekStart = startOfWeek(data.firstStartsAt);

    for (let candidateDay = new Date(data.firstStartsAt); candidateDay <= data.repeatUntil; candidateDay = addDays(candidateDay, 1)) {
      const weekDistance = Math.floor((startOfWeek(candidateDay).getTime() - firstWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (weekDistance % data.interval === 0 && selectedWeekdays.includes(candidateDay.getDay() as Weekday)) {
        pushOccurrence(atTimeOf(candidateDay, data.firstStartsAt));
      }
    }
  }

  if (data.recurrenceType === "MONTHLY") {
    for (let cursor = new Date(data.firstStartsAt.getFullYear(), data.firstStartsAt.getMonth(), 1); cursor <= data.repeatUntil; cursor = addMonths(cursor, 1)) {
      if (monthsBetween(data.firstStartsAt, cursor) % data.interval !== 0) {
        continue;
      }

      if (data.monthlyMode === "NTH_WEEKDAY") {
        const candidate = getNthWeekdayOfMonth(cursor.getFullYear(), cursor.getMonth(), (data.weekday ?? data.firstStartsAt.getDay()) as Weekday, data.ordinal ?? "FIRST");
        pushOccurrence(candidate ? atTimeOf(candidate, data.firstStartsAt) : null);
      } else {
        const day = Math.min(data.dayOfMonth ?? data.firstStartsAt.getDate(), daysInMonth(cursor.getFullYear(), cursor.getMonth()));
        pushOccurrence(atTimeOf(new Date(cursor.getFullYear(), cursor.getMonth(), day), data.firstStartsAt));
      }
    }
  }

  if (data.recurrenceType === "YEARLY") {
    for (let year = data.firstStartsAt.getFullYear(); year <= data.repeatUntil.getFullYear(); year += 1) {
      if (yearsBetween(data.firstStartsAt, new Date(year, 0, 1)) % data.interval !== 0) {
        continue;
      }

      const monthIndex = (data.month ?? data.firstStartsAt.getMonth() + 1) - 1;
      if (data.monthlyMode === "NTH_WEEKDAY") {
        const candidate = getNthWeekdayOfMonth(year, monthIndex, (data.weekday ?? data.firstStartsAt.getDay()) as Weekday, data.ordinal ?? "FIRST");
        pushOccurrence(candidate ? atTimeOf(candidate, data.firstStartsAt) : null);
      } else {
        const day = Math.min(data.dayOfMonth ?? data.firstStartsAt.getDate(), daysInMonth(year, monthIndex));
        pushOccurrence(atTimeOf(new Date(year, monthIndex, day), data.firstStartsAt));
      }
    }
  }

  occurrences.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  if (overflow) {
    throw new BookingValidationError("Die Serie ist zu lang. Maximal 80 Termine sind erlaubt.");
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
  const occurrences = generateSeriesOccurrences({ ...data, repeatUntil });
  const startsOn = occurrences[0]?.startsAt;
  const endsOn = occurrences.at(-1)?.endsAt;

  if (!startsOn || !endsOn) {
    throw new BookingValidationError("Die Serie enthält keine Termine.");
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
        recurrenceRule: buildRecurrenceRule(data),
      },
    });

    const createdBookings: Array<{ id: string; startsAt: Date; endsAt: Date }> = [];
    const skipped: Array<{ startsAt: Date; endsAt: Date; reason: string }> = [];
    const warnings: string[] = [];

    for (const occurrence of occurrences) {
      if (isExcludedOccurrence(occurrence, data.excludedDates)) {
        skipped.push({
          startsAt: occurrence.startsAt,
          endsAt: occurrence.endsAt,
          reason: "Ausnahmedatum der Serie.",
        });
        continue;
      }

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
        warnings.push(`${holiday.name}: eingeschränkter Betrieb für ${occurrence.startsAt.toLocaleDateString("de-AT")}.`);
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
