import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const permissions = [
  ["VIEW_PUBLIC_CALENDAR", "Oeffentlichen Kalender sehen"],
  ["REQUEST_BOOKING", "Buchung beantragen"],
  ["CANCEL_OWN_BOOKING", "Eigene Buchung stornieren"],
  ["REQUEST_RESCHEDULE", "Terminverschiebung beantragen"],
  ["REQUEST_SWAP", "Termintausch beantragen"],
  ["BLOCK_ROOM", "Hallen sperren"],
  ["REPORT_NO_SHOW", "No-Show melden"],
  ["REPORT_DAMAGE", "Schaden melden"],
  ["MANAGE_DAMAGE", "Schaden bearbeiten"],
  ["APPROVE_BOOKING", "Buchung genehmigen"],
  ["REJECT_BOOKING", "Buchung ablehnen"],
  ["BLOCK_ORGANIZATION", "Organisation sperren"],
  ["MANAGE_USERS", "Benutzer verwalten"],
  ["MANAGE_ROLES", "Rollen verwalten"],
  ["MANAGE_TARIFFS", "Tarife verwalten"],
  ["CREATE_EXPORTS", "Exporte erstellen"],
  ["MANAGE_DOCUMENTS", "Dokumente verwalten"],
  ["MANAGE_SYSTEM", "Systemeinstellungen aendern"],
] as const;

const roles = [
  ["SUPER_ADMIN", "Super-Admin", permissions.map(([code]) => code)],
  [
    "MUNICIPAL_ADMIN",
    "Gemeinde-Admin",
    [
      "VIEW_PUBLIC_CALENDAR",
      "REQUEST_BOOKING",
      "CANCEL_OWN_BOOKING",
      "REQUEST_RESCHEDULE",
      "REQUEST_SWAP",
      "BLOCK_ROOM",
      "REPORT_NO_SHOW",
      "REPORT_DAMAGE",
      "MANAGE_DAMAGE",
      "APPROVE_BOOKING",
      "REJECT_BOOKING",
      "BLOCK_ORGANIZATION",
      "MANAGE_USERS",
      "MANAGE_ROLES",
      "MANAGE_TARIFFS",
      "CREATE_EXPORTS",
      "MANAGE_DOCUMENTS",
    ],
  ],
  [
    "FACILITY_MANAGER",
    "Hallenverwalter",
    [
      "VIEW_PUBLIC_CALENDAR",
      "REQUEST_BOOKING",
      "CANCEL_OWN_BOOKING",
      "REQUEST_RESCHEDULE",
      "REQUEST_SWAP",
      "BLOCK_ROOM",
      "REPORT_NO_SHOW",
      "REPORT_DAMAGE",
      "MANAGE_DAMAGE",
      "MANAGE_DOCUMENTS",
    ],
  ],
  [
    "CARETAKER",
    "Hallenwart",
    [
      "VIEW_PUBLIC_CALENDAR",
      "REQUEST_BOOKING",
      "BLOCK_ROOM",
      "REPORT_NO_SHOW",
      "REPORT_DAMAGE",
      "MANAGE_DAMAGE",
    ],
  ],
  [
    "ORGANIZATION",
    "Verein/Organisation",
    [
      "VIEW_PUBLIC_CALENDAR",
      "REQUEST_BOOKING",
      "CANCEL_OWN_BOOKING",
      "REQUEST_RESCHEDULE",
      "REQUEST_SWAP",
      "REPORT_DAMAGE",
    ],
  ],
  [
    "VHS",
    "VHS",
    [
      "VIEW_PUBLIC_CALENDAR",
      "REQUEST_BOOKING",
      "CANCEL_OWN_BOOKING",
      "REQUEST_RESCHEDULE",
      "REQUEST_SWAP",
      "REPORT_DAMAGE",
    ],
  ],
  [
    "SCHOOL",
    "Schule",
    [
      "VIEW_PUBLIC_CALENDAR",
      "REQUEST_BOOKING",
      "CANCEL_OWN_BOOKING",
      "REQUEST_RESCHEDULE",
      "REQUEST_SWAP",
      "REPORT_DAMAGE",
    ],
  ],
  ["PUBLIC_USER", "Oeffentlicher Benutzer", ["VIEW_PUBLIC_CALENDAR"]],
] as const;

async function seedRolesAndPermissions() {
  const permissionByCode = new Map<string, string>();

  for (const [code, name] of permissions) {
    const permission = await prisma.permission.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });
    permissionByCode.set(code, permission.id);
  }

  for (const [code, name, rolePermissions] of roles) {
    const role = await prisma.role.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: rolePermissions.map((permissionCode) => ({
        roleId: role.id,
        permissionId: permissionByCode.get(permissionCode)!,
      })),
    });
  }
}

async function seedCatalogs() {
  const organizationTypes = [
    ["MUNICIPALITY", "Gemeinde"],
    ["ASSOCIATION", "Verein"],
    ["VHS", "VHS"],
    ["SCHOOL", "Schule"],
    ["PRIVATE", "Privat"],
    ["EXTERNAL", "Extern"],
    ["EMERGENCY_SERVICE", "Katastrophenschutz"],
  ] as const;

  for (const [code, name] of organizationTypes) {
    await prisma.organizationType.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });
  }

  const usageTypes = [
    ["MUNICIPAL_EMERGENCY", "Gemeinde / Katastrophenschutz / Wahlen", 1, true],
    ["SCHOOL_USE", "Schulnutzung", 2, true],
    ["LEAGUE_MATCH", "Meisterschafts- und Ligabetrieb", 3, true],
    ["CLUB_TRAINING", "Regelmaessige Vereinsnutzung", 4, false],
    ["COURSE", "VHS / Kurse", 5, false],
    ["PRIVATE_EVENT", "Private / Einzelveranstaltungen", 6, false],
  ] as const;

  for (const [code, name, priority, mayDisplaceLowerPriority] of usageTypes) {
    await prisma.usageType.upsert({
      where: { code },
      update: { name, priority, mayDisplaceLowerPriority, requiresApproval: true },
      create: { code, name, priority, mayDisplaceLowerPriority, requiresApproval: true },
    });
  }

  const tariffGroups = [
    ["INTERNAL", "Gemeinde / interne Nutzung"],
    ["EDUCATION", "Schulen und Bildung"],
    ["NON_PROFIT", "Vereine und gemeinnuetzige Organisationen"],
    ["COMMERCIAL", "Externe und gewerbliche Nutzung"],
    ["PRIVATE", "Private Nutzung"],
  ] as const;

  for (const [code, name] of tariffGroups) {
    await prisma.tariffGroup.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });
  }
}

async function seedFacilities() {
  const sporthalle = await prisma.building.upsert({
    where: { code: "SPORTHALLE" },
    update: { name: "Sporthalle" },
    create: { code: "SPORTHALLE", name: "Sporthalle" },
  });

  const volksschule = await prisma.building.upsert({
    where: { code: "VS_HAUPTPLATZ" },
    update: { name: "Volksschule Hauptplatz" },
    create: { code: "VS_HAUPTPLATZ", name: "Volksschule Hauptplatz" },
  });

  const roomDefinitions = [
    ["SPORTHALLE_A", "Halle A", sporthalle.id, false],
    ["SPORTHALLE_B", "Halle B", sporthalle.id, false],
    ["SPORTHALLE_C", "Halle C", sporthalle.id, false],
    ["SPORTHALLE_GESAMT", "Gesamthalle", sporthalle.id, true],
    ["VS_HAUPTPLATZ_TURNSAAL", "Turnsaal", volksschule.id, false],
  ] as const;
  const roomByCode = new Map<string, string>();

  for (const [code, name, buildingId, isCombinable] of roomDefinitions) {
    const room = await prisma.room.upsert({
      where: { code },
      update: { name, buildingId, isCombinable },
      create: {
        code,
        name,
        buildingId,
        isCombinable,
        setupBufferMinutes: 15,
        teardownBufferMinutes: 15,
      },
    });
    roomByCode.set(code, room.id);
  }

  for (const childCode of ["SPORTHALLE_A", "SPORTHALLE_B", "SPORTHALLE_C"]) {
    await prisma.roomComposition.upsert({
      where: {
        parentRoomId_childRoomId: {
          parentRoomId: roomByCode.get("SPORTHALLE_GESAMT")!,
          childRoomId: roomByCode.get(childCode)!,
        },
      },
      update: {},
      create: {
        parentRoomId: roomByCode.get("SPORTHALLE_GESAMT")!,
        childRoomId: roomByCode.get(childCode)!,
      },
    });
  }

  const sportCaretaker = await prisma.caretaker.upsert({
    where: { code: "CARETAKER_SPORTHALLE_PLACEHOLDER" },
    update: { name: "Hallenwart Sporthalle (Platzhalter)" },
    create: {
      code: "CARETAKER_SPORTHALLE_PLACEHOLDER",
      name: "Hallenwart Sporthalle (Platzhalter)",
    },
  });

  const schoolCaretaker = await prisma.caretaker.upsert({
    where: { code: "CARETAKER_VS_HAUPTPLATZ_PLACEHOLDER" },
    update: { name: "Hallenwart Volksschule Hauptplatz (Platzhalter)" },
    create: {
      code: "CARETAKER_VS_HAUPTPLATZ_PLACEHOLDER",
      name: "Hallenwart Volksschule Hauptplatz (Platzhalter)",
    },
  });

  await prisma.buildingCaretaker.upsert({
    where: { buildingId_caretakerId: { buildingId: sporthalle.id, caretakerId: sportCaretaker.id } },
    update: { isPrimary: true },
    create: { buildingId: sporthalle.id, caretakerId: sportCaretaker.id, isPrimary: true },
  });

  await prisma.buildingCaretaker.upsert({
    where: { buildingId_caretakerId: { buildingId: volksschule.id, caretakerId: schoolCaretaker.id } },
    update: { isPrimary: true },
    create: { buildingId: volksschule.id, caretakerId: schoolCaretaker.id, isPrimary: true },
  });

  for (const roomCode of ["SPORTHALLE_A", "SPORTHALLE_B", "SPORTHALLE_C", "SPORTHALLE_GESAMT"]) {
    await prisma.roomCaretaker.upsert({
      where: { roomId_caretakerId: { roomId: roomByCode.get(roomCode)!, caretakerId: sportCaretaker.id } },
      update: {},
      create: { roomId: roomByCode.get(roomCode)!, caretakerId: sportCaretaker.id },
    });
  }

  await prisma.roomCaretaker.upsert({
    where: {
      roomId_caretakerId: {
        roomId: roomByCode.get("VS_HAUPTPLATZ_TURNSAAL")!,
        caretakerId: schoolCaretaker.id,
      },
    },
    update: {},
    create: {
      roomId: roomByCode.get("VS_HAUPTPLATZ_TURNSAAL")!,
      caretakerId: schoolCaretaker.id,
    },
  });
}

async function main() {
  await seedRolesAndPermissions();
  await seedCatalogs();
  await seedFacilities();
  console.log("Phase 2 reference and facility seed data inserted.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
