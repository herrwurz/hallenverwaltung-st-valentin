import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateRoomCompositionChain } from "@/lib/services/admin/room-composition";

const roomStatusSchema = z.enum(["ACTIVE", "RESTRICTED", "OUT_OF_SERVICE"]);

const roomSchema = z.object({
  id: z.string().trim().optional(),
  buildingId: z.string().trim().min(1, "Ein Gebäude ist erforderlich."),
  parentRoomId: z.string().trim().optional(),
  code: z
    .string()
    .trim()
    .min(2, "Ein Code ist erforderlich.")
    .max(60)
    .regex(/^[A-Z0-9_]+$/, "Der Code darf nur Grossbuchstaben, Zahlen und Unterstriche enthalten."),
  name: z.string().trim().min(2, "Ein Name ist erforderlich.").max(120),
  description: z.string().trim().max(500).optional(),
  status: roomStatusSchema,
  isCombinable: z.boolean(),
  openingTime: z.string().regex(/^\d{2}:\d{2}$/, "Bitte eine gültige Öffnungszeit angeben."),
  closingTime: z.string().regex(/^\d{2}:\d{2}$/, "Bitte eine gültige Schliesszeit angeben."),
  setupBufferMinutes: z.coerce.number().int().min(0).max(1440),
  teardownBufferMinutes: z.coerce.number().int().min(0).max(1440),
});

export async function getRoomAdministrationData() {
  const [rooms, buildings] = await Promise.all([
    prisma.room.findMany({
      include: {
        building: true,
        componentChildren: {
          include: { parentRoom: true },
        },
        closures: {
          orderBy: { startsAt: "desc" },
          take: 5,
        },
      },
      orderBy: [{ building: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.building.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const statusRank = { ACTIVE: 0, RESTRICTED: 1, OUT_OF_SERVICE: 2 } as const;
  rooms.sort((a, b) => statusRank[a.status] - statusRank[b.status] || a.building.name.localeCompare(b.building.name) || a.name.localeCompare(b.name));

  return { rooms, buildings };
}

export async function saveRoom(input: unknown) {
  const data = roomSchema.parse(input);
  const parentRoomId = data.parentRoomId || null;

  if (data.id && parentRoomId === data.id) {
    throw new Error("Ein Raum kann nicht sein eigener Teilbereich sein.");
  }

  await prisma.$transaction(async (transaction) => {
    const room = data.id
      ? await transaction.room.update({
          where: { id: data.id },
          data: {
            buildingId: data.buildingId,
            code: data.code,
            name: data.name,
            description: data.description || null,
            status: data.status,
            isCombinable: data.isCombinable,
            openingTime: data.openingTime,
            closingTime: data.closingTime,
            setupBufferMinutes: data.setupBufferMinutes,
            teardownBufferMinutes: data.teardownBufferMinutes,
          },
        })
      : await transaction.room.create({
          data: {
            buildingId: data.buildingId,
            code: data.code,
            name: data.name,
            description: data.description || null,
            status: data.status,
            isCombinable: data.isCombinable,
            openingTime: data.openingTime,
            closingTime: data.closingTime,
            setupBufferMinutes: data.setupBufferMinutes,
            teardownBufferMinutes: data.teardownBufferMinutes,
          },
        });

    await transaction.roomComposition.deleteMany({
      where: { childRoomId: room.id },
    });

    if (parentRoomId) {
      if (parentRoomId === room.id) {
        throw new Error("Ein Raum kann nicht sein eigener Teilbereich sein.");
      }

      const parentRoom = await transaction.room.findUnique({
        where: { id: parentRoomId },
        select: { buildingId: true },
      });

      if (!parentRoom || parentRoom.buildingId !== room.buildingId) {
        throw new Error("Parent-Room und Teilbereich müssen demselben Gebäude zugeordnet sein.");
      }

      const compositionLinks = await transaction.roomComposition.findMany({
        select: { parentRoomId: true, childRoomId: true },
      });
      validateRoomCompositionChain(room.id, parentRoomId, compositionLinks);

      await transaction.roomComposition.create({
        data: { parentRoomId, childRoomId: room.id },
      });
    }
  });
}
