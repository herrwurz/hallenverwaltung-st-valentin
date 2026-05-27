import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  evaluateBookingConflicts,
  getConflictingRoomIds,
} from "@/lib/services/booking-conflicts";
import {
  assertOrganizationBookingAccess,
  BookingValidationError,
} from "@/lib/services/booking-rules";
import { persistBookingRequest } from "@/lib/services/booking-write";

const bookingRequestSchema = z.object({
  organizationId: z.string().trim().min(1, "Eine Organisation ist erforderlich."),
  roomId: z.string().trim().min(1, "Ein Raum ist erforderlich."),
  usageTypeId: z.string().trim().min(1, "Ein Nutzungstyp ist erforderlich."),
  title: z.string().trim().min(2, "Ein Titel ist erforderlich.").max(160),
  description: z.string().trim().max(1000, "Die Beschreibung ist zu lang.").optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});

type BookingConflictClient = Pick<Prisma.TransactionClient, "roomComposition" | "booking" | "closure">;

export async function checkBookingConflicts(
  {
    roomId,
    buildingId,
    blockedFrom,
    blockedUntil,
  }: {
    roomId: string;
    buildingId: string;
    blockedFrom: Date;
    blockedUntil: Date;
  },
  client: BookingConflictClient = prisma,
) {
  const links = await client.roomComposition.findMany({
    select: { parentRoomId: true, childRoomId: true },
  });
  const roomIds = [...getConflictingRoomIds(roomId, links)];
  const [bookings, closures] = await Promise.all([
    client.booking.findMany({
      where: {
        roomId: { in: roomIds },
        status: { in: ["APPROVED", "REQUESTED", "IN_REVIEW"] },
        blockedFrom: { lt: blockedUntil },
        blockedUntil: { gt: blockedFrom },
      },
      select: {
        id: true,
        roomId: true,
        title: true,
        status: true,
        blockedFrom: true,
        blockedUntil: true,
      },
    }),
    client.closure.findMany({
      where: {
        status: { in: ["RESTRICTED", "CLOSED"] },
        startsAt: { lt: blockedUntil },
        endsAt: { gt: blockedFrom },
        OR: [{ buildingId }, { roomId: { in: roomIds } }],
      },
      select: {
        id: true,
        buildingId: true,
        roomId: true,
        reason: true,
        status: true,
        startsAt: true,
        endsAt: true,
      },
    }),
  ]);

  return evaluateBookingConflicts({
    roomId,
    buildingId,
    blockedFrom,
    blockedUntil,
    links,
    bookings,
    closures,
  });
}

export async function createBookingRequest(input: unknown, actorUserId: string) {
  const data = bookingRequestSchema.parse(input);

  if (!(data.startsAt < data.endsAt)) {
    throw new BookingValidationError("Der Beginn muss vor dem Ende liegen.");
  }

  const isAdmin = await hasPermission(actorUserId, "APPROVE_BOOKING");

  return prisma.$transaction(async (transaction) => {
    const [organization, room, usageType, membership] = await Promise.all([
      transaction.organization.findUnique({
        where: { id: data.organizationId },
        select: { status: true, canRequestBookings: true },
      }),
      transaction.room.findUnique({
        where: { id: data.roomId },
        select: {
          status: true,
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
          activeFrom: { lte: new Date() },
          OR: [{ activeUntil: null }, { activeUntil: { gt: new Date() } }],
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

    const booking = await persistBookingRequest(transaction, {
      organizationId: data.organizationId,
      roomId: data.roomId,
      usageTypeId: data.usageTypeId,
      requestedByUserId: actorUserId,
      kind: "SINGLE",
      status: "REQUESTED",
      title: data.title,
      description: data.description || null,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      blockedFrom,
      blockedUntil,
    });

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
  return prisma.$transaction(async (transaction) => {
    const booking = await transaction.booking.findFirst({
      where: { id: bookingId, requestedByUserId: actorUserId },
      select: { id: true, status: true, startsAt: true, endsAt: true },
    });

    if (!booking) {
      throw new BookingValidationError("Der Buchungsantrag wurde nicht gefunden.");
    }

    if (booking.status !== "REQUESTED") {
      throw new BookingValidationError("Nur beantragte Buchungen koennen storniert werden.");
    }

    const cancelled = await transaction.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED", cancellationNote: "Vom Antragsteller storniert." },
    });

    await transaction.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        actorUserId,
        oldStatus: "REQUESTED",
        newStatus: "CANCELLED",
        reason: "Vom Antragsteller storniert.",
        oldStartAt: booking.startsAt,
        oldEndAt: booking.endsAt,
        newStartAt: booking.startsAt,
        newEndAt: booking.endsAt,
      },
    });

    return cancelled;
  });
}
