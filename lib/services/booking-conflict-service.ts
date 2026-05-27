import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  evaluateBookingConflicts,
  getConflictingRoomIds,
  type ConflictingBooking,
  type ConflictingClosure,
  type RoomCompositionLink,
} from "@/lib/services/booking-conflicts";

export type BookingConflictClient = {
  roomComposition: {
    findMany(args: {
      select: { parentRoomId: true; childRoomId: true };
    }): Promise<RoomCompositionLink[]>;
  };
  booking: {
    findMany(args: {
      where: Prisma.BookingWhereInput;
      select: {
        id: true;
        roomId: true;
        title: true;
        status: true;
        blockedFrom: true;
        blockedUntil: true;
      };
    }): Promise<ConflictingBooking[]>;
  };
  closure: {
    findMany(args: {
      where: Prisma.ClosureWhereInput;
      select: {
        id: true;
        buildingId: true;
        roomId: true;
        reason: true;
        status: true;
        startsAt: true;
        endsAt: true;
      };
    }): Promise<ConflictingClosure[]>;
  };
};

type BookingConflictLinkClient = Pick<BookingConflictClient, "roomComposition">;

export type BookingApprovalLockClient = BookingConflictLinkClient & {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
};

export async function getBookingConflictRoomIds(
  roomId: string,
  client: BookingConflictLinkClient = prisma,
) {
  const links = await client.roomComposition.findMany({
    select: { parentRoomId: true, childRoomId: true },
  });

  return [...getConflictingRoomIds(roomId, links)].sort((left, right) => left.localeCompare(right));
}

export async function lockBookingApprovalContext(
  roomId: string,
  client: BookingApprovalLockClient = prisma,
) {
  const roomIds = await getBookingConflictRoomIds(roomId, client);

  for (const lockedRoomId of roomIds) {
    await client.$queryRawUnsafe(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      `booking-approval-room:${lockedRoomId}`,
    );
  }

  return roomIds;
}

export async function checkBookingConflicts(
  {
    roomId,
    buildingId,
    blockedFrom,
    blockedUntil,
    excludeBookingId,
  }: {
    roomId: string;
    buildingId: string;
    blockedFrom: Date;
    blockedUntil: Date;
    excludeBookingId?: string;
  },
  client: BookingConflictClient = prisma,
) {
  const links = await client.roomComposition.findMany({
    select: { parentRoomId: true, childRoomId: true },
  });
  const roomIds = [...getConflictingRoomIds(roomId, links)];
  const bookingWhere: Prisma.BookingWhereInput = {
    roomId: { in: roomIds },
    status: { in: ["APPROVED", "REQUESTED", "IN_REVIEW"] },
    blockedFrom: { lt: blockedUntil },
    blockedUntil: { gt: blockedFrom },
  };

  if (excludeBookingId) {
    bookingWhere.NOT = { id: excludeBookingId };
  }

  const [bookings, closures] = await Promise.all([
    client.booking.findMany({
      where: bookingWhere,
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
