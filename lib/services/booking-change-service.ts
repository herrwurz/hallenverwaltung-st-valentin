import type { BookingChangeRequestStatus, BookingStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  checkBookingConflicts,
  lockBookingApprovalContext,
  type BookingApprovalLockClient,
  type BookingConflictClient,
} from "@/lib/services/booking-conflict-service";
import { resolveBookingBlockedWindow } from "@/lib/services/booking-request-service";
import {
  assertBookingApprovalPermission,
  assertBookingDecisionNote,
  assertBookingRejectionPermission,
  assertBookingRequestPermission,
  assertOrganizationBookingAccess,
  BookingValidationError,
  validateBookingAvailability,
} from "@/lib/services/booking-rules";

export const bookingMoveRequestSchema = z.object({
  bookingId: z.string().trim().min(1, "Die Buchung ist ungültig."),
  newRoomId: z.string().trim().min(1, "Ein neuer Raum ist erforderlich."),
  newStartAt: z.coerce.date(),
  newEndAt: z.coerce.date(),
  reason: z.string().trim().min(3, "Bitte geben Sie einen Grund an.").max(1000),
});

type BookingChangeClient = Prisma.TransactionClient & BookingConflictClient & BookingApprovalLockClient;

const defaultOpenStatuses: BookingChangeRequestStatus[] = ["REQUESTED", "IN_REVIEW"];

function assertTransitionStatus(
  current: BookingChangeRequestStatus,
  expected: BookingChangeRequestStatus[],
  message: string,
) {
  if (!expected.includes(current)) {
    throw new BookingValidationError(message);
  }
}

async function assertActiveMembershipOrAdmin({
  actorUserId,
  organizationId,
  isAdmin,
  now,
  client,
}: {
  actorUserId: string;
  organizationId: string;
  isAdmin: boolean;
  now: Date;
  client: Prisma.TransactionClient;
}) {
  const membership = await client.organizationMember.findFirst({
    where: {
      userId: actorUserId,
      organizationId,
      activeFrom: { lte: now },
      OR: [{ activeUntil: null }, { activeUntil: { gt: now } }],
    },
    select: { id: true },
  });

  assertOrganizationBookingAccess({
    isAdmin,
    hasActiveMembership: Boolean(membership),
  });
}

async function validateNewSlot({
  roomId,
  startsAt,
  endsAt,
  excludeBookingId,
  now,
  client,
}: {
  roomId: string;
  startsAt: Date;
  endsAt: Date;
  excludeBookingId?: string;
  now: Date;
  client: Prisma.TransactionClient & BookingConflictClient;
}) {
  const room = await client.room.findUnique({
    where: { id: roomId },
    select: {
      status: true,
      openingTime: true,
      closingTime: true,
      maximumBookingMinutes: true,
      singleBookingLeadDays: true,
      setupBufferMinutes: true,
      teardownBufferMinutes: true,
      building: { select: { id: true, isActive: true } },
    },
  });

  if (!room || room.status !== "ACTIVE" || !room.building.isActive) {
    throw new BookingValidationError("Der ausgewählte neue Raum ist nicht aktiv buchbar.");
  }

  const { blockedFrom, blockedUntil } = resolveBookingBlockedWindow({
    startsAt,
    endsAt,
    setupBufferMinutes: room.setupBufferMinutes,
    teardownBufferMinutes: room.teardownBufferMinutes,
  });

  validateBookingAvailability({
    startsAt,
    endsAt,
    blockedFrom,
    blockedUntil,
    openingTime: room.openingTime,
    closingTime: room.closingTime,
    maximumBookingMinutes: room.maximumBookingMinutes,
    singleBookingLeadDays: room.singleBookingLeadDays,
    now,
  });

  const conflicts = await checkBookingConflicts(
    {
      roomId,
      buildingId: room.building.id,
      blockedFrom,
      blockedUntil,
      excludeBookingId,
    },
    client,
  );
  const blockingConflicts = conflicts.filter((conflict) => conflict.severity === "blocking");

  if (blockingConflicts.length) {
    throw new BookingValidationError(blockingConflicts.map((conflict) => conflict.message).join(" "), conflicts);
  }

  return { blockedFrom, blockedUntil, conflicts, buildingId: room.building.id };
}

export async function createMoveChangeRequest(
  input: unknown,
  actorUserId: string,
  options: { now?: Date; permissions?: { canRequestReschedule?: boolean; isAdmin?: boolean } } = {},
) {
  const data = bookingMoveRequestSchema.parse(input);
  const now = options.now ?? new Date();
  const [canRequestReschedule, isAdmin] = await Promise.all([
    typeof options.permissions?.canRequestReschedule === "boolean"
      ? options.permissions.canRequestReschedule
      : hasPermission(actorUserId, "REQUEST_RESCHEDULE"),
    typeof options.permissions?.isAdmin === "boolean" ? options.permissions.isAdmin : hasPermission(actorUserId, "APPROVE_BOOKING"),
  ]);
  assertBookingRequestPermission(canRequestReschedule);

  return prisma.$transaction(async (transaction) => {
    const booking = await transaction.booking.findUnique({
      where: { id: data.bookingId },
      include: { organization: true },
    });

    if (!booking || booking.status !== "APPROVED") {
      throw new BookingValidationError("Nur genehmigte Buchungen können verschoben werden.");
    }

    if (booking.organization.status !== "ACTIVE" || !booking.organization.canRequestBookings) {
      throw new BookingValidationError("Die Organisation ist nicht für Buchungen aktiv.");
    }

    await assertActiveMembershipOrAdmin({
      actorUserId,
      organizationId: booking.organizationId,
      isAdmin,
      now,
      client: transaction,
    });

    const existingOpenRequest = await transaction.bookingChangeRequest.findFirst({
      where: {
        bookingId: booking.id,
        status: { in: ["REQUESTED", "IN_REVIEW"] },
      },
      select: { id: true },
    });

    if (existingOpenRequest) {
      throw new BookingValidationError("Für diese Buchung existiert bereits ein offener Änderungsantrag.");
    }

    const slot = await validateNewSlot({
      roomId: data.newRoomId,
      startsAt: data.newStartAt,
      endsAt: data.newEndAt,
      excludeBookingId: booking.id,
      now,
      client: transaction,
    });

    const changeRequest = await transaction.bookingChangeRequest.create({
      data: {
        bookingId: booking.id,
        requestedByUserId: actorUserId,
        type: "MOVE",
        status: "REQUESTED",
        oldRoomId: booking.roomId,
        oldStartAt: booking.startsAt,
        oldEndAt: booking.endsAt,
        newRoomId: data.newRoomId,
        newStartAt: data.newStartAt,
        newEndAt: data.newEndAt,
        reason: data.reason,
      },
    });

    return { changeRequest, conflicts: slot.conflicts };
  });
}

export function resolveBookingChangeFilter(filter: string | undefined) {
  if (filter === "ALL") {
    return ["REQUESTED", "IN_REVIEW", "APPROVED", "REJECTED", "CANCELLED"] satisfies BookingChangeRequestStatus[];
  }

  if (filter === "APPROVED" || filter === "REJECTED" || filter === "CANCELLED" || filter === "REQUESTED" || filter === "IN_REVIEW") {
    return [filter] satisfies BookingChangeRequestStatus[];
  }

  return [...defaultOpenStatuses];
}

export async function getChangeRequestsForOrganization(actorUserId: string) {
  const now = new Date();
  return prisma.bookingChangeRequest.findMany({
    where: {
      booking: {
        organization: {
          members: {
            some: {
              userId: actorUserId,
              activeFrom: { lte: now },
              OR: [{ activeUntil: null }, { activeUntil: { gt: now } }],
            },
          },
        },
      },
    },
    include: {
      booking: { include: { organization: true, usageType: true } },
      oldRoom: { include: { building: true } },
      newRoom: { include: { building: true } },
      requestedBy: { select: { displayName: true, email: true } },
      decidedBy: { select: { displayName: true, email: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function getChangeRequestsForAdmin(filter: string | undefined) {
  const statuses = resolveBookingChangeFilter(filter);
  const requests = await prisma.bookingChangeRequest.findMany({
    where: { status: { in: statuses } },
    include: {
      booking: { include: { organization: true, usageType: true } },
      oldRoom: { include: { building: true } },
      newRoom: { include: { building: true } },
      requestedBy: { select: { displayName: true, email: true } },
      decidedBy: { select: { displayName: true, email: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return Promise.all(
    requests.map(async (request) => {
      const { blockedFrom, blockedUntil } = resolveBookingBlockedWindow({
        startsAt: request.newStartAt,
        endsAt: request.newEndAt,
        setupBufferMinutes: request.newRoom.setupBufferMinutes,
        teardownBufferMinutes: request.newRoom.teardownBufferMinutes,
      });

      return {
        ...request,
        conflicts:
          request.status === "REQUESTED" || request.status === "IN_REVIEW"
            ? await checkBookingConflicts({
                roomId: request.newRoomId,
                buildingId: request.newRoom.buildingId,
                blockedFrom,
                blockedUntil,
                excludeBookingId: request.bookingId,
              })
            : [],
      };
    }),
  );
}

async function updateRequestStatus({
  requestId,
  actorUserId,
  expectedStatuses,
  nextStatus,
  decisionNote,
  client,
}: {
  requestId: string;
  actorUserId: string;
  expectedStatuses: BookingChangeRequestStatus[];
  nextStatus: BookingChangeRequestStatus;
  decisionNote?: string;
  client: Prisma.TransactionClient;
}) {
  const request = await client.bookingChangeRequest.findUnique({ where: { id: requestId } });
  if (!request) {
    throw new BookingValidationError("Der Änderungsantrag wurde nicht gefunden.");
  }
  assertTransitionStatus(request.status, expectedStatuses, "Der Änderungsantrag hat inzwischen einen anderen Status.");

  const result = await client.bookingChangeRequest.updateMany({
    where: { id: requestId, status: request.status },
    data: {
      status: nextStatus,
      decisionNote: decisionNote?.trim() || null,
      decidedByUserId: actorUserId,
      decidedAt: new Date(),
    },
  });
  if (result.count !== 1) {
    throw new BookingValidationError("Der Änderungsantrag wurde zwischenzeitlich geändert. Bitte neu laden.");
  }
}

export async function markChangeRequestInReview(requestId: string, actorUserId: string) {
  const canApprove = await hasPermission(actorUserId, "APPROVE_BOOKING");
  assertBookingApprovalPermission(canApprove);

  await prisma.$transaction((transaction) =>
    updateRequestStatus({
      requestId,
      actorUserId,
      expectedStatuses: ["REQUESTED"],
      nextStatus: "IN_REVIEW",
      client: transaction,
    }),
  );
}

export async function rejectChangeRequest(requestId: string, actorUserId: string, decisionNote?: string) {
  const canReject = await hasPermission(actorUserId, "REJECT_BOOKING");
  assertBookingRejectionPermission(canReject);
  assertBookingDecisionNote(decisionNote);

  await prisma.$transaction((transaction) =>
    updateRequestStatus({
      requestId,
      actorUserId,
      expectedStatuses: ["IN_REVIEW"],
      nextStatus: "REJECTED",
      decisionNote,
      client: transaction,
    }),
  );
}

export async function approveChangeRequest(requestId: string, actorUserId: string) {
  const canApprove = await hasPermission(actorUserId, "APPROVE_BOOKING");
  assertBookingApprovalPermission(canApprove);

  return prisma.$transaction(async (transaction) => {
    const client = transaction as BookingChangeClient;
    const request = await transaction.bookingChangeRequest.findUnique({
      where: { id: requestId },
      include: {
        booking: true,
        newRoom: { select: { buildingId: true } },
      },
    });

    if (!request) {
      throw new BookingValidationError("Der Änderungsantrag wurde nicht gefunden.");
    }
    assertTransitionStatus(request.status, ["IN_REVIEW"], "Nur Anträge in Prüfung können genehmigt werden.");
    if (request.type !== "MOVE") {
      throw new BookingValidationError("Tauschanträge sind in dieser Phase nur vorbereitet und noch nicht genehmigbar.");
    }
    if (request.booking.status !== "APPROVED") {
      throw new BookingValidationError("Die Ausgangsbuchung ist nicht mehr genehmigt.");
    }

    await lockBookingApprovalContext(request.newRoomId, client);
    const slot = await validateNewSlot({
      roomId: request.newRoomId,
      startsAt: request.newStartAt,
      endsAt: request.newEndAt,
      excludeBookingId: request.bookingId,
      now: new Date(),
      client,
    });

    const moveResult = await transaction.booking.updateMany({
      where: { id: request.bookingId, status: "APPROVED" },
      data: { status: "MOVED", processedByUserId: actorUserId, processedAt: new Date() },
    });
    if (moveResult.count !== 1) {
      throw new BookingValidationError("Die Ausgangsbuchung wurde zwischenzeitlich geändert. Bitte neu laden.");
    }

    await transaction.bookingStatusHistory.create({
      data: {
        bookingId: request.bookingId,
        actorUserId,
        oldStatus: "APPROVED",
        newStatus: "MOVED",
        reason: `Verschoben durch Änderungsantrag ${request.id}.`,
        oldStartAt: request.oldStartAt,
        oldEndAt: request.oldEndAt,
        newStartAt: request.newStartAt,
        newEndAt: request.newEndAt,
      },
    });

    const replacement = await transaction.booking.create({
      data: {
        organizationId: request.booking.organizationId,
        roomId: request.newRoomId,
        usageTypeId: request.booking.usageTypeId,
        seriesId: request.booking.seriesId,
        requestedByUserId: request.requestedByUserId,
        processedByUserId: actorUserId,
        kind: request.booking.kind,
        status: "APPROVED",
        title: request.booking.title,
        description: request.booking.description,
        startsAt: request.newStartAt,
        endsAt: request.newEndAt,
        blockedFrom: slot.blockedFrom,
        blockedUntil: slot.blockedUntil,
        decisionNote: `Ersatztermin aus Änderungsantrag ${request.id}.`,
        requestedAt: request.createdAt,
        processedAt: new Date(),
      },
    });

    await transaction.bookingStatusHistory.create({
      data: {
        bookingId: replacement.id,
        actorUserId,
        oldStatus: null,
        newStatus: "APPROVED" as BookingStatus,
        reason: `Ersatztermin aus Änderungsantrag ${request.id} genehmigt.`,
        newStartAt: replacement.startsAt,
        newEndAt: replacement.endsAt,
      },
    });

    await updateRequestStatus({
      requestId,
      actorUserId,
      expectedStatuses: ["IN_REVIEW"],
      nextStatus: "APPROVED",
      decisionNote: "Verschiebung genehmigt.",
      client: transaction,
    });

    return { requestId, replacementBookingId: replacement.id };
  });
}
