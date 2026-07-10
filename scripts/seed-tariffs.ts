// Legt die Tarifgruppen und die St.-Valentin-Preismatrix an (Quelle:
// "Hallen-Tarife und Infos.xlsx", Stand Juli 2026). Idempotent: bestehende
// Gruppen und Tarife mit gleicher Kombination werden nicht veraendert.
// Aufruf: npm run tariffs:seed
import { PrismaClient, type TariffDayType } from "@prisma/client";

const prisma = new PrismaClient();

const VALID_FROM = new Date("2026-01-01T00:00:00Z");

const tariffGroups = [
  {
    code: "ORTSVEREIN",
    name: "Ortsverein",
    description: "Ortsansässige Vereine: Mo–Fr Fixsatz, Wochenende je Halle.",
  },
  {
    code: "DAUERNUTZER",
    name: "Dauernutzer-Sondertarif",
    description: "Vereine mit durchgehendem Fixsatz auch am Wochenende (z.B. Blasorchester, ATSV Volleyball).",
  },
  {
    code: "AUSWAERTIG",
    name: "Auswärtig/Kommerziell",
    description: "Auswärtige Vereine und kommerzielle Anbieter; Buchung nur am Wochenende üblich.",
  },
  {
    code: "SCHULE_SUBVENTION",
    name: "Schule/Subvention",
    description: "Eigenbedarf Schule (Gegenverrechnung) und subventionierte Miete (z.B. MSG).",
  },
  {
    code: "GEMEINDE",
    name: "Stadtgemeinde/VHS",
    description: "VHS-Kurse und Veranstaltungen der Stadtgemeinde: keine Verrechnung.",
  },
] as const;

// Gebaeude-Codes laut prisma/seed.ts. NMS-LH = NMS Langenhart,
// NMS-SV = NMS Schubertviertel, VS-L = Volksschule Langenhart.
const NMS_LANGENHART = "NMS_LANGENHART";
const NMS_SCHUBERTVIERTEL = "NMS_SCHUBERTVIERTEL";
const VS_LANGENHART = "VS_LANGENHART";
const ALL_BUILDINGS = [NMS_LANGENHART, NMS_SCHUBERTVIERTEL, VS_LANGENHART];

type TariffDefinition = {
  groupCode: string;
  name: string;
  buildingCodes: string[];
  dayType: TariffDayType;
  hourlyRate: number;
};

const tariffDefinitions: TariffDefinition[] = [
  // Ortsverein: unter der Woche ueberall 0,73 €/h
  { groupCode: "ORTSVEREIN", name: "Ortsverein Mo–Fr", buildingCodes: ALL_BUILDINGS, dayType: "WEEKDAY", hourlyRate: 0.73 },
  // Ortsverein am Wochenende: je Halle unterschiedlich
  { groupCode: "ORTSVEREIN", name: "Ortsverein Wochenende NMS Langenhart", buildingCodes: [NMS_LANGENHART], dayType: "WEEKEND", hourlyRate: 17.44 },
  { groupCode: "ORTSVEREIN", name: "Ortsverein Wochenende NMS Schubertviertel", buildingCodes: [NMS_SCHUBERTVIERTEL], dayType: "WEEKEND", hourlyRate: 5.09 },
  // Dauernutzer-Sondertarif: durchgehend 0,73 €/h
  { groupCode: "DAUERNUTZER", name: "Dauernutzer Fixsatz", buildingCodes: ALL_BUILDINGS, dayType: "ALL", hourlyRate: 0.73 },
  // Auswaertige/Kommerzielle: Wochenende 21,80 €/h (nur NMS Langenhart belegt)
  { groupCode: "AUSWAERTIG", name: "Auswärtig Wochenende NMS Langenhart", buildingCodes: [NMS_LANGENHART], dayType: "WEEKEND", hourlyRate: 21.8 },
  // Schule/Subvention: 16,72 €/h (Gegenverrechnung bzw. Subventionsmiete)
  { groupCode: "SCHULE_SUBVENTION", name: "Schule/Subvention Fixsatz", buildingCodes: ALL_BUILDINGS, dayType: "ALL", hourlyRate: 16.72 },
  // Stadtgemeinde/VHS: keine Verrechnung
  { groupCode: "GEMEINDE", name: "Stadtgemeinde/VHS kostenlos", buildingCodes: ALL_BUILDINGS, dayType: "ALL", hourlyRate: 0 },
];

async function main() {
  const groupIdByCode = new Map<string, string>();
  let createdGroups = 0;

  for (const group of tariffGroups) {
    const existing = await prisma.tariffGroup.findUnique({ where: { code: group.code } });
    if (existing) {
      groupIdByCode.set(group.code, existing.id);
      continue;
    }
    const created = await prisma.tariffGroup.create({ data: group });
    groupIdByCode.set(group.code, created.id);
    createdGroups += 1;
  }

  const buildings = await prisma.building.findMany({
    where: { code: { in: ALL_BUILDINGS } },
    select: { code: true, name: true, rooms: { select: { id: true, name: true } } },
  });
  const buildingByCode = new Map(buildings.map((building) => [building.code, building]));

  for (const code of ALL_BUILDINGS) {
    if (!buildingByCode.has(code)) {
      console.warn(`Warnung: Gebäude mit Code ${code} nicht gefunden – zugehörige Tarife werden übersprungen.`);
    }
  }

  let createdTariffs = 0;
  let skippedTariffs = 0;

  for (const definition of tariffDefinitions) {
    const tariffGroupId = groupIdByCode.get(definition.groupCode)!;

    for (const buildingCode of definition.buildingCodes) {
      const building = buildingByCode.get(buildingCode);
      if (!building) continue;

      for (const room of building.rooms) {
        const existing = await prisma.tariff.findFirst({
          where: {
            roomId: room.id,
            tariffGroupId,
            dayType: definition.dayType,
            usageTypeId: null,
            organizationTypeId: null,
          },
          select: { id: true },
        });

        if (existing) {
          skippedTariffs += 1;
          continue;
        }

        await prisma.tariff.create({
          data: {
            tariffGroupId,
            roomId: room.id,
            usageTypeId: null,
            organizationTypeId: null,
            name: definition.name,
            hourlyRate: definition.hourlyRate,
            flatRate: null,
            dayType: definition.dayType,
            validFrom: VALID_FROM,
            validUntil: null,
          },
        });
        createdTariffs += 1;
      }
    }
  }

  console.log(
    `Tarif-Seed abgeschlossen: ${createdGroups} Tarifgruppen neu, ${createdTariffs} Tarife angelegt, ${skippedTariffs} bereits vorhanden.`,
  );
  console.log("Hinweis: Organisationen unter Stammdaten → Organisationen einer Tarifgruppe zuordnen.");
}

main()
  .catch((error) => {
    console.error("Tarif-Seed fehlgeschlagen:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
