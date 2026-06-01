import type { DamageStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { BookingValidationError } from "@/lib/services/booking-rules";
import { queueDamageReportedNotification } from "@/lib/services/notification-service";

export const damageReportSchema = z.object({
  roomId: z.string().trim().min(1, "Ein Raum ist erforderlich."),
  description: z.string().trim().min(5, "Bitte beschreiben Sie den Schaden.").max(2000),
  photoStorageKey: z.string().trim().max(500).optional(),
});

export const damageStatusSchema = z.object({
  damageReportId: z.string().trim().min(1, "Die Schadensmeldung ist ungültig."),
  status: z.enum(["REPORTED", "IN_REVIEW", "RESOLVED"] satisfies DamageStatus[]),
});

type DamageClient = Prisma.TransactionClient | typeof prisma;

const allowedDamageTransitions: Record<DamageStatus, DamageStatus[]> = {
  REPORTED: ["IN_REVIEW", "RESOLVED"],
  IN_REVIEW: ["RESOLVED"],
  RESOLVED: [],
};

export async function getPortalDamageData(actorUserId: string) {
  const [reports, buildings] = await Promise.all([
    prisma.damageReport.findMany({
      where: { reportedByUserId: actorUserId },
      include: {
        room: { include: { building: true } },
        processedBy: { select: { displayName: true, email: true } },
      },
      orderBy: { reportedAt: "desc" },
    }),
    prisma.building.findMany({
      where: { isActive: true },
      include: { rooms: { where: { status: "ACTIVE" }, orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return { reports, buildings };
}

export async function getAdminDamageData(status?: string) {
  const statusFilter =
    status === "REPORTED" || status === "IN_REVIEW" || status === "RESOLVED" ? status : undefined;

  const reports = await prisma.damageReport.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    include: {
      room: { include: { building: true } },
      reportedBy: { select: { displayName: true, email: true } },
      processedBy: { select: { displayName: true, email: true } },
    },
    orderBy: [{ status: "asc" }, { reportedAt: "desc" }],
  });

  return { reports, selectedStatus: statusFilter };
}

export async function reportDamage(input: unknown, actorUserId: string) {
  const canReportDamage = await hasPermission(actorUserId, "REPORT_DAMAGE");
  if (!canReportDamage) {
    throw new BookingValidationError("Für Schadensmeldungen fehlt das Recht REPORT_DAMAGE.");
  }

  const data = damageReportSchema.parse(input);
  const room = await prisma.room.findUnique({
    where: { id: data.roomId },
    select: { id: true, status: true, building: { select: { isActive: true } } },
  });

  if (!room || room.status === "OUT_OF_SERVICE" || !room.building.isActive) {
    throw new BookingValidationError("Der ausgewählte Raum kann für Schadensmeldungen nicht verwendet werden.");
  }

  return prisma.$transaction(async (transaction) => {
    const damage = await transaction.damageReport.create({
      data: {
        roomId: data.roomId,
        reportedByUserId: actorUserId,
        description: data.description,
        photoStorageKey: data.photoStorageKey || null,
      },
    });

    await transaction.auditEntry.create({
      data: {
        actorUserId,
        entityType: "DamageReport",
        entityId: damage.id,
        action: "REPORTED",
        payload: {
          roomId: data.roomId,
          photoAttached: Boolean(data.photoStorageKey),
        },
      },
    });

    await queueDamageReportedNotification(damage.id, transaction);

    return damage;
  });
}

export function assertDamageTransition(currentStatus: DamageStatus, nextStatus: DamageStatus) {
  if (currentStatus === nextStatus) {
    return;
  }

  if (!allowedDamageTransitions[currentStatus].includes(nextStatus)) {
    throw new BookingValidationError("Dieser Statuswechsel für die Schadensmeldung ist nicht erlaubt.");
  }
}

async function writeDamageStatusAudit({
  damageReportId,
  actorUserId,
  oldStatus,
  newStatus,
  client,
}: {
  damageReportId: string;
  actorUserId: string;
  oldStatus: DamageStatus;
  newStatus: DamageStatus;
  client: DamageClient;
}) {
  await client.auditEntry.create({
    data: {
      actorUserId,
      entityType: "DamageReport",
      entityId: damageReportId,
      action: "STATUS_CHANGED",
      payload: {
        oldStatus,
        newStatus,
      },
    },
  });
}

export async function updateDamageStatus(input: unknown, actorUserId: string) {
  const canManageDamage = await hasPermission(actorUserId, "MANAGE_DAMAGE");
  if (!canManageDamage) {
    throw new BookingValidationError("Für die Schadensbearbeitung fehlt das Recht MANAGE_DAMAGE.");
  }

  const data = damageStatusSchema.parse(input);
  return prisma.$transaction(async (transaction) => {
    const damage = await transaction.damageReport.findUnique({ where: { id: data.damageReportId } });
    if (!damage) {
      throw new BookingValidationError("Die Schadensmeldung wurde nicht gefunden.");
    }

    assertDamageTransition(damage.status, data.status);

    const updated = await transaction.damageReport.update({
      where: { id: data.damageReportId },
      data: {
        status: data.status,
        processedByUserId: actorUserId,
        resolvedAt: data.status === "RESOLVED" ? new Date() : damage.resolvedAt,
      },
    });

    await writeDamageStatusAudit({
      damageReportId: updated.id,
      actorUserId,
      oldStatus: damage.status,
      newStatus: updated.status,
      client: transaction,
    });

    return updated;
  });
}
