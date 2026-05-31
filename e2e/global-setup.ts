import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { e2eCatalog, e2eUsers } from "./fixtures";

const prisma = new PrismaClient();

const adminPermissions = [
  "MANAGE_USERS",
  "MANAGE_SYSTEM_JOBS",
  "VIEW_BOOKINGS",
  "APPROVE_BOOKING",
  "REJECT_BOOKING",
  "BILLING_EXPORT",
  "REQUEST_BOOKING",
  "CANCEL_OWN_BOOKING",
];

const portalPermissions = ["VIEW_PUBLIC_CALENDAR", "REQUEST_BOOKING", "CANCEL_OWN_BOOKING"];

async function upsertPermission(code: string) {
  return prisma.permission.upsert({
    where: { code },
    update: {},
    create: { code, name: code },
  });
}

async function ensureRolePermissions(roleCode: string, roleName: string, permissionCodes: string[]) {
  const role = await prisma.role.upsert({
    where: { code: roleCode },
    update: { name: roleName },
    create: { code: roleCode, name: roleName },
  });

  for (const code of permissionCodes) {
    const permission = await upsertPermission(code);
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      update: {},
      create: { roleId: role.id, permissionId: permission.id },
    });
  }

  return role;
}

async function upsertUserWithRole(input: {
  email: string;
  password: string;
  name: string;
  roleId: string;
}) {
  const passwordHash = await hash(input.password, 12);
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      displayName: input.name,
      passwordHash,
      isActive: true,
    },
    create: {
      email: input.email,
      displayName: input.name,
      passwordHash,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: input.roleId } },
    update: {},
    create: { userId: user.id, roleId: input.roleId },
  });

  return user;
}

async function ensurePortalCatalog(portalUserId: string) {
  const organizationType = await prisma.organizationType.upsert({
    where: { code: e2eCatalog.organizationTypeCode },
    update: { name: "E2E Verein" },
    create: { code: e2eCatalog.organizationTypeCode, name: "E2E Verein" },
  });

  const tariffGroup = await prisma.tariffGroup.upsert({
    where: { code: e2eCatalog.tariffGroupCode },
    update: { name: "E2E gemeinnuetzig" },
    create: { code: e2eCatalog.tariffGroupCode, name: "E2E gemeinnuetzig" },
  });

  const existingOrganization = await prisma.organization.findFirst({
    where: { name: e2eCatalog.organizationName },
  });
  const organization = existingOrganization
    ? await prisma.organization.update({
        where: { id: existingOrganization.id },
        data: {
          organizationTypeId: organizationType.id,
          tariffGroupId: tariffGroup.id,
          status: "ACTIVE",
          canRequestBookings: true,
        },
      })
    : await prisma.organization.create({
        data: {
          name: e2eCatalog.organizationName,
          organizationTypeId: organizationType.id,
          tariffGroupId: tariffGroup.id,
          status: "ACTIVE",
          canRequestBookings: true,
        },
      });

  await prisma.organizationMember.upsert({
    where: {
      id:
        (
          await prisma.organizationMember.findFirst({
            where: {
              userId: portalUserId,
              organizationId: organization.id,
              activeUntil: null,
            },
            select: { id: true },
          })
        )?.id ?? "phase14-new-membership",
    },
    update: {
      function: "E2E Kontakt",
      isPrimary: true,
      activeFrom: new Date("2026-01-01T00:00:00.000Z"),
      activeUntil: null,
    },
    create: {
      userId: portalUserId,
      organizationId: organization.id,
      function: "E2E Kontakt",
      isPrimary: true,
      activeFrom: new Date("2026-01-01T00:00:00.000Z"),
    },
  });

  const building = await prisma.building.upsert({
    where: { code: e2eCatalog.buildingCode },
    update: { name: e2eCatalog.buildingName, isActive: true },
    create: { code: e2eCatalog.buildingCode, name: e2eCatalog.buildingName, isActive: true },
  });

  await prisma.room.upsert({
    where: { code: e2eCatalog.roomCode },
    update: {
      buildingId: building.id,
      name: e2eCatalog.roomName,
      status: "ACTIVE",
      openingTime: "06:00",
      closingTime: "23:00",
      maximumBookingMinutes: 240,
      singleBookingLeadDays: 180,
    },
    create: {
      buildingId: building.id,
      code: e2eCatalog.roomCode,
      name: e2eCatalog.roomName,
      status: "ACTIVE",
      openingTime: "06:00",
      closingTime: "23:00",
      maximumBookingMinutes: 240,
      singleBookingLeadDays: 180,
    },
  });

  await prisma.usageType.upsert({
    where: { code: e2eCatalog.usageTypeCode },
    update: {
      name: e2eCatalog.usageTypeName,
      priority: 4,
      requiresApproval: true,
      mayDisplaceLowerPriority: false,
    },
    create: {
      code: e2eCatalog.usageTypeCode,
      name: e2eCatalog.usageTypeName,
      priority: 4,
      requiresApproval: true,
      mayDisplaceLowerPriority: false,
    },
  });
}

async function globalSetup() {
  const adminRole = await ensureRolePermissions("MUNICIPAL_ADMIN", "Gemeinde-Admin", adminPermissions);
  const portalRole = await ensureRolePermissions("ORGANIZATION", "Verein/Organisation", portalPermissions);

  await upsertUserWithRole({ ...e2eUsers.admin, roleId: adminRole.id });
  const portalUser = await upsertUserWithRole({ ...e2eUsers.portal, roleId: portalRole.id });
  await ensurePortalCatalog(portalUser.id);
}

export default async function setup() {
  try {
    await globalSetup();
  } finally {
    await prisma.$disconnect();
  }
}
