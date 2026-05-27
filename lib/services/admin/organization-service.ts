import { z } from "zod";
import { prisma } from "@/lib/prisma";

const organizationSchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(2, "Ein Name ist erforderlich.").max(160),
  organizationTypeId: z.string().trim().min(1, "Ein Organisationstyp ist erforderlich."),
  status: z.enum(["ACTIVE", "BLOCKED", "INACTIVE"]),
  blockedReason: z.string().trim().max(500).optional(),
});

export async function getOrganizationAdministrationData() {
  const [organizations, organizationTypes] = await Promise.all([
    prisma.organization.findMany({
      include: {
        organizationType: true,
        members: { select: { id: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.organizationType.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  return { organizations, organizationTypes };
}

export async function saveOrganization(input: unknown) {
  const data = organizationSchema.parse(input);
  const blockedReason = data.status === "BLOCKED" ? data.blockedReason || "Gesperrt durch Verwaltung" : null;
  const canRequestBookings = data.status === "ACTIVE";

  const updateData = {
    name: data.name,
    organizationTypeId: data.organizationTypeId,
    status: data.status,
    blockedReason,
    canRequestBookings,
  };

  if (data.id) {
    await prisma.organization.update({
      where: { id: data.id },
      data: updateData,
    });
    return;
  }

  await prisma.organization.create({ data: updateData });
}
