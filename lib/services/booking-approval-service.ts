import type { BookingStatus } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import {
  adminBookingFilterStatuses,
  type AdminBookingFilterKey,
  type AdminBookingFilterStatus,
} from "@/lib/booking-status";
import { prisma } from "@/lib/prisma";
import { checkBookingConflicts } from "@/lib/services/booking-conflict-service";
import {
  processPendingNotifications,
  queueBookingNotifications,
} from "@/lib/services/notification-service";
import {
  approveBooking,
  markBookingInReview,
  rejectBooking,
} from "@/lib/services/booking-transition-service";
import {
  assertBookingApprovalPermission,
  assertBookingDecisionNote,
  assertBookingRejectionPermission,
  assertBookingViewPermission,
  BookingValidationError,
} from "@/lib/services/booking-rules";

const defaultAdminStatuses: AdminBookingFilterStatus[] = ["REQUESTED", "IN_REVIEW"];
const conflictRelevantStatuses = new Set<BookingStatus>(["REQUESTED", "IN_REVIEW", "APPROVED"]);

async function dispatchNotifications(work: () => Promise<void>) {
  try {
    await work();
  } catch (error) {
    console.error("Notification dispatch failed after booking approval workflow.", error);
  }
}

type AdminWorkflowPermissions = {
  canView?: boolean;
  canApprove?: boolean;
  canReject?: boolean;
};

async function resolvePermission(override: boolean | undefined, permissionPromiseFactory: () => Promise<boolean>) {
  if (typeof override === "boolean") {
    return override;
  }

  return permissionPromiseFactory();
}

export function resolveAdminBookingFilter(filter: AdminBookingFilterKey | undefined) {
  if (filter === "ALL") {
    return [...adminBookingFilterStatuses];
  }

  if (filter && adminBookingFilterStatuses.includes(filter as AdminBookingFilterStatus)) {
    return [filter as AdminBookingFilterStatus];
  }

  return [...defaultAdminStatuses];
}

export async function getBookingsForAdmin(
  actorUserId: string,
  filter: AdminBookingFilterKey | undefined,
  permissions: AdminWorkflowPermissions = {},
) {
  const canView = await resolvePermission(permissions.canView, () => hasPermission(actorUserId, "VIEW_BOOKINGS"));
  assertBookingViewPermission(canView);

  const statuses = resolveAdminBookingFilter(filter);
  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: statuses },
    },
    include: {
      organization: true,
      room: { include: { building: true } },
      usageType: true,
      requestedBy: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      processedBy: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      statusHistory: {
        include: {
          actor: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [
      { status: "asc" },
      { requestedAt: "desc" },
      { startsAt: "asc" },
    ],
  });

  return Promise.all(
    bookings.map(async (booking) => ({
      ...booking,
      conflicts: conflictRelevantStatuses.has(booking.status)
        ? await checkBookingConflicts({
            roomId: booking.roomId,
            buildingId: booking.room.building.id,
            blockedFrom: booking.blockedFrom,
            blockedUntil: booking.blockedUntil,
            excludeBookingId: booking.id,
          })
        : [],
    })),
  );
}

export async function markBookingInReviewForAdmin(
  bookingId: string,
  actorUserId: string,
  permissions: AdminWorkflowPermissions = {},
) {
  const canApprove = await resolvePermission(permissions.canApprove, () => hasPermission(actorUserId, "APPROVE_BOOKING"));
  assertBookingApprovalPermission(canApprove);

  const booking = await markBookingInReview({
    bookingId,
    actorUserId,
  });
  await dispatchNotifications(async () => {
    await queueBookingNotifications(booking.id, "BOOKING_IN_REVIEW");
    await processPendingNotifications();
  });
  return booking;
}

export async function approveBookingForAdmin(
  {
    bookingId,
    decisionNote,
  }: {
    bookingId: string;
    decisionNote?: string;
  },
  actorUserId: string,
  permissions: AdminWorkflowPermissions = {},
) {
  const canApprove = await resolvePermission(permissions.canApprove, () => hasPermission(actorUserId, "APPROVE_BOOKING"));
  assertBookingApprovalPermission(canApprove);

  const approved = await prisma.$transaction(async (transaction) => {
    const booking = await transaction.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        roomId: true,
        blockedFrom: true,
        blockedUntil: true,
        room: { select: { buildingId: true } },
      },
    });

    if (!booking) {
      throw new BookingValidationError("Die Buchung wurde nicht gefunden.");
    }

    return approveBooking(
      {
        bookingId: booking.id,
        actorUserId,
        decisionNote,
        roomId: booking.roomId,
        buildingId: booking.room.buildingId,
        blockedFrom: booking.blockedFrom,
        blockedUntil: booking.blockedUntil,
      },
      transaction,
    );
  });
  await dispatchNotifications(async () => {
    await queueBookingNotifications(approved.id, "BOOKING_APPROVED");
    await processPendingNotifications();
  });
  return approved;
}

export async function rejectBookingForAdmin(
  {
    bookingId,
    decisionNote,
  }: {
    bookingId: string;
    decisionNote?: string;
  },
  actorUserId: string,
  permissions: AdminWorkflowPermissions = {},
) {
  const canReject = await resolvePermission(permissions.canReject, () => hasPermission(actorUserId, "REJECT_BOOKING"));
  assertBookingRejectionPermission(canReject);
  assertBookingDecisionNote(decisionNote);

  const rejected = await rejectBooking(
    {
      bookingId,
      actorUserId,
      decisionNote,
    },
  );
  await dispatchNotifications(async () => {
    await queueBookingNotifications(rejected.id, "BOOKING_REJECTED");
    await processPendingNotifications();
  });
  return rejected;
}
