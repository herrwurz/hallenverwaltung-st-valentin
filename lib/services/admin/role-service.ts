import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { BookingValidationError } from "@/lib/services/booking-rules";

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

function normalizePermissionIds(permissionIds: unknown) {
  const values = Array.isArray(permissionIds) ? permissionIds : [permissionIds];
  return Array.from(
    new Set(
      values
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );
}

export async function updateRolePermissions(input: { roleId: string; permissionIds: unknown }, actorUserId: string) {
  const canManageUsers = await hasPermission(actorUserId, "MANAGE_USERS");
  if (!canManageUsers) {
    throw new BookingValidationError("Für Rollen und Rechte fehlt das Recht MANAGE_USERS.");
  }

  const [role, actorIsSuperAdmin] = await Promise.all([
    prisma.role.findUnique({
      where: { id: input.roleId },
      include: { permissions: { select: { permissionId: true } } },
    }),
    prisma.userRole.findFirst({
      where: { userId: actorUserId, role: { code: "SUPER_ADMIN" } },
      select: { roleId: true },
    }),
  ]);

  if (!role) {
    throw new BookingValidationError("Die Rolle wurde nicht gefunden.");
  }

  if (role.code === "SUPER_ADMIN" && !actorIsSuperAdmin) {
    throw new BookingValidationError("SUPER_ADMIN darf ausschließlich von SUPER_ADMIN verwaltet werden.");
  }

  const nextPermissionIds = normalizePermissionIds(input.permissionIds);
  const permissions = await prisma.permission.findMany({
    where: { id: { in: nextPermissionIds } },
    select: { id: true, code: true },
  });

  if (permissions.length !== nextPermissionIds.length) {
    throw new BookingValidationError("Mindestens ein ausgewähltes Recht existiert nicht.");
  }

  if (role.code === "SUPER_ADMIN") {
    const allPermissionIds = await prisma.permission.findMany({ select: { id: true } });
    const missing = allPermissionIds.filter((permission) => !nextPermissionIds.includes(permission.id));
    if (missing.length > 0) {
      throw new BookingValidationError("SUPER_ADMIN muss alle Rechte behalten.");
    }
  }

  const currentPermissionIds = new Set(role.permissions.map((entry) => entry.permissionId));
  const nextPermissionIdSet = new Set(nextPermissionIds);
  const toCreate = nextPermissionIds.filter((permissionId) => !currentPermissionIds.has(permissionId));
  const toDelete = [...currentPermissionIds].filter((permissionId) => !nextPermissionIdSet.has(permissionId));

  return prisma.$transaction(async (transaction) => {
    if (toDelete.length > 0) {
      await transaction.rolePermission.deleteMany({
        where: {
          roleId: role.id,
          permissionId: { in: toDelete },
        },
      });
    }

    if (toCreate.length > 0) {
      await transaction.rolePermission.createMany({
        data: toCreate.map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
    }

    await transaction.auditEntry.create({
      data: {
        actorUserId,
        entityType: "Role",
        entityId: role.id,
        action: "PERMISSIONS_UPDATED",
        payload: {
          roleCode: role.code,
          addedPermissionIds: toCreate,
          removedPermissionIds: toDelete,
        },
      },
    });

    return {
      roleId: role.id,
      addedCount: toCreate.length,
      removedCount: toDelete.length,
    };
  });
}
