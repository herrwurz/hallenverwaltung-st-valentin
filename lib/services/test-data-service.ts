import { hash } from "bcryptjs";
import { BookingStatus, type Prisma, type PrismaClient, RoomStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const TEST_EMAIL_DOMAIN = "@test.local";
const TEST_MARKER = "[TEST]";
const TEST_PASSWORD = "Test1234!Test";

const testUsers = [
  { email: "superadmin@test.local", displayName: "[TEST] Superadmin", roleCode: "SUPER_ADMIN" },
  { email: "gemeinde@test.local", displayName: "[TEST] Gemeinde", roleCode: "MUNICIPAL_ADMIN" },
  { email: "verein@test.local", displayName: "[TEST] Verein", roleCode: "ORGANIZATION" },
  { email: "hauswart@test.local", displayName: "[TEST] Hauswart", roleCode: "CARETAKER" },
  { email: "vhs@test.local", displayName: "[TEST] VHS", roleCode: "VHS" },
] as const;

const testBuildingCodes = ["TEST_SPORTHALLE", "TEST_VOLKSSCHULE"] as const;
const testRoomCodes = ["TEST_SPORTHALLE_GESAMT", "TEST_SPORTHALLE_A", "TEST_VS_TURNSAAL"] as const;
const testCaretakerCode = "TEST_HAUSWART";

type TestDataClient = PrismaClient | Prisma.TransactionClient;

export type TestDataStatus = {
  enabled: boolean;
  users: number;
  organizations: number;
  buildings: number;
  rooms: number;
  caretakers: number;
  bookings: number;
  archivedBookings: number;
};

export type TestDataMutationResult = TestDataStatus & {
  message: string;
};

function isEnabled() {
  return process.env.TEST_DATA_TOOLS_ENABLED === "true";
}

function assertEnabled() {
  if (!isEnabled()) {
    throw new Error("Testdaten-Werkzeuge sind deaktiviert. Setze TEST_DATA_TOOLS_ENABLED=true in der Testumgebung.");
  }
}

function addDays(base: Date, days: number, hour: number, minute = 0) {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function isMarkedText(value: string | null | undefined) {
  return Boolean(value?.includes(TEST_MARKER) || value?.endsWith(TEST_EMAIL_DOMAIN));
}

async function getRoleId(client: TestDataClient, code: string) {
  const role = await client.role.findUnique({ where: { code }, select: { id: true } });
  if (!role) {
    throw new Error(`Rolle ${code} wurde nicht gefunden. Bitte zuerst npm run db:seed ausführen.`);
  }
  return role.id;
}

async function getCatalogId(client: TestDataClient, model: "organizationType" | "tariffGroup" | "usageType", code: string) {
  const row =
    model === "organizationType"
      ? await client.organizationType.findUnique({ where: { code }, select: { id: true } })
      : model === "tariffGroup"
        ? await client.tariffGroup.findUnique({ where: { code }, select: { id: true } })
        : await client.usageType.findUnique({ where: { code }, select: { id: true } });

  if (!row) {
    throw new Error(`Katalogwert ${code} wurde nicht gefunden. Bitte zuerst npm run db:seed ausführen.`);
  }
  return row.id;
}

async function ensureUser(client: TestDataClient, input: (typeof testUsers)[number], passwordHash: string) {
  const roleId = await getRoleId(client, input.roleCode);
  const user = await client.user.upsert({
    where: { email: input.email },
    update: {
      displayName: input.displayName,
      passwordHash,
      isActive: true,
    },
    create: {
      email: input.email,
      displayName: input.displayName,
      passwordHash,
      isActive: true,
    },
  });

  await client.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId } },
    update: {},
    create: { userId: user.id, roleId },
  });

  return user;
}

async function ensureFacilities(client: TestDataClient) {
  const sporthalle = await client.building.upsert({
    where: { code: "TEST_SPORTHALLE" },
    update: {
      name: "[TEST] Sporthalle Testbetrieb",
      address: "[TEST] Teststraße 1",
      postalCode: "4300",
      city: "St. Valentin",
      email: "sporthalle@test.local",
      phone: "+43 000 000001",
      isActive: true,
    },
    create: {
      code: "TEST_SPORTHALLE",
      name: "[TEST] Sporthalle Testbetrieb",
      address: "[TEST] Teststraße 1",
      postalCode: "4300",
      city: "St. Valentin",
      email: "sporthalle@test.local",
      phone: "+43 000 000001",
      isActive: true,
    },
  });

  const volksschule = await client.building.upsert({
    where: { code: "TEST_VOLKSSCHULE" },
    update: {
      name: "[TEST] Volksschule Testbetrieb",
      address: "[TEST] Schulweg 2",
      postalCode: "4300",
      city: "St. Valentin",
      email: "volksschule@test.local",
      phone: "+43 000 000002",
      isActive: true,
    },
    create: {
      code: "TEST_VOLKSSCHULE",
      name: "[TEST] Volksschule Testbetrieb",
      address: "[TEST] Schulweg 2",
      postalCode: "4300",
      city: "St. Valentin",
      email: "volksschule@test.local",
      phone: "+43 000 000002",
      isActive: true,
    },
  });

  const sporthalleGesamt = await client.room.upsert({
    where: { code: "TEST_SPORTHALLE_GESAMT" },
    update: {
      buildingId: sporthalle.id,
      name: "[TEST] Gesamthalle",
      status: RoomStatus.ACTIVE,
      isCombinable: true,
      openingTime: "00:00",
      closingTime: "23:59",
      setupBufferMinutes: 0,
      teardownBufferMinutes: 0,
    },
    create: {
      buildingId: sporthalle.id,
      code: "TEST_SPORTHALLE_GESAMT",
      name: "[TEST] Gesamthalle",
      status: RoomStatus.ACTIVE,
      isCombinable: true,
      openingTime: "00:00",
      closingTime: "23:59",
      setupBufferMinutes: 0,
      teardownBufferMinutes: 0,
    },
  });

  const sporthalleA = await client.room.upsert({
    where: { code: "TEST_SPORTHALLE_A" },
    update: {
      buildingId: sporthalle.id,
      name: "[TEST] Halle A",
      status: RoomStatus.ACTIVE,
      openingTime: "00:00",
      closingTime: "23:59",
      setupBufferMinutes: 0,
      teardownBufferMinutes: 0,
    },
    create: {
      buildingId: sporthalle.id,
      code: "TEST_SPORTHALLE_A",
      name: "[TEST] Halle A",
      status: RoomStatus.ACTIVE,
      openingTime: "00:00",
      closingTime: "23:59",
      setupBufferMinutes: 0,
      teardownBufferMinutes: 0,
    },
  });

  const turnsaal = await client.room.upsert({
    where: { code: "TEST_VS_TURNSAAL" },
    update: {
      buildingId: volksschule.id,
      name: "[TEST] Turnsaal",
      status: RoomStatus.ACTIVE,
      openingTime: "00:00",
      closingTime: "23:59",
      setupBufferMinutes: 0,
      teardownBufferMinutes: 0,
    },
    create: {
      buildingId: volksschule.id,
      code: "TEST_VS_TURNSAAL",
      name: "[TEST] Turnsaal",
      status: RoomStatus.ACTIVE,
      openingTime: "00:00",
      closingTime: "23:59",
      setupBufferMinutes: 0,
      teardownBufferMinutes: 0,
    },
  });

  await client.roomComposition.upsert({
    where: { parentRoomId_childRoomId: { parentRoomId: sporthalleGesamt.id, childRoomId: sporthalleA.id } },
    update: {},
    create: { parentRoomId: sporthalleGesamt.id, childRoomId: sporthalleA.id },
  });

  return { sporthalle, volksschule, sporthalleGesamt, sporthalleA, turnsaal };
}

async function ensureOrganizations(client: TestDataClient) {
  const associationTypeId = await getCatalogId(client, "organizationType", "ASSOCIATION");
  const vhsTypeId = await getCatalogId(client, "organizationType", "VHS");
  const nonProfitTariffGroupId = await getCatalogId(client, "tariffGroup", "NON_PROFIT");
  const educationTariffGroupId = await getCatalogId(client, "tariffGroup", "EDUCATION");

  const existingClub = await client.organization.findFirst({
    where: { name: "[TEST] Testverein St. Valentin" },
    select: { id: true },
  });
  const clubData = {
    name: "[TEST] Testverein St. Valentin",
    organizationTypeId: associationTypeId,
    tariffGroupId: nonProfitTariffGroupId,
    status: "ACTIVE" as const,
    blockedReason: null,
    canRequestBookings: true,
    isBillingRelevant: false,
  };
  const club = existingClub
    ? await client.organization.update({
        where: { id: existingClub.id },
        data: {
          organizationTypeId: associationTypeId,
          tariffGroupId: nonProfitTariffGroupId,
          status: "ACTIVE",
          blockedReason: null,
          canRequestBookings: true,
          isBillingRelevant: false,
        },
      })
    : await client.organization.create({
        data: clubData,
      });

  const existingVhs = await client.organization.findFirst({
    where: { name: "[TEST] VHS Testkurse" },
    select: { id: true },
  });
  const vhsData = {
    name: "[TEST] VHS Testkurse",
    organizationTypeId: vhsTypeId,
    tariffGroupId: educationTariffGroupId,
    status: "ACTIVE" as const,
    blockedReason: null,
    canRequestBookings: true,
    isBillingRelevant: false,
  };
  const vhs = existingVhs
    ? await client.organization.update({
        where: { id: existingVhs.id },
        data: {
          organizationTypeId: vhsTypeId,
          tariffGroupId: educationTariffGroupId,
          status: "ACTIVE",
          blockedReason: null,
          canRequestBookings: true,
          isBillingRelevant: false,
        },
      })
    : await client.organization.create({
        data: vhsData,
      });

  for (const organization of [club, vhs]) {
    await client.organizationContact.upsert({
      where: { id: `${organization.id}-primary-test-contact` },
      update: {
        name: organization.name,
        function: "[TEST] Hauptkontakt",
        email: organization.name.includes("VHS") ? "vhs@test.local" : "verein@test.local",
        isPrimary: true,
      },
      create: {
        id: `${organization.id}-primary-test-contact`,
        organizationId: organization.id,
        name: organization.name,
        function: "[TEST] Hauptkontakt",
        email: organization.name.includes("VHS") ? "vhs@test.local" : "verein@test.local",
        isPrimary: true,
      },
    });
  }

  return { club, vhs };
}

async function ensureMembership(client: TestDataClient, userId: string, organizationId: string, label: string) {
  const existing = await client.organizationMember.findFirst({
    where: { userId, organizationId, activeUntil: null, function: label },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  return client.organizationMember.create({
    data: {
      userId,
      organizationId,
      function: label,
      isPrimary: true,
      activeFrom: new Date(),
    },
  });
}

async function ensureCaretaker(client: TestDataClient, userId: string, buildingId: string, roomIds: string[]) {
  const caretaker = await client.caretaker.upsert({
    where: { code: testCaretakerCode },
    update: {
      userId,
      name: "[TEST] Hauswart",
      email: "hauswart@test.local",
      phone: "+43 000 000003",
      isActive: true,
    },
    create: {
      code: testCaretakerCode,
      userId,
      name: "[TEST] Hauswart",
      email: "hauswart@test.local",
      phone: "+43 000 000003",
      isActive: true,
    },
  });

  await client.buildingCaretaker.upsert({
    where: { buildingId_caretakerId: { buildingId, caretakerId: caretaker.id } },
    update: { isPrimary: true },
    create: { buildingId, caretakerId: caretaker.id, isPrimary: true },
  });

  for (const roomId of roomIds) {
    await client.roomCaretaker.upsert({
      where: { roomId_caretakerId: { roomId, caretakerId: caretaker.id } },
      update: {},
      create: { roomId, caretakerId: caretaker.id },
    });
  }

  return caretaker;
}

async function ensureBooking(
  client: TestDataClient,
  input: {
    title: string;
    status: BookingStatus;
    organizationId: string;
    roomId: string;
    usageTypeId: string;
    requestedByUserId: string;
    processedByUserId?: string;
    startsAt: Date;
    endsAt: Date;
    decisionNote?: string;
    cancellationNote?: string;
  },
) {
  const existing = await client.booking.findFirst({
    where: { title: input.title },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  const booking = await client.booking.create({
    data: {
      organizationId: input.organizationId,
      roomId: input.roomId,
      usageTypeId: input.usageTypeId,
      requestedByUserId: input.requestedByUserId,
      processedByUserId: input.processedByUserId,
      status: input.status,
      title: input.title,
      description: "[TEST] Automatisch erzeugter Testtermin.",
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      blockedFrom: input.startsAt,
      blockedUntil: input.endsAt,
      requestedAt: addDays(input.startsAt, -7, 9),
      processedAt: input.status === BookingStatus.REQUESTED ? null : addDays(input.startsAt, -5, 10),
      decisionNote: input.decisionNote,
      cancellationNote: input.cancellationNote,
    },
  });

  await client.bookingStatusHistory.create({
    data: {
      bookingId: booking.id,
      actorUserId: input.requestedByUserId,
      oldStatus: null,
      newStatus: BookingStatus.REQUESTED,
      reason: "[TEST] Testbuchung angelegt.",
      newStartAt: input.startsAt,
      newEndAt: input.endsAt,
    },
  });

  if (input.status !== BookingStatus.REQUESTED) {
    await client.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        actorUserId: input.processedByUserId,
        oldStatus: BookingStatus.REQUESTED,
        newStatus: input.status,
        reason: input.decisionNote ?? input.cancellationNote ?? "[TEST] Teststatus gesetzt.",
        oldStartAt: input.startsAt,
        oldEndAt: input.endsAt,
        newStartAt: input.startsAt,
        newEndAt: input.endsAt,
      },
    });
  }

  return booking;
}

async function archiveMarkedTestBookings(client: TestDataClient) {
  const bookings = await client.booking.findMany({
    where: {
      status: { not: BookingStatus.ARCHIVED },
      OR: [
        { title: { contains: TEST_MARKER } },
        { description: { contains: TEST_MARKER } },
        { organization: { name: { contains: TEST_MARKER } } },
        { room: { name: { contains: TEST_MARKER } } },
      ],
    },
    select: { id: true, status: true, startsAt: true, endsAt: true },
  });

  for (const booking of bookings) {
    await client.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.ARCHIVED,
        decisionNote: "[TEST] Testdaten wurden sicher deaktiviert. Buchung bleibt aus Historisierungsgruenden erhalten.",
        processedAt: new Date(),
      },
    });
    await client.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        oldStatus: booking.status,
        newStatus: BookingStatus.ARCHIVED,
        reason: "[TEST] Testdaten deaktiviert.",
        oldStartAt: booking.startsAt,
        oldEndAt: booking.endsAt,
        newStartAt: booking.startsAt,
        newEndAt: booking.endsAt,
      },
    });
  }
}

export async function getTestDataStatus(client: TestDataClient = prisma): Promise<TestDataStatus> {
  if (!isEnabled()) {
    return {
      enabled: false,
      users: 0,
      organizations: 0,
      buildings: 0,
      rooms: 0,
      caretakers: 0,
      bookings: 0,
      archivedBookings: 0,
    };
  }

  const [users, organizations, buildings, rooms, caretakers, bookings, archivedBookings] = await Promise.all([
    client.user.count({ where: { email: { endsWith: TEST_EMAIL_DOMAIN } } }),
    client.organization.count({ where: { name: { contains: TEST_MARKER }, status: { not: "INACTIVE" } } }),
    client.building.count({ where: { OR: [{ code: { in: [...testBuildingCodes] } }, { name: { contains: TEST_MARKER } }], isActive: true } }),
    client.room.count({ where: { OR: [{ code: { in: [...testRoomCodes] } }, { name: { contains: TEST_MARKER } }], status: { not: RoomStatus.OUT_OF_SERVICE } } }),
    client.caretaker.count({ where: { OR: [{ code: testCaretakerCode }, { email: { endsWith: TEST_EMAIL_DOMAIN } }], isActive: true } }),
    client.booking.count({ where: { title: { contains: TEST_MARKER }, status: { not: BookingStatus.ARCHIVED } } }),
    client.booking.count({ where: { title: { contains: TEST_MARKER }, status: BookingStatus.ARCHIVED } }),
  ]);

  return {
    enabled: true,
    users,
    organizations,
    buildings,
    rooms,
    caretakers,
    bookings,
    archivedBookings,
  };
}

export async function createTestData(client: PrismaClient = prisma): Promise<TestDataMutationResult> {
  assertEnabled();
  const passwordHash = await hash(TEST_PASSWORD, 12);

  await client.$transaction(async (tx) => {
    const users = new Map<string, { id: string }>();
    for (const userInput of testUsers) {
      users.set(userInput.email, await ensureUser(tx, userInput, passwordHash));
    }

    const facilities = await ensureFacilities(tx);
    const organizations = await ensureOrganizations(tx);

    await ensureMembership(tx, users.get("verein@test.local")!.id, organizations.club.id, "[TEST] Obmann");
    await ensureMembership(tx, users.get("vhs@test.local")!.id, organizations.vhs.id, "[TEST] Kursleitung");
    await ensureCaretaker(tx, users.get("hauswart@test.local")!.id, facilities.sporthalle.id, [
      facilities.sporthalleGesamt.id,
      facilities.sporthalleA.id,
    ]);

    const clubTrainingId = await getCatalogId(tx, "usageType", "CLUB_TRAINING");
    const courseId = await getCatalogId(tx, "usageType", "COURSE");
    const leagueMatchId = await getCatalogId(tx, "usageType", "LEAGUE_MATCH");
    const now = new Date();

    await ensureBooking(tx, {
      title: "[TEST] Genehmigtes Fußballtraining",
      status: BookingStatus.APPROVED,
      organizationId: organizations.club.id,
      roomId: facilities.sporthalleA.id,
      usageTypeId: clubTrainingId,
      requestedByUserId: users.get("verein@test.local")!.id,
      processedByUserId: users.get("gemeinde@test.local")!.id,
      startsAt: addDays(now, 32, 18),
      endsAt: addDays(now, 32, 20),
      decisionNote: "[TEST] Genehmigt für den Testbetrieb.",
    });
    await ensureBooking(tx, {
      title: "[TEST] Beantragtes Nachwuchstraining",
      status: BookingStatus.REQUESTED,
      organizationId: organizations.club.id,
      roomId: facilities.sporthalleA.id,
      usageTypeId: clubTrainingId,
      requestedByUserId: users.get("verein@test.local")!.id,
      startsAt: addDays(now, 38, 17),
      endsAt: addDays(now, 38, 18, 30),
    });
    await ensureBooking(tx, {
      title: "[TEST] VHS Kurs in Prüfung",
      status: BookingStatus.IN_REVIEW,
      organizationId: organizations.vhs.id,
      roomId: facilities.turnsaal.id,
      usageTypeId: courseId,
      requestedByUserId: users.get("vhs@test.local")!.id,
      processedByUserId: users.get("gemeinde@test.local")!.id,
      startsAt: addDays(now, 45, 19),
      endsAt: addDays(now, 45, 21),
      decisionNote: "[TEST] Zur internen Prüfung vorgemerkt.",
    });
    await ensureBooking(tx, {
      title: "[TEST] Abgelehntes Turnier",
      status: BookingStatus.REJECTED,
      organizationId: organizations.club.id,
      roomId: facilities.sporthalleGesamt.id,
      usageTypeId: leagueMatchId,
      requestedByUserId: users.get("verein@test.local")!.id,
      processedByUserId: users.get("gemeinde@test.local")!.id,
      startsAt: addDays(now, 52, 9),
      endsAt: addDays(now, 52, 12),
      decisionNote: "[TEST] Abgelehnt wegen Test-Konflikt.",
    });
    await ensureBooking(tx, {
      title: "[TEST] Stornierter Kurs",
      status: BookingStatus.CANCELLED,
      organizationId: organizations.vhs.id,
      roomId: facilities.turnsaal.id,
      usageTypeId: courseId,
      requestedByUserId: users.get("vhs@test.local")!.id,
      processedByUserId: users.get("vhs@test.local")!.id,
      startsAt: addDays(now, 59, 16),
      endsAt: addDays(now, 59, 18),
      cancellationNote: "[TEST] Vom Antragsteller storniert.",
    });
  });

  return {
    ...(await getTestDataStatus(client)),
    message: "Testdaten wurden erzeugt oder aktualisiert.",
  };
}

export async function deleteTestData(client: PrismaClient = prisma): Promise<TestDataMutationResult> {
  assertEnabled();

  await client.$transaction(async (tx) => {
    await archiveMarkedTestBookings(tx);

    await tx.organizationMember.updateMany({
      where: {
        OR: [
          { function: { contains: TEST_MARKER } },
          { user: { email: { endsWith: TEST_EMAIL_DOMAIN } } },
          { organization: { name: { contains: TEST_MARKER } } },
        ],
        activeUntil: null,
      },
      data: { activeUntil: new Date() },
    });

    await tx.user.deleteMany({
      where: { email: { endsWith: TEST_EMAIL_DOMAIN } },
    });

    await tx.caretaker.updateMany({
      where: { OR: [{ code: testCaretakerCode }, { email: { endsWith: TEST_EMAIL_DOMAIN } }, { name: { contains: TEST_MARKER } }] },
      data: { userId: null, isActive: false },
    });

    await tx.room.updateMany({
      where: { OR: [{ code: { in: [...testRoomCodes] } }, { name: { contains: TEST_MARKER } }] },
      data: { status: RoomStatus.OUT_OF_SERVICE },
    });

    await tx.building.updateMany({
      where: { OR: [{ code: { in: [...testBuildingCodes] } }, { name: { contains: TEST_MARKER } }] },
      data: { isActive: false },
    });

    await tx.organization.updateMany({
      where: { name: { contains: TEST_MARKER } },
      data: {
        status: "INACTIVE",
        canRequestBookings: false,
        blockedReason: "[TEST] Testdaten deaktiviert.",
      },
    });
  });

  return {
    ...(await getTestDataStatus(client)),
    message: "Testdaten wurden sicher deaktiviert. Buchungshistorie bleibt erhalten.",
  };
}

export function isTestDataToolsEnabled() {
  return isEnabled();
}

export function isMarkedTestValue(value: string | null | undefined) {
  return isMarkedText(value);
}
