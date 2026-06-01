import { Prisma, type AccessMediumType } from "@prisma/client";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { BookingValidationError } from "@/lib/services/booking-rules";

export const accessMediumTypes = ["KEY", "RFID_CARD", "ELECTRONIC_ACCESS"] as const satisfies AccessMediumType[];

export const accessMediumSchema = z.object({
  buildingId: z.string().trim().min(1, "Ein Gebaeude ist erforderlich."),
  roomId: z.string().trim().optional().or(z.literal("")),
  type: z.enum(accessMediumTypes),
  identifier: z.string().trim().min(2, "Eine Kennung ist erforderlich.").max(100),
});

export const accessAssignmentSchema = z.object({
  accessMediumId: z.string().trim().min(1, "Ein Zutrittsmedium ist erforderlich."),
  organizationId: z.string().trim().optional().or(z.literal("")),
  issuedToName: z.string().trim().min(2, "Ein Empfaenger ist erforderlich.").max(150),
});

export const accessReturnSchema = z.object({
  assignmentId: z.string().trim().min(1, "Die Ausgabe ist ungueltig."),
});

export const accessDeactivateSchema = z.object({
  accessMediumId: z.string().trim().min(1, "Das Zutrittsmedium ist ungueltig."),
});

type AccessClient = Prisma.TransactionClient | typeof prisma;

function normalizeOptionalId(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

async function assertManageAccess(actorUserId: string) {
  const canManageAccess = await hasPermission(actorUserId, "MANAGE_ACCESS");
  if (!canManageAccess) {
    throw new BookingValidationError("Fuer die Zutrittsverwaltung fehlt das Recht MANAGE_ACCESS.");
  }
}

export function assertMediumCanBeIssued(input: {
  isActive: boolean;
  activeAssignment?: { id: string } | null;
}) {
  if (!input.isActive) {
    throw new BookingValidationError("Inaktive Zutrittsmedien koennen nicht ausgegeben werden.");
  }

  if (input.activeAssignment) {
    throw new BookingValidationError("Dieses Zutrittsmedium ist bereits aktiv ausgegeben.");
  }
}

async function assertMediumTarget(data: z.infer<typeof accessMediumSchema>, client: AccessClient) {
  const building = await client.building.findUnique({
    where: { id: data.buildingId },
    select: { id: true, isActive: true },
  });

  if (!building?.isActive) {
    throw new BookingValidationError("Das Gebaeude wurde nicht gefunden oder ist inaktiv.");
  }

  if (data.roomId) {
    const room = await client.room.findUnique({
      where: { id: data.roomId },
      select: { id: true, buildingId: true, status: true },
    });

    if (!room || room.status !== "ACTIVE") {
      throw new BookingValidationError("Der Raum wurde nicht gefunden oder ist nicht aktiv.");
    }

    if (room.buildingId !== data.buildingId) {
      throw new BookingValidationError("Der Raum gehoert nicht zum ausgewaehlten Gebaeude.");
    }
  }
}

async function assertActiveOrganization(organizationId: string | undefined, client: AccessClient) {
  if (!organizationId) {
    return;
  }

  const organization = await client.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, status: true },
  });

  if (!organization || organization.status !== "ACTIVE") {
    throw new BookingValidationError("Zutrittsmedien duerfen nur aktiven Organisationen ausgegeben werden.");
  }
}

export async function getAdminAccessData() {
  const [accessMedia, buildings, rooms, organizations] = await Promise.all([
    prisma.accessMedium.findMany({
      include: {
        building: true,
        room: true,
        assignments: {
          include: { organization: true },
          orderBy: { issuedAt: "desc" },
          take: 5,
        },
      },
      orderBy: [{ building: { name: "asc" } }, { identifier: "asc" }],
    }),
    prisma.building.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.room.findMany({
      where: { status: "ACTIVE", building: { isActive: true } },
      include: { building: true },
      orderBy: [{ building: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.organization.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
  ]);

  return { accessMedia, buildings, rooms, organizations };
}

export async function createAccessMedium(input: unknown, actorUserId: string) {
  const parsed = accessMediumSchema.parse(input);
  const data = {
    ...parsed,
    roomId: normalizeOptionalId(parsed.roomId),
    identifier: parsed.identifier.trim(),
  };

  await assertManageAccess(actorUserId);

  return prisma.$transaction(async (transaction) => {
    await assertMediumTarget(data, transaction);

    try {
      const medium = await transaction.accessMedium.create({
        data: {
          buildingId: data.buildingId,
          roomId: data.roomId,
          type: data.type,
          identifier: data.identifier,
        },
      });

      await transaction.auditEntry.create({
        data: {
          actorUserId,
          entityType: "AccessMedium",
          entityId: medium.id,
          action: "CREATED",
          payload: { identifier: medium.identifier, type: medium.type, buildingId: medium.buildingId, roomId: medium.roomId },
        },
      });

      return medium;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BookingValidationError("Diese Zutrittskennung existiert bereits.");
      }

      throw error;
    }
  });
}

export async function issueAccessMedium(input: unknown, actorUserId: string, now = new Date()) {
  const parsed = accessAssignmentSchema.parse(input);
  const organizationId = normalizeOptionalId(parsed.organizationId);

  await assertManageAccess(actorUserId);

  return prisma.$transaction(async (transaction) => {
    const medium = await transaction.accessMedium.findUnique({
      where: { id: parsed.accessMediumId },
      include: {
        assignments: { where: { returnedAt: null }, select: { id: true }, take: 1 },
      },
    });

    if (!medium) {
      throw new BookingValidationError("Das Zutrittsmedium wurde nicht gefunden.");
    }

    assertMediumCanBeIssued({ isActive: medium.isActive, activeAssignment: medium.assignments[0] });
    await assertActiveOrganization(organizationId, transaction);

    try {
      const assignment = await transaction.accessAssignment.create({
        data: {
          accessMediumId: medium.id,
          organizationId,
          issuedToName: parsed.issuedToName.trim(),
          issuedAt: now,
        },
      });

      await transaction.auditEntry.create({
        data: {
          actorUserId,
          entityType: "AccessAssignment",
          entityId: assignment.id,
          action: "ISSUED",
          payload: {
            accessMediumId: medium.id,
            identifier: medium.identifier,
            organizationId,
            issuedToName: assignment.issuedToName,
          },
        },
      });

      return assignment;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BookingValidationError("Dieses Zutrittsmedium ist bereits aktiv ausgegeben.");
      }

      throw error;
    }
  });
}

export async function returnAccessAssignment(input: unknown, actorUserId: string, now = new Date()) {
  const parsed = accessReturnSchema.parse(input);
  await assertManageAccess(actorUserId);

  return prisma.$transaction(async (transaction) => {
    const result = await transaction.accessAssignment.updateMany({
      where: { id: parsed.assignmentId, returnedAt: null },
      data: { returnedAt: now },
    });

    if (result.count !== 1) {
      throw new BookingValidationError("Diese Ausgabe ist nicht mehr aktiv.");
    }

    const assignment = await transaction.accessAssignment.findUnique({
      where: { id: parsed.assignmentId },
      include: { accessMedium: true },
    });

    if (!assignment) {
      throw new BookingValidationError("Die Ausgabe wurde nicht gefunden.");
    }

    await transaction.auditEntry.create({
      data: {
        actorUserId,
        entityType: "AccessAssignment",
        entityId: assignment.id,
        action: "RETURNED",
        payload: { accessMediumId: assignment.accessMediumId, identifier: assignment.accessMedium.identifier },
      },
    });

    return assignment;
  });
}

export async function deactivateAccessMedium(input: unknown, actorUserId: string) {
  const parsed = accessDeactivateSchema.parse(input);
  await assertManageAccess(actorUserId);

  return prisma.$transaction(async (transaction) => {
    const activeAssignment = await transaction.accessAssignment.findFirst({
      where: { accessMediumId: parsed.accessMediumId, returnedAt: null },
      select: { id: true },
    });

    if (activeAssignment) {
      throw new BookingValidationError("Aktiv ausgegebene Zutrittsmedien koennen nicht deaktiviert werden.");
    }

    const result = await transaction.accessMedium.updateMany({
      where: { id: parsed.accessMediumId, isActive: true },
      data: { isActive: false },
    });

    if (result.count !== 1) {
      throw new BookingValidationError("Das Zutrittsmedium wurde nicht gefunden oder ist bereits inaktiv.");
    }

    await transaction.auditEntry.create({
      data: {
        actorUserId,
        entityType: "AccessMedium",
        entityId: parsed.accessMediumId,
        action: "DEACTIVATED",
      },
    });
  });
}
