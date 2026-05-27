import { z } from "zod";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  assertBookingRequestPermission,
  assertOrganizationBookingAccess,
  BookingValidationError,
  validateBookingAvailability,
} from "@/lib/services/booking-rules";
import { checkBookingConflicts } from "@/lib/services/booking-conflict-service";
import { cancelBooking, requestBooking } from "@/lib/services/booking-transition-service";

const bookingRequestSchema = z.object({
  organizationId: z.string().trim().min(1, "Eine Organisation ist erforderlich."),
  roomId: z.string().trim().min(1, "Ein Raum ist erforderlich."),
  usageTypeId: z.string().trim().min(1, "Ein Nutzungstyp ist erforderlich."),
  title: z.string().trim().min(2, "Ein Titel ist erforderlich.").max(160),
  description: z.string().trim().max(1000, "Die Beschreibung ist zu lang.").optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});

export async function createBookingRequest(input: unknown, actorUserId: string) {
  const data = bookingRequestSchema.parse(input);
  const [hasRequestBookingPermission, isAdmin] = await Promise.all([
    hasPermission(actorUserId, "REQUEST_BOOKING"),
    hasPermission(actorUserId, "APPROVE_BOOKING"),
  ]);
  assertBookingRequestPermission(hasRequestBookingPermission);

  return prisma.$transaction(async (transaction) => {
    const now = new Date();
    const [organization, room, usageType, membership] = await Promise.all([
      transaction.organization.findUnique({
        where: { id: data.organizationId },
        select: { status: true, canRequestBookings: true },
      }),
      transaction.room.findUnique({
        where: { id: data.roomId },
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
      }),
      transaction.usageType.findUnique({
        where: { id: data.usageTypeId },
        select: { id: true },
      }),
      transaction.organizationMember.findFirst({
        where: {
          organizationId: data.organizationId,
          userId: actorUserId,
          activeFrom: { lte: now },
          OR: [{ activeUntil: null }, { activeUntil: { gt: now } }],
        },
        select: { id: true },
      }),
    ]);

    if (!organization || organization.status !== "ACTIVE" || !organization.canRequestBookings) {
      throw new BookingValidationError("Die Organisation ist gesperrt oder fuer Buchungen nicht aktiv.");
    }

    assertOrganizationBookingAccess({ isAdmin, hasActiveMembership: Boolean(membership) });

    if (!room || room.status !== "ACTIVE" || !room.building.isActive) {
      throw new BookingValidationError("Der ausgewaehlte Raum ist nicht aktiv buchbar.");
    }

    if (!usageType) {
      throw new BookingValidationError("Der ausgewaehlte Nutzungstyp ist nicht gueltig.");
    }

    const blockedFrom = new Date(data.startsAt.getTime() - room.setupBufferMinutes * 60_000);
    const blockedUntil = new Date(data.endsAt.getTime() + room.teardownBufferMinutes * 60_000);
    validateBookingAvailability({
      startsAt: data.startsAt,
      endsAt: data.endsAt,
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
        roomId: data.roomId,
        buildingId: room.building.id,
        blockedFrom,
        blockedUntil,
      },
      transaction,
    );
    const blockingConflicts = conflicts.filter((conflict) => conflict.severity === "blocking");

    if (blockingConflicts.length) {
      throw new BookingValidationError(blockingConflicts.map((conflict) => conflict.message).join(" "), conflicts);
    }

    const booking = await requestBooking({
      actorUserId,
      organizationId: data.organizationId,
      roomId: data.roomId,
      usageTypeId: data.usageTypeId,
      title: data.title,
      description: data.description || null,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      blockedFrom,
      blockedUntil,
    }, transaction);

    return { booking, conflicts };
  });
}

export async function getBookingRequestOptions(userId: string) {
  const isAdmin = await hasPermission(userId, "APPROVE_BOOKING");
  const now = new Date();
  const organizationAccess = isAdmin
    ? {}
    : {
        members: {
          some: {
            userId,
            activeFrom: { lte: now },
            OR: [{ activeUntil: null }, { activeUntil: { gt: now } }],
          },
        },
      };

  const [organizations, buildings, usageTypes] = await Promise.all([
    prisma.organization.findMany({
      where: {
        status: "ACTIVE",
        canRequestBookings: true,
        ...organizationAccess,
      },
      orderBy: { name: "asc" },
    }),
    prisma.building.findMany({
      where: { isActive: true },
      include: {
        rooms: {
          where: { status: "ACTIVE" },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.usageType.findMany({ orderBy: [{ priority: "asc" }, { name: "asc" }] }),
  ]);

  return { organizations, buildings, usageTypes };
}

export async function getBookingsForOrganization(userId: string) {
  const now = new Date();

  return prisma.booking.findMany({
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
    include: { organization: true, room: { include: { building: true } }, usageType: true },
    orderBy: [{ startsAt: "desc" }, { requestedAt: "desc" }],
  });
}

export async function getBookingsForAdmin() {
  return prisma.booking.findMany({
    include: {
      organization: true,
      room: { include: { building: true } },
      usageType: true,
      requestedBy: true,
    },
    orderBy: [{ requestedAt: "desc" }, { startsAt: "asc" }],
  });
}

export async function cancelOwnBookingRequest(bookingId: string, actorUserId: string) {
  return cancelBooking({
    bookingId,
    actorUserId,
    scope: { requestedByUserId: actorUserId },
  });
}
