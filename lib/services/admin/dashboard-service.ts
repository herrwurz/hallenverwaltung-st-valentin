import { prisma } from "@/lib/prisma";

export async function getAdminDashboardData() {
  const [buildingCount, roomCount, organizationCount, userCount, roleCount] = await Promise.all([
    prisma.building.count(),
    prisma.room.count(),
    prisma.organization.count(),
    prisma.user.count(),
    prisma.role.count(),
  ]);

  return { buildingCount, roomCount, organizationCount, userCount, roleCount };
}
