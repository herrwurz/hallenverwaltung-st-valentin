import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function hasPermission(userId: string, permissionKey: string) {
  const explicitPermission = await prisma.userPermission.findFirst({
    where: {
      userId,
      permission: { code: permissionKey },
    },
    select: { granted: true },
  });

  if (explicitPermission) {
    return explicitPermission.granted;
  }

  const rolePermission = await prisma.rolePermission.findFirst({
    where: {
      permission: { code: permissionKey },
      role: { users: { some: { userId } } },
    },
    select: { roleId: true },
  });

  return Boolean(rolePermission);
}

export async function requirePermission(permissionKey: string) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!(await hasPermission(session.user.id, permissionKey))) {
    redirect("/unauthorized");
  }

  return session.user;
}
