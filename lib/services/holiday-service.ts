import type { ClosureStatus } from "@prisma/client";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { BookingValidationError } from "@/lib/services/booking-rules";

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

export function assertHolidayPeriodRange(startsOn: Date, endsOn: Date) {
  if (!(startsOn < endsOn)) {
    throw new BookingValidationError("Der Ferienzeitraum muss ein gültiges Beginn- und Enddatum haben.");
  }
}

export async function getHolidayAdministrationData() {
  return prisma.holidayPeriod.findMany({
    orderBy: [{ startsOn: "desc" }],
  });
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
