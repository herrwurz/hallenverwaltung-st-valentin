import { z } from "zod";
import { prisma } from "@/lib/prisma";

const buildingSchema = z.object({
  id: z.string().trim().optional(),
  code: z
    .string()
    .trim()
    .min(2, "Ein Code ist erforderlich.")
    .max(50)
    .regex(/^[A-Z0-9_]+$/, "Der Code darf nur Grossbuchstaben, Zahlen und Unterstriche enthalten."),
  name: z.string().trim().min(2, "Ein Name ist erforderlich.").max(120),
  address: z.string().trim().max(240).optional(),
  postalCode: z.string().trim().max(20).optional(),
  city: z.string().trim().max(120).optional(),
  email: z.string().trim().email("Bitte eine gültige E-Mail-Adresse angeben.").max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(60).optional(),
  isActive: z.boolean(),
  caretakerId: z.string().trim().optional(),
});

export async function getBuildingAdministrationData() {
  const [buildings, caretakers] = await Promise.all([
    prisma.building.findMany({
      include: {
        rooms: {
          select: {
            id: true,
            name: true,
            closures: {
              orderBy: { startsAt: "desc" },
              take: 5,
            },
          },
        },
        caretakers: {
          where: { isPrimary: true },
          include: { caretaker: true },
        },
        closures: {
          orderBy: { startsAt: "desc" },
          take: 5,
        },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    prisma.caretaker.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { buildings, caretakers };
}

export async function saveBuilding(input: unknown) {
  const data = buildingSchema.parse(input);
  const address = data.address || null;
  const postalCode = data.postalCode || null;
  const city = data.city || null;
  const email = data.email || null;
  const phone = data.phone || null;
  const caretakerId = data.caretakerId || null;

  await prisma.$transaction(async (transaction) => {
    const building = data.id
      ? await transaction.building.update({
          where: { id: data.id },
          data: {
            name: data.name,
            address,
            postalCode,
            city,
            email,
            phone,
            isActive: data.isActive,
          },
        })
      : await transaction.building.create({
          data: {
            code: data.code,
            name: data.name,
            address,
            postalCode,
            city,
            email,
            phone,
            isActive: data.isActive,
          },
        });

    await transaction.buildingCaretaker.deleteMany({
      where: { buildingId: building.id },
    });

    if (caretakerId) {
      await transaction.buildingCaretaker.create({
        data: {
          buildingId: building.id,
          caretakerId,
          isPrimary: true,
        },
      });
    }
  });
}
