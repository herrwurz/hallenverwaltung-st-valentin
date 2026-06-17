import { timingSafeEqual } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createTestData, getTestDataStatus } from "@/lib/services/test-data-service";

type BootstrapClient = PrismaClient | Prisma.TransactionClient;

const bootstrapPermissions = [
  ["VIEW_PUBLIC_CALENDAR", "Oeffentlichen Kalender sehen"],
  ["REQUEST_BOOKING", "Buchung beantragen"],
  ["CANCEL_OWN_BOOKING", "Eigene Buchung stornieren"],
  ["REQUEST_RESCHEDULE", "Terminverschiebung beantragen"],
  ["REQUEST_SWAP", "Termintausch beantragen"],
  ["BLOCK_ROOM", "Hallen sperren"],
  ["REPORT_NO_SHOW", "No-Show melden"],
  ["MANAGE_HANDOVERS", "Hallenuebergaben verwalten"],
  ["MANAGE_ACCESS", "Zutrittsmedien verwalten"],
  ["REPORT_DAMAGE", "Schaden melden"],
  ["MANAGE_DAMAGE", "Schaden bearbeiten"],
  ["VIEW_BOOKINGS", "Buchungen lesen"],
  ["APPROVE_BOOKING", "Buchung genehmigen"],
  ["REJECT_BOOKING", "Buchung ablehnen"],
  ["BLOCK_ORGANIZATION", "Organisation sperren"],
  ["MANAGE_USERS", "Benutzer verwalten"],
  ["MANAGE_ROLES", "Rollen verwalten"],
  ["MANAGE_TARIFFS", "Tarife verwalten"],
  ["BILLING_EXPORT", "Abrechnung exportieren"],
  ["CREATE_EXPORTS", "Exporte erstellen"],
  ["MANAGE_DOCUMENTS", "Dokumente verwalten"],
  ["MANAGE_SYSTEM_JOBS", "System-Jobs verwalten"],
  ["MANAGE_SYSTEM", "Systemeinstellungen aendern"],
] as const;

const bootstrapRoles = [
  ["SUPER_ADMIN", "Super-Admin", bootstrapPermissions.map(([code]) => code)],
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
      "MANAGE_HANDOVERS",
      "MANAGE_ACCESS",
      "REPORT_DAMAGE",
      "MANAGE_DAMAGE",
      "VIEW_BOOKINGS",
      "APPROVE_BOOKING",
      "REJECT_BOOKING",
      "BLOCK_ORGANIZATION",
      "MANAGE_USERS",
      "MANAGE_ROLES",
      "MANAGE_TARIFFS",
      "BILLING_EXPORT",
      "CREATE_EXPORTS",
      "MANAGE_DOCUMENTS",
      "MANAGE_SYSTEM_JOBS",
    ],
  ],
  [
    "ORGANIZATION",
    "Verein/Organisation",
    ["VIEW_PUBLIC_CALENDAR", "REQUEST_BOOKING", "CANCEL_OWN_BOOKING", "REQUEST_RESCHEDULE", "REQUEST_SWAP", "REPORT_DAMAGE"],
  ],
  ["CARETAKER", "Hallenwart", ["VIEW_PUBLIC_CALENDAR", "REQUEST_BOOKING", "BLOCK_ROOM", "REPORT_NO_SHOW", "MANAGE_HANDOVERS", "MANAGE_ACCESS", "REPORT_DAMAGE", "MANAGE_DAMAGE"]],
  ["VHS", "VHS", ["VIEW_PUBLIC_CALENDAR", "REQUEST_BOOKING", "CANCEL_OWN_BOOKING", "REQUEST_RESCHEDULE", "REQUEST_SWAP", "REPORT_DAMAGE"]],
] as const;

const bootstrapOrganizationTypes = [
  ["ASSOCIATION", "Verein"],
  ["VHS", "VHS"],
] as const;

const bootstrapTariffGroups = [
  ["NON_PROFIT", "Vereine und gemeinnuetzige Organisationen"],
  ["EDUCATION", "Schulen und Bildung"],
] as const;

const bootstrapUsageTypes = [
  ["CLUB_TRAINING", "Training", 4, false],
  ["COURSE", "VHS / Kurse", 5, false],
  ["LEAGUE_MATCH", "Meisterschafts- und Ligabetrieb", 3, true],
] as const;

function isBootstrapEnabled() {
  return (
    process.env.APP_ENV !== "production" &&
    process.env.TEST_DATA_TOOLS_ENABLED === "true" &&
    Boolean(process.env.TEST_BOOTSTRAP_TOKEN)
  );
}

function constantTimeEquals(input: string, expected: string) {
  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);

  if (inputBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(inputBuffer, expectedBuffer);
}

export function assertValidTestBootstrapToken(token: string | null | undefined) {
  if (process.env.APP_ENV === "production") {
    throw new Error("Test-Bootstrap ist in Produktion deaktiviert.");
  }

  if (!isBootstrapEnabled()) {
    throw new Error("Test-Bootstrap ist nicht konfiguriert. Setze TEST_DATA_TOOLS_ENABLED=true und TEST_BOOTSTRAP_TOKEN.");
  }

  const expectedToken = process.env.TEST_BOOTSTRAP_TOKEN;
  if (!expectedToken || expectedToken.length < 32) {
    throw new Error("TEST_BOOTSTRAP_TOKEN muss mindestens 32 Zeichen lang sein.");
  }

  if (!token || !constantTimeEquals(token, expectedToken)) {
    throw new Error("Ungültiger Test-Bootstrap-Token.");
  }
}

async function ensureBootstrapCatalogs(client: BootstrapClient) {
  const permissionByCode = new Map<string, string>();

  for (const [code, name] of bootstrapPermissions) {
    const permission = await client.permission.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });
    permissionByCode.set(code, permission.id);
  }

  for (const [code, name, rolePermissions] of bootstrapRoles) {
    const role = await client.role.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });

    for (const permissionCode of rolePermissions) {
      const permissionId = permissionByCode.get(permissionCode);
      if (!permissionId) {
        throw new Error(`Permission ${permissionCode} konnte nicht fuer ${code} angelegt werden.`);
      }

      await client.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }

  for (const [code, name] of bootstrapOrganizationTypes) {
    await client.organizationType.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });
  }

  for (const [code, name] of bootstrapTariffGroups) {
    await client.tariffGroup.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });
  }

  for (const [code, name, priority, mayDisplaceLowerPriority] of bootstrapUsageTypes) {
    await client.usageType.upsert({
      where: { code },
      update: { name, priority, mayDisplaceLowerPriority, requiresApproval: true },
      create: { code, name, priority, mayDisplaceLowerPriority, requiresApproval: true },
    });
  }
}

export async function bootstrapTestData(token: string | null | undefined, client: PrismaClient = prisma) {
  assertValidTestBootstrapToken(token);

  await client.$transaction(async (tx) => {
    await ensureBootstrapCatalogs(tx);
  });

  await createTestData(client);

  return getTestDataStatus(client);
}
