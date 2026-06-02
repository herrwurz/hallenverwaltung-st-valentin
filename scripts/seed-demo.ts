import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function hideLocalTestArtifacts() {
  const testBuildingCodes = ["E2E_BUILDING", "TEST_ANDI"];

  await prisma.room.updateMany({
    where: { building: { code: { in: testBuildingCodes } } },
    data: { status: "OUT_OF_SERVICE" },
  });
  await prisma.building.updateMany({
    where: { code: { in: testBuildingCodes } },
    data: { isActive: false },
  });
}

const demoUsers = {
  admin: {
    email: "demo.admin@example.test",
    password: "DemoAdminPassword!2026",
    displayName: "Demo Gemeinde-Admin",
    roleCode: "MUNICIPAL_ADMIN",
  },
  portal: {
    email: "demo.verein@example.test",
    password: "DemoVereinPassword!2026",
    displayName: "Demo Vereinskontakt",
    roleCode: "ORGANIZATION",
  },
  caretaker: {
    email: "demo.hallenwart@example.test",
    password: "DemoHallenwartPassword!2026",
    displayName: "Demo Hallenwart",
    roleCode: "CARETAKER",
  },
} as const;

async function upsertUserWithRole(userInput: (typeof demoUsers)[keyof typeof demoUsers]) {
  const role = await prisma.role.findUnique({
    where: { code: userInput.roleCode },
  });

  if (!role) {
    throw new Error(`Role ${userInput.roleCode} not found. Run npm run db:seed before npm run demo:seed.`);
  }

  const user = await prisma.user.upsert({
    where: { email: userInput.email },
    update: {
      displayName: userInput.displayName,
      passwordHash: await hash(userInput.password, 12),
      isActive: true,
    },
    create: {
      email: userInput.email,
      displayName: userInput.displayName,
      passwordHash: await hash(userInput.password, 12),
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });

  return user;
}

async function ensureDemoOrganization(portalUserId: string) {
  const organizationType = await prisma.organizationType.findUniqueOrThrow({
    where: { code: "ASSOCIATION" },
  });
  const tariffGroup = await prisma.tariffGroup.findUniqueOrThrow({
    where: { code: "NON_PROFIT" },
  });

  const existingOrganization = await prisma.organization.findFirst({
    where: { name: "Demo Sportverein St. Valentin" },
    select: { id: true },
  });
  const organization = existingOrganization
    ? await prisma.organization.update({
        where: { id: existingOrganization.id },
        data: {
          organizationTypeId: organizationType.id,
          tariffGroupId: tariffGroup.id,
          status: "ACTIVE",
          canRequestBookings: true,
          isBillingRelevant: true,
        },
      })
    : await prisma.organization.create({
        data: {
          name: "Demo Sportverein St. Valentin",
          organizationTypeId: organizationType.id,
          tariffGroupId: tariffGroup.id,
          status: "ACTIVE",
          canRequestBookings: true,
          isBillingRelevant: true,
        },
      });

  const existingMembership = await prisma.organizationMember.findFirst({
    where: {
      userId: portalUserId,
      organizationId: organization.id,
      activeUntil: null,
    },
    select: { id: true },
  });

  if (existingMembership) {
    await prisma.organizationMember.update({
      where: { id: existingMembership.id },
      data: { function: "Demo Kontakt", isPrimary: true },
    });
  } else {
    await prisma.organizationMember.create({
      data: {
        userId: portalUserId,
        organizationId: organization.id,
        function: "Demo Kontakt",
        isPrimary: true,
        activeFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    });
  }

  return organization;
}

async function linkCaretakerUser(caretakerUserId: string) {
  const caretaker = await prisma.caretaker.findUnique({
    where: { code: "GERALD_KUGLER" },
  });

  if (!caretaker) {
    return;
  }

  await prisma.caretaker.update({
    where: { id: caretaker.id },
    data: {
      userId: caretakerUserId,
      email: demoUsers.caretaker.email,
    },
  });
}

async function ensureDemoBookingData(organizationId: string, adminUserId: string, portalUserId: string) {
  const room = await prisma.room.findUnique({
    where: { code: "VS_LANGENHART_TURNSAAL" },
  });
  const reviewRoom = await prisma.room.findUnique({
    where: { code: "VS_LANGENHART_BEWEGUNGSRAUM" },
  });
  const usageType = await prisma.usageType.findUnique({
    where: { code: "CLUB_TRAINING" },
  });

  if (!room || !reviewRoom || !usageType) {
    return;
  }

  const startsAt = new Date("2026-07-07T16:00:00.000Z");
  const endsAt = new Date("2026-07-07T18:00:00.000Z");
  const blockedFrom = new Date("2026-07-07T15:45:00.000Z");
  const blockedUntil = new Date("2026-07-07T18:15:00.000Z");

  const requestedBooking = await prisma.booking.upsert({
    where: { id: "demo-booking-requested" },
    update: {
      organizationId,
      roomId: room.id,
      usageTypeId: usageType.id,
      requestedByUserId: portalUserId,
      status: "REQUESTED",
      title: "Demo Trainingsantrag",
      startsAt,
      endsAt,
      blockedFrom,
      blockedUntil,
    },
    create: {
      id: "demo-booking-requested",
      organizationId,
      roomId: room.id,
      usageTypeId: usageType.id,
      requestedByUserId: portalUserId,
      status: "REQUESTED",
      title: "Demo Trainingsantrag",
      description: "Demo-Buchung fuer den lokalen Produkttest.",
      startsAt,
      endsAt,
      blockedFrom,
      blockedUntil,
    },
  });

  await prisma.bookingStatusHistory.upsert({
    where: { id: "demo-booking-requested-history" },
    update: {},
    create: {
      id: "demo-booking-requested-history",
      bookingId: requestedBooking.id,
      actorUserId: portalUserId,
      oldStatus: null,
      newStatus: "REQUESTED",
      reason: "Demo-Seed",
      newStartAt: startsAt,
      newEndAt: endsAt,
    },
  });

  const reviewStartsAt = new Date("2026-07-09T16:00:00.000Z");
  const reviewEndsAt = new Date("2026-07-09T18:00:00.000Z");
  const inReviewBooking = await prisma.booking.upsert({
    where: { id: "demo-booking-in-review" },
    update: {
      organizationId,
      roomId: reviewRoom.id,
      usageTypeId: usageType.id,
      requestedByUserId: portalUserId,
      processedByUserId: adminUserId,
      status: "IN_REVIEW",
      title: "Demo Antrag in Prüfung",
      startsAt: reviewStartsAt,
      endsAt: reviewEndsAt,
      blockedFrom: new Date("2026-07-09T15:45:00.000Z"),
      blockedUntil: new Date("2026-07-09T18:15:00.000Z"),
      processedAt: new Date("2026-06-01T13:00:00.000Z"),
    },
    create: {
      id: "demo-booking-in-review",
      organizationId,
      roomId: reviewRoom.id,
      usageTypeId: usageType.id,
      requestedByUserId: portalUserId,
      processedByUserId: adminUserId,
      status: "IN_REVIEW",
      title: "Demo Antrag in Prüfung",
      description: "Demo-Buchung fuer die sichtbare Pruefung im Verwaltungsportal.",
      startsAt: reviewStartsAt,
      endsAt: reviewEndsAt,
      blockedFrom: new Date("2026-07-09T15:45:00.000Z"),
      blockedUntil: new Date("2026-07-09T18:15:00.000Z"),
      processedAt: new Date("2026-06-01T13:00:00.000Z"),
    },
  });

  await prisma.bookingStatusHistory.upsert({
    where: { id: "demo-booking-in-review-history" },
    update: {},
    create: {
      id: "demo-booking-in-review-history",
      bookingId: inReviewBooking.id,
      actorUserId: adminUserId,
      oldStatus: "REQUESTED",
      newStatus: "IN_REVIEW",
      reason: "Demo-Seed",
      oldStartAt: reviewStartsAt,
      oldEndAt: reviewEndsAt,
      newStartAt: reviewStartsAt,
      newEndAt: reviewEndsAt,
    },
  });

  const approvedStartsAt = new Date("2026-07-08T16:00:00.000Z");
  const approvedEndsAt = new Date("2026-07-08T18:00:00.000Z");
  const approvedBooking = await prisma.booking.upsert({
    where: { id: "demo-booking-approved" },
    update: {
      organizationId,
      roomId: room.id,
      usageTypeId: usageType.id,
      processedByUserId: adminUserId,
      status: "APPROVED",
      title: "Demo genehmigtes Training",
      startsAt: approvedStartsAt,
      endsAt: approvedEndsAt,
      blockedFrom: new Date("2026-07-08T15:45:00.000Z"),
      blockedUntil: new Date("2026-07-08T18:15:00.000Z"),
      processedAt: new Date("2026-06-01T12:00:00.000Z"),
    },
    create: {
      id: "demo-booking-approved",
      organizationId,
      roomId: room.id,
      usageTypeId: usageType.id,
      requestedByUserId: portalUserId,
      processedByUserId: adminUserId,
      status: "APPROVED",
      title: "Demo genehmigtes Training",
      description: "Genehmigte Demo-Buchung fuer Kalender, No-Show und Hallenuebergabe.",
      startsAt: approvedStartsAt,
      endsAt: approvedEndsAt,
      blockedFrom: new Date("2026-07-08T15:45:00.000Z"),
      blockedUntil: new Date("2026-07-08T18:15:00.000Z"),
      processedAt: new Date("2026-06-01T12:00:00.000Z"),
    },
  });

  await prisma.bookingStatusHistory.upsert({
    where: { id: "demo-booking-approved-history" },
    update: {},
    create: {
      id: "demo-booking-approved-history",
      bookingId: approvedBooking.id,
      actorUserId: adminUserId,
      oldStatus: "IN_REVIEW",
      newStatus: "APPROVED",
      reason: "Demo-Seed",
      oldStartAt: approvedStartsAt,
      oldEndAt: approvedEndsAt,
      newStartAt: approvedStartsAt,
      newEndAt: approvedEndsAt,
    },
  });
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED_IN_PRODUCTION !== "true") {
    throw new Error("Refusing to seed demo users in production.");
  }

  const adminUser = await upsertUserWithRole(demoUsers.admin);
  const portalUser = await upsertUserWithRole(demoUsers.portal);
  const caretakerUser = await upsertUserWithRole(demoUsers.caretaker);
  await hideLocalTestArtifacts();
  const organization = await ensureDemoOrganization(portalUser.id);
  await linkCaretakerUser(caretakerUser.id);
  await ensureDemoBookingData(organization.id, adminUser.id, portalUser.id);

  console.log("Demo data inserted.");
  console.log(`Admin: ${demoUsers.admin.email} / ${demoUsers.admin.password}`);
  console.log(`Portal: ${demoUsers.portal.email} / ${demoUsers.portal.password}`);
  console.log(`Hallenwart: ${demoUsers.caretaker.email} / ${demoUsers.caretaker.password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
