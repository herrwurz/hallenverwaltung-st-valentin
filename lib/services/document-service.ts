import type { DocumentType, Prisma } from "@prisma/client";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { BookingValidationError } from "@/lib/services/booking-rules";

export const documentTypes = [
  "HOUSE_RULES",
  "USAGE_CONTRACT",
  "INSURANCE_CERTIFICATE",
  "EVENT_PERMIT",
  "OTHER",
] as const satisfies DocumentType[];

export const documentMetadataSchema = z.object({
  organizationId: z.string().trim().optional(),
  buildingId: z.string().trim().optional(),
  roomId: z.string().trim().optional(),
  type: z.enum(documentTypes),
  fileName: z.string().trim().min(3, "Ein Dateiname ist erforderlich.").max(255),
});

type DocumentClient = Prisma.TransactionClient | typeof prisma;

export function assertExactlyOneDocumentTarget(input: {
  organizationId?: string | null;
  buildingId?: string | null;
  roomId?: string | null;
}) {
  const targetCount = [input.organizationId, input.buildingId, input.roomId].filter(Boolean).length;
  if (targetCount !== 1) {
    throw new BookingValidationError("Ein Dokument muss genau einer Organisation, einem Gebäude oder einem Raum zugeordnet sein.");
  }
}

function normalizeOptionalId(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function sanitizeFileName(fileName: string) {
  const trimmed = fileName.trim();
  const extensionMatch = trimmed.match(/(\.[a-zA-Z0-9]{1,12})$/);
  const extension = extensionMatch?.[1].toLowerCase() ?? "";
  const baseName = extension ? trimmed.slice(0, -extension.length) : trimmed;
  const normalizedBaseName = baseName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .toLowerCase();

  return `${normalizedBaseName || "document"}${extension}`;
}

export function createDocumentStorageKey(input: {
  organizationId?: string | null;
  buildingId?: string | null;
  roomId?: string | null;
  type: DocumentType;
  fileName: string;
  now?: Date;
}) {
  const organizationId = normalizeOptionalId(input.organizationId);
  const buildingId = normalizeOptionalId(input.buildingId);
  const roomId = normalizeOptionalId(input.roomId);
  assertExactlyOneDocumentTarget({ organizationId, buildingId, roomId });

  const target =
    organizationId ? `organizations/${organizationId}` : buildingId ? `buildings/${buildingId}` : `rooms/${roomId}`;
  const timestamp = (input.now ?? new Date()).toISOString().replace(/[-:.TZ]/g, "");
  return `documents/${target}/${input.type.toLowerCase()}/${timestamp}-${sanitizeFileName(input.fileName)}`;
}

async function assertActiveOrganizationMembership({
  organizationId,
  actorUserId,
  client,
}: {
  organizationId: string;
  actorUserId: string;
  client: DocumentClient;
}) {
  const now = new Date();
  const membership = await client.organizationMember.findFirst({
    where: {
      organizationId,
      userId: actorUserId,
      activeFrom: { lte: now },
      OR: [{ activeUntil: null }, { activeUntil: { gt: now } }],
      organization: { status: "ACTIVE" },
    },
    select: { id: true },
  });

  if (!membership) {
    throw new BookingValidationError("Sie dürfen nur Dokumente für aktive eigene Organisationen verwalten.");
  }
}

async function assertExistingDocumentTarget(
  input: z.infer<typeof documentMetadataSchema>,
  client: DocumentClient,
) {
  if (input.organizationId) {
    const organization = await client.organization.findUnique({
      where: { id: input.organizationId },
      select: { id: true },
    });
    if (!organization) {
      throw new BookingValidationError("Die Organisation wurde nicht gefunden.");
    }
  }

  if (input.buildingId) {
    const building = await client.building.findUnique({
      where: { id: input.buildingId },
      select: { id: true },
    });
    if (!building) {
      throw new BookingValidationError("Das Gebäude wurde nicht gefunden.");
    }
  }

  if (input.roomId) {
    const room = await client.room.findUnique({
      where: { id: input.roomId },
      select: { id: true },
    });
    if (!room) {
      throw new BookingValidationError("Der Raum wurde nicht gefunden.");
    }
  }
}

export async function getPortalDocumentData(actorUserId: string) {
  const now = new Date();
  const organizations = await prisma.organization.findMany({
    where: {
      status: "ACTIVE",
      members: {
        some: {
          userId: actorUserId,
          activeFrom: { lte: now },
          OR: [{ activeUntil: null }, { activeUntil: { gt: now } }],
        },
      },
    },
    include: {
      documents: { orderBy: { uploadedAt: "desc" } },
    },
    orderBy: { name: "asc" },
  });

  return { organizations };
}

export async function getAdminDocumentData() {
  const [documents, organizations, buildings, rooms] = await Promise.all([
    prisma.document.findMany({
      include: {
        organization: true,
        building: true,
        room: { include: { building: true } },
      },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.organization.findMany({ orderBy: { name: "asc" } }),
    prisma.building.findMany({ orderBy: { name: "asc" } }),
    prisma.room.findMany({ include: { building: true }, orderBy: [{ building: { name: "asc" } }, { name: "asc" }] }),
  ]);

  return { documents, organizations, buildings, rooms };
}

export async function createOrganizationDocument(input: unknown, actorUserId: string) {
  const parsed = documentMetadataSchema.parse(input);
  const data = {
    ...parsed,
    organizationId: normalizeOptionalId(parsed.organizationId),
    buildingId: normalizeOptionalId(parsed.buildingId),
    roomId: normalizeOptionalId(parsed.roomId),
  };
  if (!data.organizationId || data.buildingId || data.roomId) {
    throw new BookingValidationError("Im Portal können Dokumente nur Organisationen zugeordnet werden.");
  }

  return prisma.$transaction(async (transaction) => {
    await assertActiveOrganizationMembership({
      organizationId: data.organizationId!,
      actorUserId,
      client: transaction,
    });

    return transaction.document.create({
      data: {
        organizationId: data.organizationId,
        type: data.type,
        fileName: data.fileName,
        storageKey: createDocumentStorageKey(data),
      },
    });
  });
}

export async function createAdminDocument(input: unknown, actorUserId: string) {
  const canManageDocuments = await hasPermission(actorUserId, "MANAGE_DOCUMENTS");
  if (!canManageDocuments) {
    throw new BookingValidationError("Für die Dokumentenverwaltung fehlt das Recht MANAGE_DOCUMENTS.");
  }

  const parsed = documentMetadataSchema.parse(input);
  const data = {
    ...parsed,
    organizationId: normalizeOptionalId(parsed.organizationId),
    buildingId: normalizeOptionalId(parsed.buildingId),
    roomId: normalizeOptionalId(parsed.roomId),
  };
  assertExactlyOneDocumentTarget(data);

  return prisma.$transaction(async (transaction) => {
    await assertExistingDocumentTarget(data, transaction);
    return transaction.document.create({
      data: {
        organizationId: data.organizationId || null,
        buildingId: data.buildingId || null,
        roomId: data.roomId || null,
        type: data.type,
        fileName: data.fileName,
        storageKey: createDocumentStorageKey(data),
      },
    });
  });
}
