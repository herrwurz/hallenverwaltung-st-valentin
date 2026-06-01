import type { ClosureStatus } from "@prisma/client";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { BookingValidationError } from "@/lib/services/booking-rules";

export const holidayPeriodSchema = z.object({
  name: z.string().trim().min(2, "Ein Name ist erforderlich.").max(160),
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
      startsOn: data.startsOn,
      endsOn: data.endsOn,
      defaultStatus: data.defaultStatus,
      reason: data.reason,
      isPublic: data.isPublic,
    },
  });
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
