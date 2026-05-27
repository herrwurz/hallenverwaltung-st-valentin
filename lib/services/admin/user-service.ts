import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const userSchema = z.object({
  id: z.string().trim().optional(),
  email: z.email("Eine gueltige E-Mail-Adresse ist erforderlich.").transform((email) => email.trim().toLowerCase()),
  displayName: z.string().trim().min(2, "Ein Anzeigename ist erforderlich.").max(120),
  password: z.string().optional(),
  isActive: z.boolean(),
  roleIds: z.array(z.string().trim()).default([]),
  organizationIds: z.array(z.string().trim()).default([]),
  membershipFunction: z.string().trim().min(2).max(100).default("Mitglied"),
  primaryOrganizationId: z.string().trim().optional(),
});

export async function getUserAdministrationData() {
  const [users, roles, organizations] = await Promise.all([
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
      where: { status: { not: "INACTIVE" } },
      orderBy: { name: "asc" },
    }),
  ]);

  return { users, roles, organizations };
}

export async function saveUser(input: unknown, actorUserId: string) {
  const data = userSchema.parse(input);
  const password = data.password?.trim() || undefined;

  if (!data.id && !password) {
    throw new Error("Neue Benutzer benoetigen ein Passwort.");
  }

  if (password && password.length < 12) {
    throw new Error("Das Passwort muss mindestens 12 Zeichen enthalten.");
  }

  if (data.primaryOrganizationId && !data.organizationIds.includes(data.primaryOrganizationId)) {
    throw new Error("Die primaere Organisation muss dem Benutzer zugewiesen sein.");
  }

  const passwordHash = password ? await hash(password, 12) : undefined;

  await prisma.$transaction(async (transaction) => {
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
        throw new Error("Nur Super-Admins duerfen Super-Admin-Benutzer verwalten.");
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
  });
}
