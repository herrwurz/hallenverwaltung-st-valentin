import type { ClosureStatus } from "@prisma/client";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { BookingValidationError } from "@/lib/services/booking-rules";
import { createClosure } from "@/lib/services/admin/closure-admin-service";

export const holidayCountryOptions = [
  { code: "AT", label: "Österreich" },
] as const;

export const holidayRegionOptions = [
  { code: "AT-B", label: "Burgenland" },
  { code: "AT-K", label: "Kärnten" },
  { code: "AT-NO", label: "Niederösterreich" },
  { code: "AT-OO", label: "Oberösterreich" },
  { code: "AT-S", label: "Salzburg" },
  { code: "AT-ST", label: "Steiermark" },
  { code: "AT-T", label: "Tirol" },
  { code: "AT-V", label: "Vorarlberg" },
  { code: "AT-W", label: "Wien" },
] as const;

const holidayCountryCodes = holidayCountryOptions.map((country) => country.code);
const holidayRegionCodes = holidayRegionOptions.map((region) => region.code);

const presetKeys = ["AT_PUBLIC_HOLIDAYS", "AT_NO_SCHOOL_HOLIDAYS", "AT_NO_ALL"] as const;

export const holidayPresetOptions = [
  { key: "AT_PUBLIC_HOLIDAYS", label: "Gesetzliche Feiertage Österreich" },
  { key: "AT_NO_SCHOOL_HOLIDAYS", label: "Schulferien Niederösterreich" },
  { key: "AT_NO_ALL", label: "Feiertage + Schulferien Niederösterreich" },
] as const;

const presetYearOptions = [2026, 2027, 2028] as const;

export const holidayPresetYearOptions = presetYearOptions.map((year) => ({ value: year, label: String(year) }));

export const holidayPeriodSchema = z.object({
  name: z.string().trim().min(2, "Ein Name ist erforderlich.").max(160),
  countryCode: z.enum(holidayCountryCodes as [string, ...string[]]).default("AT"),
  regionCode: z
    .preprocess((value) => (value === null || value === "" ? undefined : value), z.enum(holidayRegionCodes as [string, ...string[]]).optional()),
  startsOn: z.coerce.date(),
  endsOn: z.coerce.date(),
  defaultStatus: z.enum(["OPEN", "RESTRICTED", "CLOSED"] satisfies ClosureStatus[]),
  reason: z.string().trim().min(3, "Ein Grund ist erforderlich.").max(1000),
  isPublic: z.coerce.boolean().default(true),
});

export const holidayPresetSchema = z.object({
  presetKey: z.enum(presetKeys),
  year: z.coerce.number().int().min(2026).max(2035),
  defaultStatus: z.enum(["OPEN", "RESTRICTED", "CLOSED"] satisfies ClosureStatus[]).default("OPEN"),
  isPublic: z.coerce.boolean().default(true),
});

const holidayClosureSchema = z.object({
  holidayId: z.string().trim().min(1),
  buildingId: z.string().trim().optional(),
  roomId: z.string().trim().optional(),
  status: z.enum(["RESTRICTED", "CLOSED"] satisfies ClosureStatus[]).default("CLOSED"),
  reason: z.string().trim().max(1000).optional(),
  isPublic: z.boolean(),
});

export function assertHolidayPeriodRange(startsOn: Date, endsOn: Date) {
  if (!(startsOn < endsOn)) {
    throw new BookingValidationError("Der Ferienzeitraum muss ein gültiges Beginn- und Enddatum haben.");
  }
}

export async function getHolidayAdministrationData() {
  const [holidays, buildings] = await Promise.all([
    prisma.holidayPeriod.findMany({
      orderBy: [{ startsOn: "desc" }],
    }),
    prisma.building.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        rooms: {
          where: { status: { in: ["ACTIVE", "RESTRICTED"] } },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        },
      },
    }),
  ]);

  return { holidays, buildings };
}

function startOfDate(year: number, monthIndex: number, day: number) {
  return new Date(year, monthIndex, day, 0, 0, 0, 0);
}

function endAfterDate(year: number, monthIndex: number, day: number) {
  return new Date(year, monthIndex, day + 1, 0, 0, 0, 0);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return startOfDate(year, month - 1, day);
}

function firstMondayOfFebruary(year: number) {
  const date = startOfDate(year, 1, 1);
  while (date.getDay() !== 1) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

function firstSaturdayOfJuly(year: number) {
  const date = startOfDate(year, 6, 1);
  while (date.getDay() !== 6) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

function sundayBeforeFirstMondayOfSeptember(year: number) {
  const date = startOfDate(year, 8, 1);
  while (date.getDay() !== 1) {
    date.setDate(date.getDate() + 1);
  }
  date.setDate(date.getDate() - 1);
  return date;
}

type HolidayPresetPeriod = {
  name: string;
  countryCode: string;
  regionCode?: string | null;
  startsOn: Date;
  endsOn: Date;
  defaultStatus: ClosureStatus;
  reason: string;
  isPublic: boolean;
};

function buildPublicHolidayPresets(year: number, defaultStatus: ClosureStatus, isPublic: boolean): HolidayPresetPeriod[] {
  const easter = easterSunday(year);
  const fixed = [
    ["Neujahr", 0, 1],
    ["Heilige Drei Könige", 0, 6],
    ["Staatsfeiertag", 4, 1],
    ["Mariä Himmelfahrt", 7, 15],
    ["Nationalfeiertag", 9, 26],
    ["Allerheiligen", 10, 1],
    ["Mariä Empfängnis", 11, 8],
    ["Christtag", 11, 25],
    ["Stefanitag", 11, 26],
  ] as const;
  const movable = [
    ["Ostermontag", addDays(easter, 1)],
    ["Christi Himmelfahrt", addDays(easter, 39)],
    ["Pfingstmontag", addDays(easter, 50)],
    ["Fronleichnam", addDays(easter, 60)],
  ] as const;

  return [
    ...fixed.map(([name, monthIndex, day]) => ({
      name: `${name} ${year}`,
      countryCode: "AT",
      regionCode: null,
      startsOn: startOfDate(year, monthIndex, day),
      endsOn: endAfterDate(year, monthIndex, day),
      defaultStatus,
      reason: "Gesetzlicher Feiertag Österreich.",
      isPublic,
    })),
    ...movable.map(([name, date]) => ({
      name: `${name} ${year}`,
      countryCode: "AT",
      regionCode: null,
      startsOn: date,
      endsOn: addDays(date, 1),
      defaultStatus,
      reason: "Gesetzlicher Feiertag Österreich.",
      isPublic,
    })),
  ];
}

function buildLowerAustriaSchoolHolidayPresets(year: number, defaultStatus: ClosureStatus, isPublic: boolean): HolidayPresetPeriod[] {
  const easter = easterSunday(year);
  const semesterStart = firstMondayOfFebruary(year);
  const summerStart = firstSaturdayOfJuly(year);
  const summerEnd = sundayBeforeFirstMondayOfSeptember(year);
  const pentecostSaturday = addDays(easter, 48);

  return [
    {
      name: `Semesterferien Niederösterreich ${year}`,
      countryCode: "AT",
      regionCode: "AT-NO",
      startsOn: semesterStart,
      endsOn: addDays(semesterStart, 7),
      defaultStatus,
      reason: "Schulferien Niederösterreich.",
      isPublic,
    },
    {
      name: `Osterferien Niederösterreich ${year}`,
      countryCode: "AT",
      regionCode: "AT-NO",
      startsOn: addDays(easter, -8),
      endsOn: addDays(easter, 2),
      defaultStatus,
      reason: "Schulferien Niederösterreich.",
      isPublic,
    },
    {
      name: `Pfingstferien Niederösterreich ${year}`,
      countryCode: "AT",
      regionCode: "AT-NO",
      startsOn: pentecostSaturday,
      endsOn: addDays(pentecostSaturday, 3),
      defaultStatus,
      reason: "Schulferien Niederösterreich.",
      isPublic,
    },
    {
      name: `Sommerferien Niederösterreich ${year}`,
      countryCode: "AT",
      regionCode: "AT-NO",
      startsOn: summerStart,
      endsOn: addDays(summerEnd, 1),
      defaultStatus,
      reason: "Schulferien Niederösterreich.",
      isPublic,
    },
    {
      name: `Herbstferien Niederösterreich ${year}`,
      countryCode: "AT",
      regionCode: "AT-NO",
      startsOn: startOfDate(year, 9, 26),
      endsOn: endAfterDate(year, 10, 2),
      defaultStatus,
      reason: "Schulferien Niederösterreich inklusive angrenzender Feiertage.",
      isPublic,
    },
    {
      name: `Weihnachtsferien Niederösterreich ${year}/${year + 1}`,
      countryCode: "AT",
      regionCode: "AT-NO",
      startsOn: startOfDate(year, 11, 24),
      endsOn: endAfterDate(year + 1, 0, 6),
      defaultStatus,
      reason: "Schulferien Niederösterreich.",
      isPublic,
    },
  ];
}

export function buildHolidayPresetPeriods(input: unknown) {
  const data = holidayPresetSchema.parse(input);
  const publicHolidays = buildPublicHolidayPresets(data.year, data.defaultStatus, data.isPublic);
  const schoolHolidays = buildLowerAustriaSchoolHolidayPresets(data.year, data.defaultStatus, data.isPublic);

  if (data.presetKey === "AT_PUBLIC_HOLIDAYS") {
    return publicHolidays;
  }

  if (data.presetKey === "AT_NO_SCHOOL_HOLIDAYS") {
    return schoolHolidays;
  }

  return [...publicHolidays, ...schoolHolidays];
}

export async function importHolidayPreset(input: unknown, actorUserId: string) {
  const canBlockRoom = await hasPermission(actorUserId, "BLOCK_ROOM");
  if (!canBlockRoom) {
    throw new BookingValidationError("Für Ferien- und Sperrzeiten fehlt das Recht BLOCK_ROOM.");
  }

  const periods = buildHolidayPresetPeriods(input);
  let createdCount = 0;
  let skippedCount = 0;

  for (const period of periods) {
    const existing = await prisma.holidayPeriod.findFirst({
      where: {
        name: period.name,
        countryCode: period.countryCode,
        regionCode: period.regionCode ?? null,
        startsOn: period.startsOn,
        endsOn: period.endsOn,
      },
      select: { id: true },
    });

    if (existing) {
      skippedCount += 1;
      continue;
    }

    await prisma.holidayPeriod.create({
      data: {
        name: period.name,
        countryCode: period.countryCode,
        regionCode: period.regionCode ?? null,
        startsOn: period.startsOn,
        endsOn: period.endsOn,
        defaultStatus: period.defaultStatus,
        reason: period.reason,
        isPublic: period.isPublic,
      },
    });
    createdCount += 1;
  }

  return { createdCount, skippedCount };
}

export async function saveHolidayPeriod(input: unknown, actorUserId: string) {
  const canBlockRoom = await hasPermission(actorUserId, "BLOCK_ROOM");
  if (!canBlockRoom) {
    throw new BookingValidationError("Für Ferien- und Sperrzeiten fehlt das Recht BLOCK_ROOM.");
  }

  const data = holidayPeriodSchema.parse(input);
  assertHolidayPeriodRange(data.startsOn, data.endsOn);

  return prisma.holidayPeriod.create({
    data: {
      name: data.name,
      countryCode: data.countryCode,
      regionCode: data.regionCode ?? null,
      startsOn: data.startsOn,
      endsOn: data.endsOn,
      defaultStatus: data.defaultStatus,
      reason: data.reason,
      isPublic: data.isPublic,
    },
  });
}

export async function createClosureFromHolidayPeriod(input: unknown, actorUserId: string) {
  const canBlockRoom = await hasPermission(actorUserId, "BLOCK_ROOM");
  if (!canBlockRoom) {
    throw new BookingValidationError("FÃ¼r Ferien- und Sperrzeiten fehlt das Recht BLOCK_ROOM.");
  }

  const data = holidayClosureSchema.parse(input);
  const holiday = await prisma.holidayPeriod.findUnique({
    where: { id: data.holidayId },
    select: {
      name: true,
      startsOn: true,
      endsOn: true,
      reason: true,
    },
  });

  if (!holiday) {
    throw new BookingValidationError("Der Ferienzeitraum wurde nicht gefunden.");
  }

  return createClosure(
    {
      buildingId: data.buildingId,
      roomId: data.roomId,
      status: data.status,
      reason: data.reason || `${holiday.name}: ${holiday.reason}`,
      startsAt: holiday.startsOn,
      endsAt: holiday.endsOn,
      isAllDay: false,
      isPublic: data.isPublic,
    },
    actorUserId,
  );
}

export function getHolidayScopeLabel(countryCode: string, regionCode: string | null) {
  const country = holidayCountryOptions.find((option) => option.code === countryCode)?.label ?? countryCode;
  const region = regionCode ? holidayRegionOptions.find((option) => option.code === regionCode)?.label ?? regionCode : "bundesweit";

  return `${country} · ${region}`;
}

export function getHolidayStatusLabel(status: ClosureStatus) {
  switch (status) {
    case "OPEN":
      return "Geöffnet";
    case "RESTRICTED":
      return "Eingeschränkt";
    case "CLOSED":
      return "Gesperrt";
    default:
      return status;
  }
}
