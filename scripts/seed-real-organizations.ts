// Legt Vereine/Organisationen an, die in "Hallen-Tarife und Infos.xlsx" (Stand
// Juli 2026) namentlich genannt sind. Die Excel-Datei listet nur Vereinsnamen
// im Kontext einzelner Tarifzeilen, keine vollstaendigen Stammdaten (Adresse,
// Login-Kontakt) - Organisationstyp und Tarifgruppe sind daher eine fachliche
// Einschaetzung und muessen im Admin-Menue "Organisationen" geprueft werden.
// Idempotent: eine Organisation mit exakt gleichem Namen wird nicht erneut angelegt.
// Aufruf: npm run organizations:seed
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type OrganizationDefinition = {
  name: string;
  organizationTypeCode: string;
  tariffGroupCode: string | null;
  isBillingRelevant: boolean;
  note: string;
  contactName?: string;
};

const organizationDefinitions: OrganizationDefinition[] = [
  {
    name: "SC St. Valentin",
    organizationTypeCode: "ASSOCIATION",
    tariffGroupCode: "ORTSVEREIN",
    isBillingRelevant: true,
    note: "Mo–Fr NMS-LH; Wochenende NMS-LH gemeinsam mit SK Armenia/Flag Football.",
  },
  {
    name: "ATSV St. Valentin",
    organizationTypeCode: "ASSOCIATION",
    tariffGroupCode: "ORTSVEREIN",
    isBillingRelevant: true,
    note: "Mo–Fr VS-Langenhart.",
  },
  {
    name: "ATSV Volleyball",
    organizationTypeCode: "ASSOCIATION",
    tariffGroupCode: "DAUERNUTZER",
    isBillingRelevant: true,
    note: "Eigene Zeile mit Fixsatz auch am Wochenende (0,73) – ggf. Sektion von ATSV St. Valentin, im Excel aber tariflich abweichend von diesem behandelt. Bitte prüfen, ob eigenständige Organisation sinnvoll ist.",
  },
  {
    name: "ASK St. Valentin",
    organizationTypeCode: "ASSOCIATION",
    tariffGroupCode: "ORTSVEREIN",
    isBillingRelevant: true,
    note: "Mo–Fr NMS-LH.",
  },
  {
    name: "ASK Tischtennis",
    organizationTypeCode: "ASSOCIATION",
    tariffGroupCode: "ORTSVEREIN",
    isBillingRelevant: true,
    note: "Mo–Fr NMS-SV. Ggf. Sektion von ASK St. Valentin – bitte prüfen, ob Zusammenlegung sinnvoll ist.",
  },
  {
    name: "Blasorchester Case",
    organizationTypeCode: "ASSOCIATION",
    tariffGroupCode: "DAUERNUTZER",
    isBillingRelevant: true,
    note: "Wochenende NMS-LH, Fixsatz 0,73.",
  },
  {
    name: "ATV St. Valentin",
    organizationTypeCode: "ASSOCIATION",
    tariffGroupCode: "ORTSVEREIN",
    isBillingRelevant: true,
    note: "Mo–Fr NMS-SV. Wochenendtarif laut Excel 21,80 (höher als üblicher Ortsverein-Satz) – da Tarife ohnehin überarbeitet werden, vorerst normaler Ortsverein-Satz.",
  },
  {
    name: "SK Armenia",
    organizationTypeCode: "ASSOCIATION",
    tariffGroupCode: "ORTSVEREIN",
    isBillingRelevant: true,
    note: "Zusätzlich laut Excel: Jahresrechnung + Duschpauschale 10 €/Monat – im aktuellen Tarifmodell nicht abgebildet, vorerst manuell auf der Jahresrechnung berücksichtigen.",
  },
  {
    name: "Flag Football",
    organizationTypeCode: "ASSOCIATION",
    tariffGroupCode: "ORTSVEREIN",
    isBillingRelevant: true,
    note: "Nutzt laut Excel sowohl NMS-LH als auch NMS-SV am Wochenende.",
  },
  {
    name: "FC Harold",
    organizationTypeCode: "EXTERNAL",
    tariffGroupCode: "AUSWAERTIG",
    isBillingRelevant: true,
    note: "Wochenende NMS-SV.",
  },
  {
    name: "FC Kosmos",
    organizationTypeCode: "EXTERNAL",
    tariffGroupCode: "AUSWAERTIG",
    isBillingRelevant: true,
    note: "Wochenende NMS-SV.",
  },
  {
    name: "CF United",
    organizationTypeCode: "EXTERNAL",
    tariffGroupCode: "AUSWAERTIG",
    isBillingRelevant: true,
    note: "Wochenende NMS-SV.",
  },
  {
    name: "SC St. Pantaleon",
    organizationTypeCode: "EXTERNAL",
    tariffGroupCode: "AUSWAERTIG",
    isBillingRelevant: true,
    note: "Wochenende NMS-LH, gemeinsam mit Fußballschule Salzkammergut genannt.",
  },
  {
    name: "Fußballschule Salzkammergut",
    organizationTypeCode: "EXTERNAL",
    tariffGroupCode: "AUSWAERTIG",
    isBillingRelevant: true,
    note: "Wochenende NMS-LH.",
  },
  {
    name: "ASK Hüttler-Hinum",
    organizationTypeCode: "ASSOCIATION",
    tariffGroupCode: "ORTSVEREIN",
    isBillingRelevant: true,
    note: "NMS-SV, Buchungen laut Excel bisher im Nachhinein per Mail bekanntgegeben.",
    contactName: "Doris Bruder",
  },
  {
    name: "Karli-Club",
    organizationTypeCode: "ASSOCIATION",
    tariffGroupCode: "ORTSVEREIN",
    isBillingRelevant: true,
    note: "NMS-SV, Buchungen laut Excel bisher im Nachhinein per Mail bekanntgegeben.",
  },
  {
    name: "MSG",
    organizationTypeCode: "SCHOOL",
    tariffGroupCode: "SCHULE_SUBVENTION",
    isBillingRelevant: true,
    note: "Laut Excel: 'MSG schreibt Rechnung an Stadtgemeinde, Wochenstunden immer 40 ergeben.' Genaue Rechtsform/Zweck unklar – bitte prüfen und ggf. Namen präzisieren.",
  },
  {
    name: "Schule Eigenbedarf (Turnstunden)",
    organizationTypeCode: "SCHOOL",
    tariffGroupCode: "SCHULE_SUBVENTION",
    isBillingRelevant: true,
    note: "NMS-LH, schulischer Eigenbedarf für Turnstunden, Gegenverrechnung statt Zahlung. Zeiten laut Excel zu Schuljahresbeginn per Mail bekanntgegeben. Bitte prüfen, ob diese interne Nutzung überhaupt über das Portal gebucht werden soll.",
  },
  {
    name: "VHS St. Valentin",
    organizationTypeCode: "VHS",
    tariffGroupCode: "GEMEINDE",
    isBillingRelevant: false,
    note: "Laut Excel keine Verrechnung für VHS-Kurse.",
  },
  {
    name: "Stadtgemeinde St. Valentin (Veranstaltungen)",
    organizationTypeCode: "MUNICIPALITY",
    tariffGroupCode: "GEMEINDE",
    isBillingRelevant: false,
    note: "Veranstaltungen der Stadtgemeinde (z.B. Kabarett), laut Excel keine Verrechnung.",
  },
];

async function main() {
  const organizationTypes = await prisma.organizationType.findMany({ select: { id: true, code: true } });
  const organizationTypeIdByCode = new Map(organizationTypes.map((type) => [type.code, type.id]));

  const tariffGroups = await prisma.tariffGroup.findMany({ select: { id: true, code: true } });
  const tariffGroupIdByCode = new Map(tariffGroups.map((group) => [group.code, group.id]));

  let created = 0;
  let skipped = 0;
  const warnings: string[] = [];

  for (const definition of organizationDefinitions) {
    const existing = await prisma.organization.findFirst({ where: { name: definition.name } });
    if (existing) {
      skipped += 1;
      continue;
    }

    const organizationTypeId = organizationTypeIdByCode.get(definition.organizationTypeCode);
    if (!organizationTypeId) {
      warnings.push(`Organisationstyp ${definition.organizationTypeCode} nicht gefunden – ${definition.name} übersprungen.`);
      continue;
    }

    const tariffGroupId = definition.tariffGroupCode ? tariffGroupIdByCode.get(definition.tariffGroupCode) ?? null : null;
    if (definition.tariffGroupCode && !tariffGroupId) {
      warnings.push(`Tarifgruppe ${definition.tariffGroupCode} nicht gefunden – ${definition.name} ohne Tarifgruppe angelegt.`);
    }

    const organization = await prisma.organization.create({
      data: {
        name: definition.name,
        organizationTypeId,
        tariffGroupId,
        isBillingRelevant: definition.isBillingRelevant,
        status: "ACTIVE",
      },
    });

    if (definition.contactName) {
      await prisma.organizationContact.create({
        data: {
          organizationId: organization.id,
          name: definition.contactName,
          function: "Ansprechperson (laut Tarifliste)",
          isPrimary: true,
        },
      });
    }

    created += 1;
  }

  console.log(`Organisations-Seed abgeschlossen: ${created} neu angelegt, ${skipped} bereits vorhanden.`);
  if (warnings.length > 0) {
    console.log("Warnungen:");
    warnings.forEach((warning) => console.log(` - ${warning}`));
  }
  console.log(
    "Wichtig: Namen, Organisationstyp und Tarifgruppe sind aus der Excel-Tarifliste abgeleitet und ungeprüft. " +
      "Bitte unter Stammdaten → Organisationen kontrollieren und bei Bedarf korrigieren.",
  );
}

main()
  .catch((error) => {
    console.error("Organisations-Seed fehlgeschlagen:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
