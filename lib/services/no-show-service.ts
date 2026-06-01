import type { NoShowStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { BookingValidationError } from "@/lib/services/booking-rules";
import { queueNoShowReportedNotification } from "@/lib/services/notification-service";

export const noShowReportSchema = z.object({
  bookingId: z.string().trim().min(1, "Eine Buchung ist erforderlich."),
  description: z.string().trim().min(5, "Bitte beschreiben Sie die Nichtnutzung.").max(2000),
});

export const noShowAcknowledgeSchema = z.object({
  noShowReportId: z.string().trim().min(1, "Die No-Show-Meldung ist ungültig."),
});

type NoShowPermissionState = {
  canReportNoShow: boolean;
  canViewBookings: boolean;
};

type NoShowActor = {
  id: string;
  email: string;
};

type NoShowBookingScope = {
  room: {
    caretakers: Array<{ caretaker: { userId?: string | null; email: string | null } }>;
    building: { caretakers: Array<{ caretaker: { userId?: string | null; email: string | null } }> };
  };
};

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

export function isAssignedCaretakerForBooking(actorEmail: string, booking: NoShowBookingScope) {
  const normalizedActorEmail = normalizeEmail(actorEmail);
  if (!normalizedActorEmail) {
    return false;
  }

  return [
    ...booking.room.caretakers.map(({ caretaker }) => caretaker.email),
    ...booking.room.building.caretakers.map(({ caretaker }) => caretaker.email),
  ].some((email) => normalizeEmail(email) === normalizedActorEmail);
}

export function isAssignedCaretakerUserForBooking(actorUserId: string, booking: NoShowBookingScope) {
  if (!actorUserId) {
    return false;
  }

  return [
    ...booking.room.caretakers.map(({ caretaker }) => caretaker.userId),
    ...booking.room.building.caretakers.map(({ caretaker }) => caretaker.userId),
  ].some((userId) => userId === actorUserId);
}

export function assertNoShowReportPermission({
  permissions,
  actorUserId,
  actorEmail,
  booking,
}: {
  permissions: NoShowPermissionState;
  actorUserId: string;
  actorEmail: string;
  booking: NoShowBookingScope;
}) {
  if (!permissions.canReportNoShow) {
    throw new BookingValidationError("Für No-Show-Meldungen fehlt das Recht REPORT_NO_SHOW.");
  }

  if (permissions.canViewBookings) {
    return;
  }

  if (!isAssignedCaretakerUserForBooking(actorUserId, booking) && !isAssignedCaretakerForBooking(actorEmail, booking)) {
    throw new BookingValidationError("No-Shows dürfen nur für zugeordnete Räume oder Gebäude gemeldet werden.");
  }
}

function caretakerAssignmentFilter(actor: NoShowActor): Prisma.RoomWhereInput {
  return {
    OR: [
      { caretakers: { some: { caretaker: { userId: actor.id } } } },
      { building: { caretakers: { some: { caretaker: { userId: actor.id } } } } },
      { caretakers: { some: { caretaker: { email: actor.email } } } },
      { building: { caretakers: { some: { caretaker: { email: actor.email } } } } },
    ],
  };
}

function reportableBookingWhere(now: Date, actor: NoShowActor, canViewBookings = false): Prisma.BookingWhereInput {
  return {
    status: "APPROVED",
    endsAt: { lte: now },
    noShowReport: null,
    ...(canViewBookings
      ? {}
      : {
          room: caretakerAssignmentFilter(actor),
        }),
  };
}

async function resolveNoShowActor(actorUserId: string): Promise<NoShowActor> {
  const user = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new BookingValidationError("Der Benutzer wurde nicht gefunden.");
  }

  return user;
}

async function resolveNoShowPermissions(actorUserId: string): Promise<NoShowPermissionState> {
  const [canReportNoShow, canViewBookings] = await Promise.all([
    hasPermission(actorUserId, "REPORT_NO_SHOW"),
    hasPermission(actorUserId, "VIEW_BOOKINGS"),
  ]);

  return { canReportNoShow, canViewBookings };
}

export async function getAdminNoShowData(actorUserId: string, status?: string) {
  const actor = await resolveNoShowActor(actorUserId);
  const permissions = await resolveNoShowPermissions(actorUserId);

  if (!permissions.canReportNoShow && !permissions.canViewBookings) {
    throw new BookingValidationError("Für No-Show-Workflows fehlt eine passende Berechtigung.");
  }

  const statusFilter = status === "REPORTED" || status === "ACKNOWLEDGED" ? status : undefined;
  const caretakerReportFilter: Prisma.NoShowReportWhereInput = permissions.canViewBookings
    ? {}
    : {
        room: caretakerAssignmentFilter(actor),
      };

  const [reports, reportableBookings] = await Promise.all([
    prisma.noShowReport.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...caretakerReportFilter,
      },
      include: {
        booking: { include: { usageType: true } },
        organization: true,
        room: { include: { building: true } },
        reportedBy: { select: { displayName: true, email: true } },
        acknowledgedBy: { select: { displayName: true, email: true } },
      },
      orderBy: [{ status: "asc" }, { reportedAt: "desc" }],
    }),
    prisma.booking.findMany({
      where: reportableBookingWhere(new Date(), actor, permissions.canViewBookings),
      include: {
        organization: true,
        room: { include: { building: true } },
        usageType: true,
      },
      orderBy: { endsAt: "desc" },
      take: 50,
    }),
  ]);

  return { reports, reportableBookings, selectedStatus: statusFilter, canAcknowledge: permissions.canViewBookings };
}

export async function reportNoShow(input: unknown, actorUserId: string, now = new Date()) {
  const data = noShowReportSchema.parse(input);
  const [actor, permissions] = await Promise.all([
    resolveNoShowActor(actorUserId),
    resolveNoShowPermissions(actorUserId),
  ]);

  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    include: {
      noShowReport: true,
      room: {
        include: {
          caretakers: { include: { caretaker: true } },
          building: { include: { caretakers: { include: { caretaker: true } } } },
        },
      },
    },
  });

  if (!booking) {
    throw new BookingValidationError("Die Buchung wurde nicht gefunden.");
  }

  assertNoShowReportPermission({ permissions, actorUserId: actor.id, actorEmail: actor.email, booking });

  if (booking.status !== "APPROVED") {
    throw new BookingValidationError("No-Shows können nur für genehmigte Buchungen gemeldet werden.");
  }

  if (booking.endsAt > now) {
    throw new BookingValidationError("No-Shows können erst nach dem Ende der Buchung gemeldet werden.");
  }

  if (booking.noShowReport) {
    throw new BookingValidationError("Für diese Buchung wurde bereits ein No-Show gemeldet.");
  }

  return prisma.$transaction(async (transaction) => {
    const report = await transaction.noShowReport.create({
      data: {
        bookingId: booking.id,
        organizationId: booking.organizationId,
        roomId: booking.roomId,
        reportedByUserId: actorUserId,
        description: data.description,
      },
    });

    await transaction.auditEntry.create({
      data: {
        actorUserId,
        entityType: "NoShowReport",
        entityId: report.id,
        action: "REPORTED",
        payload: {
          bookingId: booking.id,
          organizationId: booking.organizationId,
          roomId: booking.roomId,
        },
      },
    });

    await queueNoShowReportedNotification(report.id, transaction);

    return report;
  });
}

export function assertNoShowAcknowledgeTransition(status: NoShowStatus) {
  if (status !== "REPORTED") {
    throw new BookingValidationError("Nur gemeldete No-Shows können zur Kenntnis genommen werden.");
  }
}

export async function acknowledgeNoShow(input: unknown, actorUserId: string) {
  const canViewBookings = await hasPermission(actorUserId, "VIEW_BOOKINGS");
  if (!canViewBookings) {
    throw new BookingValidationError("Für die Bearbeitung von No-Shows fehlt das Recht VIEW_BOOKINGS.");
  }

  const data = noShowAcknowledgeSchema.parse(input);

  return prisma.$transaction(async (transaction) => {
    const report = await transaction.noShowReport.findUnique({ where: { id: data.noShowReportId } });
    if (!report) {
      throw new BookingValidationError("Die No-Show-Meldung wurde nicht gefunden.");
    }

    assertNoShowAcknowledgeTransition(report.status);

    const updated = await transaction.noShowReport.update({
      where: { id: data.noShowReportId },
      data: {
        status: "ACKNOWLEDGED",
        acknowledgedByUserId: actorUserId,
        acknowledgedAt: new Date(),
      },
    });

    await transaction.auditEntry.create({
      data: {
        actorUserId,
        entityType: "NoShowReport",
        entityId: updated.id,
        action: "ACKNOWLEDGED",
        payload: {
          bookingId: updated.bookingId,
          oldStatus: report.status,
          newStatus: updated.status,
        },
      },
    });

    return updated;
  });
}
