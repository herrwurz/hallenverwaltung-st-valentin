import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  processPendingNotifications,
  queueUserAccountNotification,
} from "@/lib/services/notification-service";

const userSchema = z.object({
  id: z.string().trim().optional(),
  email: z.email("Eine gültige E-Mail-Adresse ist erforderlich.").transform((email) => email.trim().toLowerCase()),
  displayName: z.string().trim().min(2, "Ein Anzeigename ist erforderlich.").max(120),
  password: z.string().optional(),
  isActive: z.boolean(),
  roleIds: z.array(z.string().trim()).default([]),
  organizationIds: z.array(z.string().trim()).default([]),
  membershipFunction: z.string().trim().min(2).max(100).default("Mitglied"),
  primaryOrganizationId: z.string().trim().optional(),
  caretakerBuildingIds: z.array(z.string().trim()).default([]),
});

export async function getUserAdministrationData() {
  const [users, roles, organizations, standaloneCaretakers, buildings, linkedCaretakers] = await Promise.all([
    prisma.user.findMany({
      include: {
        roles: { include: { role: true } },
        organizationMemberships: {
          where: { activeUntil: null },
          include: { organization: true },
        },
      },
      orderBy: { displayName: "asc" },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    prisma.organization.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
    prisma.caretaker.findMany({
      where: { userId: null },
      include: {
        buildings: { where: { isPrimary: true }, include: { building: { select: { name: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.building.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.caretaker.findMany({
      where: { userId: { not: null } },
      include: {
        buildings: { include: { building: { select: { id: true, name: true } } } },
      },
    }),
  ]);

  const caretakerByUserId = new Map(linkedCaretakers.map((c) => [c.userId!, c]));
  const usersWithCaretaker = users.map((user) => ({ ...user, caretaker: caretakerByUserId.get(user.id) ?? null }));

  return { users: usersWithCaretaker, roles, organizations, standaloneCaretakers, buildings };
}

export async function saveUser(input: unknown, actorUserId: string) {
  const data = userSchema.parse(input);
  const password = data.password?.trim() || undefined;
  const existingUser = data.id
    ? await prisma.user.findUnique({
        where: { id: data.id },
        select: { isActive: true },
      })
    : null;

  if (!data.id && !password) {
    throw new Error("Neue Benutzer benötigen ein Passwort.");
  }

  if (password && password.length < 12) {
    throw new Error("Das Passwort muss mindestens 12 Zeichen enthalten.");
  }

  if (data.primaryOrganizationId && !data.organizationIds.includes(data.primaryOrganizationId)) {
    throw new Error("Die primäre Organisation muss dem Benutzer zugewiesen sein.");
  }

  if (data.organizationIds.length > 0) {
    const activeOrganizationCount = await prisma.organization.count({
      where: {
        id: { in: data.organizationIds },
        status: "ACTIVE",
      },
    });

    if (activeOrganizationCount !== new Set(data.organizationIds).size) {
      throw new Error("Benutzer dürfen nur aktiven Organisationen zugeordnet werden.");
    }
  }

  const passwordHash = password ? await hash(password, 12) : undefined;

  const savedUser = await prisma.$transaction(async (transaction) => {
    const superAdminRole = await transaction.role.findUnique({
      where: { code: "SUPER_ADMIN" },
      select: { id: true },
    });
    const assignsSuperAdmin = Boolean(superAdminRole && data.roleIds.includes(superAdminRole.id));
    const targetIsSuperAdmin = data.id && superAdminRole
      ? Boolean(
          await transaction.userRole.findUnique({
            where: { userId_roleId: { userId: data.id, roleId: superAdminRole.id } },
            select: { userId: true },
          }),
        )
      : false;

    if (assignsSuperAdmin || targetIsSuperAdmin) {
      const actorIsSuperAdmin = superAdminRole
        ? Boolean(
            await transaction.user.findFirst({
              where: {
                id: actorUserId,
                isActive: true,
                roles: {
                  some: {
                    roleId: superAdminRole.id,
                  },
                },
              },
              select: { id: true },
            }),
          )
        : false;

      if (!actorIsSuperAdmin) {
        throw new Error("Nur Super-Admins dürfen Super-Admin-Benutzer verwalten.");
      }
    }

    const user = data.id
      ? await transaction.user.update({
          where: { id: data.id },
          data: {
            email: data.email,
            displayName: data.displayName,
            isActive: data.isActive,
            ...(passwordHash ? { passwordHash } : {}),
          },
        })
      : await transaction.user.create({
          data: {
            email: data.email,
            displayName: data.displayName,
            passwordHash,
            isActive: data.isActive,
          },
        });

    await transaction.userRole.deleteMany({ where: { userId: user.id } });
    if (data.roleIds.length) {
      await transaction.userRole.createMany({
        data: data.roleIds.map((roleId) => ({ userId: user.id, roleId })),
      });
    }

    const assignedRoles = await transaction.role.findMany({
      where: { id: { in: data.roleIds } },
      select: { code: true },
    });
    const isCaretaker = assignedRoles.some((role) => role.code === "CARETAKER");

    if (isCaretaker) {
      const caretaker = await transaction.caretaker.upsert({
        where: { userId: user.id },
        update: {
          name: user.displayName,
          email: user.email,
          isActive: user.isActive,
        },
        create: {
          code: `USER_${user.id}`,
          userId: user.id,
          name: user.displayName,
          email: user.email,
          isActive: user.isActive,
        },
      });

      await transaction.buildingCaretaker.deleteMany({ where: { caretakerId: caretaker.id } });
      if (data.caretakerBuildingIds.length > 0) {
        await transaction.buildingCaretaker.createMany({
          data: data.caretakerBuildingIds.map((buildingId) => ({
            caretakerId: caretaker.id,
            buildingId,
            isPrimary: true,
          })),
          skipDuplicates: true,
        });
      }
    }

    const currentMemberships = await transaction.organizationMember.findMany({
      where: { userId: user.id, activeUntil: null },
    });
    const changedAt = new Date();

    for (const membership of currentMemberships) {
      if (!data.organizationIds.includes(membership.organizationId)) {
        await transaction.organizationMember.update({
          where: { id: membership.id },
          data: { activeUntil: changedAt },
        });
      }
    }

    for (const organizationId of data.organizationIds) {
      const membership = currentMemberships.find((item) => item.organizationId === organizationId);
      const membershipData = {
        function: data.membershipFunction,
        isPrimary: organizationId === data.primaryOrganizationId,
      };

      if (
        membership &&
        (membership.function !== membershipData.function || membership.isPrimary !== membershipData.isPrimary)
      ) {
        await transaction.organizationMember.update({
          where: { id: membership.id },
          data: { activeUntil: changedAt },
        });
        await transaction.organizationMember.create({
          data: { userId: user.id, organizationId, activeFrom: changedAt, ...membershipData },
        });
      } else if (!membership) {
        await transaction.organizationMember.create({
          data: { userId: user.id, organizationId, ...membershipData },
        });
      }
    }

    return user;
  });

  try {
    if (!data.id) {
      await queueUserAccountNotification(savedUser.id, "USER_ACCOUNT_CREATED", "Das Passwort wird aus Sicherheitsgründen nicht per E-Mail versendet.");
      await processPendingNotifications();
    } else if (existingUser?.isActive && !data.isActive) {
      await queueUserAccountNotification(savedUser.id, "USER_ACCOUNT_DEACTIVATED", "Das Konto wurde durch die Verwaltung deaktiviert.");
      await processPendingNotifications();
    }
  } catch (error) {
    console.error("Notification dispatch failed after user administration.", error);
  }
}
