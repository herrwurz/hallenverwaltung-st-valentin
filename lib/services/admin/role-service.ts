import { prisma } from "@/lib/prisma";

export async function getRoleAdministrationData() {
  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
          orderBy: { permission: { name: "asc" } },
        },
        _count: { select: { users: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.permission.findMany({ orderBy: { name: "asc" } }),
  ]);

  return { roles, permissions };
}
