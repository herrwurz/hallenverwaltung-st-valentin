import type { ClosureStatus } from "@prisma/client";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { BookingValidationError } from "@/lib/services/booking-rules";
import { validateClosureTarget } from "@/lib/services/closure-service";
import {
  processPendingNotifications,
  queueClosureCreatedNotification,
} from "@/lib/services/notification-service";

const closureStatusSchema = z.enum(["OPEN", "RESTRICTED", "CLOSED"] satisfies ClosureStatus[]);
const optionalDateSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.date().optional(),
);

const closureSchema = z.object({
  buildingId: z.string().trim().optional(),
  roomId: z.string().trim().optional(),
  status: closureStatusSchema,
  reason: z.string().trim().min(3, "Ein Sperrgrund ist erforderlich.").max(1000),
  startsAt: optionalDateSchema,
  endsAt: optionalDateSchema,
  startsOn: optionalDateSchema,
  endsOn: optionalDateSchema,
  isAllDay: z.boolean().default(false),
  isPublic: z.boolean(),
});

const closureUpdateSchema = closureSchema
  .omit({
    buildingId: true,
    roomId: true,
  })
  .extend({
    id: z.string().trim().min(1),
  });

const closureDeleteSchema = z.object({
  id: z.string().trim().min(1),
});

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function nextLocalDay(date: Date) {
  const next = startOfLocalDay(date);
  next.setDate(next.getDate() + 1);
  return next;
}

export function resolveClosureRange(data: z.infer<typeof closureSchema>) {
  if (!data.isAllDay) {
    if (!data.startsAt || !data.endsAt) {
      throw new BookingValidationError("Die Sperre muss ein gültiges Beginn- und Enddatum haben.");
    }

    return { startsAt: data.startsAt, endsAt: data.endsAt };
  }

  if (!data.startsOn) {
    throw new BookingValidationError("Für ganztägige Sperren ist ein Datum erforderlich.");
  }

  const startsAt = startOfLocalDay(data.startsOn);
  const endsAt = data.endsOn ? nextLocalDay(data.endsOn) : nextLocalDay(data.startsOn);

  return { startsAt, endsAt };
}

export async function createClosure(input: unknown, actorUserId: string) {
  const canBlockRoom = await hasPermission(actorUserId, "BLOCK_ROOM");
  if (!canBlockRoom) {
    throw new BookingValidationError("Für Gebäude- und Raumsperren fehlt das Recht BLOCK_ROOM.");
  }

  const data = closureSchema.parse(input);
  const buildingId = data.buildingId || null;
  const roomId = data.roomId || null;

  validateClosureTarget({ buildingId, roomId });

  const { startsAt, endsAt } = resolveClosureRange(data);

  if (!(startsAt < endsAt)) {
    throw new BookingValidationError("Die Sperre muss ein gültiges Beginn- und Enddatum haben.");
  }

  const closure = await prisma.closure.create({
    data: {
      buildingId,
      roomId,
      status: data.status,
      reason: data.reason,
      startsAt,
      endsAt,
      isPublic: data.isPublic,
    },
  });

  try {
    await queueClosureCreatedNotification(closure.id);
    await processPendingNotifications();
  } catch (error) {
    console.error("Notification dispatch failed after closure creation.", error);
  }

  return closure;
}

export async function updateClosure(input: unknown, actorUserId: string) {
  const canBlockRoom = await hasPermission(actorUserId, "BLOCK_ROOM");
  if (!canBlockRoom) {
    throw new BookingValidationError("Für Gebäude- und Raumsperren fehlt das Recht BLOCK_ROOM.");
  }

  const data = closureUpdateSchema.parse(input);
  const { startsAt, endsAt } = resolveClosureRange(data);

  if (!(startsAt < endsAt)) {
    throw new BookingValidationError("Die Sperre muss ein gültiges Beginn- und Enddatum haben.");
  }

  const updatedClosure = await prisma.closure.update({
    where: { id: data.id },
    data: {
      status: data.status,
      reason: data.reason,
      startsAt,
      endsAt,
      isPublic: data.isPublic,
    },
  });

  try {
    await queueClosureCreatedNotification(updatedClosure.id);
    await processPendingNotifications();
  } catch (error) {
    console.error("Notification dispatch failed after closure update.", error);
  }

  return updatedClosure;
}

export async function deleteClosure(input: unknown, actorUserId: string) {
  const canBlockRoom = await hasPermission(actorUserId, "BLOCK_ROOM");
  if (!canBlockRoom) {
    throw new BookingValidationError("Für Gebäude- und Raumsperren fehlt das Recht BLOCK_ROOM.");
  }

  const data = closureDeleteSchema.parse(input);

  await prisma.closure.delete({
    where: { id: data.id },
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
