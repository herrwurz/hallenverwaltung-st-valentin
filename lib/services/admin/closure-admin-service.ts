import type { ClosureStatus } from "@prisma/client";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { BookingValidationError } from "@/lib/services/booking-rules";
import { validateClosureTarget } from "@/lib/services/closure-service";

const closureStatusSchema = z.enum(["OPEN", "RESTRICTED", "CLOSED"] satisfies ClosureStatus[]);

const closureSchema = z.object({
  buildingId: z.string().trim().optional(),
  roomId: z.string().trim().optional(),
  status: closureStatusSchema,
  reason: z.string().trim().min(3, "Ein Sperrgrund ist erforderlich.").max(1000),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  isPublic: z.boolean(),
});

export async function createClosure(input: unknown, actorUserId: string) {
  const canBlockRoom = await hasPermission(actorUserId, "BLOCK_ROOM");
  if (!canBlockRoom) {
    throw new BookingValidationError("Für Gebäude- und Raumsperren fehlt das Recht BLOCK_ROOM.");
  }

  const data = closureSchema.parse(input);
  const buildingId = data.buildingId || null;
  const roomId = data.roomId || null;

  validateClosureTarget({ buildingId, roomId });

  if (!(data.startsAt < data.endsAt)) {
    throw new BookingValidationError("Die Sperre muss ein gültiges Beginn- und Enddatum haben.");
  }

  return prisma.closure.create({
    data: {
      buildingId,
      roomId,
      status: data.status,
      reason: data.reason,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      isPublic: data.isPublic,
    },
  });
}

export function getClosureStatusLabel(status: ClosureStatus) {
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
