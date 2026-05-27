import { hash } from "bcryptjs";
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

async function seedInitialAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password || password === "replace-before-seeding") {
    console.log("Skipping initial admin seed: configure a non-placeholder email and password first.");
    return;
  }

  if (password.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD must contain at least 12 characters.");
  }

  const superAdminRole = await prisma.role.findUniqueOrThrow({
    where: { code: "SUPER_ADMIN" },
  });
  const passwordHash = await hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      displayName: "Initial Administrator",
      passwordHash,
      isActive: true,
    },
    create: {
      email,
      displayName: "Initial Administrator",
      passwordHash,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: user.id, roleId: superAdminRole.id },
  });
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
  const obsoleteRoomCodes = [
    "SPORTHALLE_A",
    "SPORTHALLE_B",
    "SPORTHALLE_C",
    "SPORTHALLE_GESAMT",
  ];
  const obsoleteCaretakerCodes = [
    "CARETAKER_SPORTHALLE_PLACEHOLDER",
    "CARETAKER_VS_HAUPTPLATZ_PLACEHOLDER",
  ];

  await prisma.roomComposition.deleteMany({
    where: {
      OR: [
        { parentRoom: { code: { in: obsoleteRoomCodes } } },
        { childRoom: { code: { in: obsoleteRoomCodes } } },
      ],
    },
  });
  await prisma.roomCaretaker.deleteMany({
    where: {
      OR: [
        { room: { code: { in: obsoleteRoomCodes } } },
        { caretaker: { code: { in: obsoleteCaretakerCodes } } },
      ],
    },
  });
  await prisma.buildingCaretaker.deleteMany({
    where: {
      OR: [
        { building: { code: "SPORTHALLE" } },
        { caretaker: { code: { in: obsoleteCaretakerCodes } } },
      ],
    },
  });
  await prisma.room.deleteMany({ where: { code: { in: obsoleteRoomCodes } } });
  await prisma.building.deleteMany({ where: { code: "SPORTHALLE" } });
  await prisma.caretaker.deleteMany({ where: { code: { in: obsoleteCaretakerCodes } } });

  const facilityDefinitions = [
    {
      buildingCode: "VS_HAUPTPLATZ",
      buildingName: "Volksschule Hauptplatz",
      caretakerCode: "CHRISTIAN_OEMER",
      caretakerName: "Christian Ömer",
      rooms: [["VS_HAUPTPLATZ_TURNSAAL", "Turnsaal"]],
    },
    {
      buildingCode: "VS_LANGENHART",
      buildingName: "Volksschule Langenhart",
      caretakerCode: "GERALD_KUGLER",
      caretakerName: "Gerald Kugler",
      rooms: [
        ["VS_LANGENHART_TURNSAAL", "Turnsaal"],
        ["VS_LANGENHART_BEWEGUNGSRAUM", "Bewegungsraum"],
      ],
    },
    {
      buildingCode: "NMS_SCHUBERTVIERTEL",
      buildingName: "NMS Schubertviertel",
      caretakerCode: "JOSEF_DOEBERL",
      caretakerName: "Josef Döberl",
      rooms: [
        ["NMS_SCHUBERTVIERTEL_TURNSAAL_GROSS", "Turnsaal groß"],
        ["NMS_SCHUBERTVIERTEL_TURNSAAL_KLEIN", "Turnsaal klein"],
        ["NMS_SCHUBERTVIERTEL_SPORTPLATZ", "Sportplatz"],
        ["NMS_SCHUBERTVIERTEL_FUNCOURT", "Funcourt"],
      ],
    },
    {
      buildingCode: "NMS_LANGENHART",
      buildingName: "NMS Langenhart",
      caretakerCode: "THOMAS_TEICHMANN",
      caretakerName: "Thomas Teichmann",
      rooms: [["NMS_LANGENHART_SPORTHALLE", "Sporthalle"]],
    },
    {
      buildingCode: "SOZIALZENTRUM",
      buildingName: "Sozialzentrum",
      caretakerCode: "HERBERT_BRANDSTAETTER",
      caretakerName: "Herbert Brandstätter",
      rooms: [["SOZIALZENTRUM_KELLERGESCHOSS", "Kellergeschoß"]],
    },
  ] as const;

  for (const facility of facilityDefinitions) {
    const building = await prisma.building.upsert({
      where: { code: facility.buildingCode },
      update: { name: facility.buildingName },
      create: { code: facility.buildingCode, name: facility.buildingName },
    });

    const caretaker = await prisma.caretaker.upsert({
      where: { code: facility.caretakerCode },
      update: { name: facility.caretakerName },
      create: { code: facility.caretakerCode, name: facility.caretakerName },
    });

    await prisma.buildingCaretaker.upsert({
      where: { buildingId_caretakerId: { buildingId: building.id, caretakerId: caretaker.id } },
      update: { isPrimary: true },
      create: { buildingId: building.id, caretakerId: caretaker.id, isPrimary: true },
    });

    for (const [code, name] of facility.rooms) {
      const room = await prisma.room.upsert({
        where: { code },
        update: { name, buildingId: building.id, isCombinable: false },
        create: {
          code,
          name,
          buildingId: building.id,
          isCombinable: false,
          setupBufferMinutes: 15,
          teardownBufferMinutes: 15,
        },
      });

      await prisma.roomCaretaker.upsert({
        where: { roomId_caretakerId: { roomId: room.id, caretakerId: caretaker.id } },
        update: {},
        create: { roomId: room.id, caretakerId: caretaker.id },
      });
    }
  }
}

async function main() {
  await seedRolesAndPermissions();
  await seedInitialAdmin();
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
