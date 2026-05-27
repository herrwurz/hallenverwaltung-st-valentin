import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function hasPermission(userId: string, permissionKey: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true },
  });

  if (!user?.isActive) {
    return false;
  }

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

export async function requireActiveSession() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      isActive: true,
      roles: {
        select: { role: { select: { code: true } } },
      },
    },
  });

  if (!currentUser?.isActive) {
    redirect("/unauthorized");
  }

  return {
    ...session.user,
    roles: currentUser.roles.map(({ role }) => role.code),
  };
}

export async function requirePermission(permissionKey: string) {
  const user = await requireActiveSession();

  if (!(await hasPermission(user.id, permissionKey))) {
    redirect("/unauthorized");
  }

  return user;
}
