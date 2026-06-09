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
      where: {
        code: { notIn: ["EMERGENCY_SERVICE", "E2E_ASSOCIATION"] },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return { organizations, organizationTypes };
}

export async function saveOrganization(input: unknown) {
  const data = organizationSchema.parse(input);
  const blockedReason = data.status !== "ACTIVE" ? data.blockedReason || "Gesperrt oder stillgelegt durch Verwaltung" : null;
  const canRequestBookings = data.status === "ACTIVE";

  const updateData = {
    name: data.name,
    organizationTypeId: data.organizationTypeId,
    status: data.status,
    blockedReason,
    canRequestBookings,
  };

  if (data.id) {
    await prisma.$transaction(async (transaction) => {
      await transaction.organization.update({
        where: { id: data.id },
        data: updateData,
      });

      if (data.status !== "ACTIVE") {
        const now = new Date();
        const affectedMemberships = await transaction.organizationMember.findMany({
          where: {
            organizationId: data.id,
            OR: [{ activeUntil: null }, { activeUntil: { gt: now } }],
          },
          select: { id: true, userId: true },
        });
        const userIds = Array.from(new Set(affectedMemberships.map((membership) => membership.userId)));

        if (userIds.length > 0) {
          await transaction.user.updateMany({
            where: { id: { in: userIds } },
            data: { isActive: false },
          });
          await transaction.organizationMember.updateMany({
            where: { id: { in: affectedMemberships.map((membership) => membership.id) } },
            data: { activeUntil: now },
          });
        }
      }
    });
    return;
  }

  await prisma.organization.create({ data: updateData });
}
