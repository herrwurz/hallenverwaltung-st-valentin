import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { cancelBooking } from "@/lib/services/booking-transition-service";
import { activateNextWaitlistEntryForSlot } from "@/lib/services/waitlist-service";

export { createBookingRequest } from "@/lib/services/booking-request-service";

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

export async function cancelOwnBookingRequest(bookingId: string, actorUserId: string) {
  const cancelledBooking = await cancelBooking({
    bookingId,
    actorUserId,
    scope: { requestedByUserId: actorUserId },
  });

  const bookingSlot = await prisma.booking.findUnique({
    where: { id: cancelledBooking.id },
    select: {
      roomId: true,
      blockedFrom: true,
      blockedUntil: true,
    },
  });

  if (bookingSlot) {
    await activateNextWaitlistEntryForSlot({
      roomId: bookingSlot.roomId,
      blockedFrom: bookingSlot.blockedFrom,
      blockedUntil: bookingSlot.blockedUntil,
    });
  }

  return cancelledBooking;
}
