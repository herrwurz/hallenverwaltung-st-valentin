import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";

export class TariffValidationError extends Error {}

type TariffClient = Pick<PrismaClient, "tariff" | "tariffGroup">;

const tariffGroupSchema = z.object({
  id: z.string().trim().optional(),
  code: z
    .string()
    .trim()
    .min(2, "Ein Code ist erforderlich.")
    .max(50)
    .regex(/^[A-Z0-9_]+$/, "Der Code darf nur Großbuchstaben, Zahlen und Unterstriche enthalten."),
  name: z.string().trim().min(2, "Ein Name ist erforderlich.").max(120),
  description: z.string().trim().max(500).optional(),
});

const optionalMoney = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim().replace(",", ".");
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (Number.isNaN(parsed)) {
      throw new TariffValidationError("Der Betrag ist keine gültige Zahl.");
    }
    if (parsed < 0) {
      throw new TariffValidationError("Beträge dürfen nicht negativ sein.");
    }
    if (parsed > 100000) {
      throw new TariffValidationError("Der Betrag ist unrealistisch hoch.");
    }
    return Math.round(parsed * 100) / 100;
  });

const optionalReference = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    const trimmed = String(value ?? "").trim();
    return trimmed || null;
  });

const tariffSchema = z.object({
  id: z.string().trim().optional(),
  tariffGroupId: z.string().trim().min(1, "Eine Tarifgruppe ist erforderlich."),
  roomId: z.string().trim().min(1, "Ein Raum ist erforderlich."),
  usageTypeId: optionalReference,
  organizationTypeId: optionalReference,
  name: z.string().trim().min(2, "Ein Name ist erforderlich.").max(120),
  hourlyRate: optionalMoney,
  flatRate: optionalMoney,
  dayType: z.enum(["ALL", "WEEKDAY", "WEEKEND", "HOLIDAY"]),
  validFrom: z.coerce.date({ message: "Gültig-ab-Datum ist erforderlich." }),
  validUntil: z
    .union([z.string(), z.date(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === null || value === undefined || value === "") return null;
      const parsed = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        throw new TariffValidationError("Das Gültig-bis-Datum ist ungültig.");
      }
      return parsed;
    }),
});

export async function getTariffAdministrationData(client: TariffClient = prisma) {
  const [tariffGroups, tariffs, buildings, usageTypes, organizationTypes] = await Promise.all([
    client.tariffGroup.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { organizations: true, tariffs: true } },
      },
    }),
    client.tariff.findMany({
      orderBy: [{ validFrom: "desc" }],
      include: {
        room: { select: { id: true, name: true, building: { select: { id: true, name: true } } } },
        tariffGroup: { select: { id: true, name: true } },
        usageType: { select: { id: true, name: true } },
        organizationType: { select: { id: true, name: true } },
      },
    }),
    prisma.building.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, rooms: { orderBy: { name: "asc" }, select: { id: true, name: true } } },
    }),
    prisma.usageType.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, isActive: true } }),
    prisma.organizationType.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return { tariffGroups, tariffs, buildings, usageTypes, organizationTypes };
}

export async function saveTariffGroup(input: unknown, client: TariffClient = prisma) {
  const data = tariffGroupSchema.parse(input);

  if (data.id) {
    await client.tariffGroup.update({
      where: { id: data.id },
      data: { name: data.name, description: data.description || null },
    });
    return;
  }

  const existing = await client.tariffGroup.findUnique({ where: { code: data.code } });
  if (existing) {
    throw new TariffValidationError("Eine Tarifgruppe mit diesem Code existiert bereits.");
  }

  await client.tariffGroup.create({
    data: { code: data.code, name: data.name, description: data.description || null },
  });
}

function intervalsOverlap(
  left: { validFrom: Date; validUntil: Date | null },
  right: { validFrom: Date; validUntil: Date | null },
) {
  const leftEnd = left.validUntil?.getTime() ?? Number.POSITIVE_INFINITY;
  const rightEnd = right.validUntil?.getTime() ?? Number.POSITIVE_INFINITY;
  return left.validFrom.getTime() <= rightEnd && right.validFrom.getTime() <= leftEnd;
}

async function assertNoOverlappingTariff(
  data: {
    id?: string;
    roomId: string;
    tariffGroupId: string;
    dayType: "ALL" | "WEEKDAY" | "WEEKEND" | "HOLIDAY";
    usageTypeId: string | null;
    organizationTypeId: string | null;
    validFrom: Date;
    validUntil: Date | null;
  },
  client: TariffClient,
) {
  const candidates = await client.tariff.findMany({
    where: {
      roomId: data.roomId,
      tariffGroupId: data.tariffGroupId,
      dayType: data.dayType,
      usageTypeId: data.usageTypeId,
      organizationTypeId: data.organizationTypeId,
      ...(data.id ? { id: { not: data.id } } : {}),
    },
    select: { id: true, validFrom: true, validUntil: true },
  });

  const conflict = candidates.find((candidate) => intervalsOverlap(candidate, data));
  if (conflict) {
    throw new TariffValidationError(
      "Für diese Kombination aus Raum, Tarifgruppe, Tagesart, Nutzungstyp und Organisationsart existiert bereits ein zeitlich überlappender Tarif.",
    );
  }
}

export async function saveTariff(input: unknown, client: TariffClient = prisma) {
  const data = tariffSchema.parse(input);

  if (data.hourlyRate !== null && data.flatRate !== null) {
    throw new TariffValidationError("Bitte entweder Stundensatz oder Pauschale angeben, nicht beides.");
  }

  if (data.validUntil && !(data.validFrom < data.validUntil)) {
    throw new TariffValidationError("Das Gültig-bis-Datum muss nach dem Gültig-ab-Datum liegen.");
  }

  await assertNoOverlappingTariff(data, client);

  const record: Prisma.TariffUncheckedCreateInput = {
    tariffGroupId: data.tariffGroupId,
    roomId: data.roomId,
    usageTypeId: data.usageTypeId,
    organizationTypeId: data.organizationTypeId,
    name: data.name,
    hourlyRate: data.hourlyRate,
    flatRate: data.flatRate,
    dayType: data.dayType,
    validFrom: data.validFrom,
    validUntil: data.validUntil,
  };

  if (data.id) {
    await client.tariff.update({ where: { id: data.id }, data: record });
    return;
  }

  await client.tariff.create({ data: record });
}

export async function endTariff(input: unknown, client: TariffClient = prisma) {
  const data = z
    .object({
      id: z.string().trim().min(1, "Tarif-ID fehlt."),
      validUntil: z.coerce.date({ message: "Ein Enddatum ist erforderlich." }),
    })
    .parse(input);

  const tariff = await client.tariff.findUnique({
    where: { id: data.id },
    select: { validFrom: true },
  });

  if (!tariff) {
    throw new TariffValidationError("Der Tarif wurde nicht gefunden.");
  }

  if (!(tariff.validFrom < data.validUntil)) {
    throw new TariffValidationError("Das Enddatum muss nach dem Gültig-ab-Datum liegen.");
  }

  await client.tariff.update({
    where: { id: data.id },
    data: { validUntil: data.validUntil },
  });
}
