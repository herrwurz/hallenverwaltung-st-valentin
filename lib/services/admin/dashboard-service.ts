import { prisma } from "@/lib/prisma";

export async function getAdminDashboardSummary() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [
    requestedBookings,
    inReviewBookings,
    approvedThisMonth,
    activeWaitlistEntries,
    offeredWaitlistEntries,
    failedNotifications,
    activeBuildings,
    activeRooms,
  ] = await Promise.all([
    prisma.booking.count({ where: { status: "REQUESTED" } }),
    prisma.booking.count({ where: { status: "IN_REVIEW" } }),
    prisma.booking.count({
      where: {
        status: "APPROVED",
        startsAt: { gte: startOfMonth, lt: endOfMonth },
      },
    }),
    prisma.waitlistEntry.count({ where: { status: "ACTIVE" } }),
    prisma.waitlistEntry.count({ where: { status: "OFFERED" } }),
    prisma.notification.count({ where: { status: "FAILED" } }),
    prisma.building.count({ where: { isActive: true } }),
    prisma.room.count({ where: { status: "ACTIVE", building: { isActive: true } } }),
  ]);

  return {
    bookingReview: {
      requested: requestedBookings,
      inReview: inReviewBookings,
      totalOpen: requestedBookings + inReviewBookings,
    },
    usage: {
      approvedThisMonth,
      activeBuildings,
      activeRooms,
    },
    waitlist: {
      active: activeWaitlistEntries,
      offered: offeredWaitlistEntries,
      totalOpen: activeWaitlistEntries + offeredWaitlistEntries,
    },
    notifications: {
      failed: failedNotifications,
    },
  };
}
