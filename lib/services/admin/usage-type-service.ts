import { z } from "zod";
import { prisma } from "@/lib/prisma";

const usageTypeSchema = z.object({
  id: z.string().trim().optional(),
  code: z
    .string()
    .trim()
    .min(2, "Ein Code ist erforderlich.")
    .max(50)
    .regex(/^[A-Z0-9_]+$/, "Der Code darf nur Großbuchstaben, Zahlen und Unterstriche enthalten."),
  name: z.string().trim().min(2, "Ein Name ist erforderlich.").max(120),
  priority: z.coerce.number().int().min(1, "Priorität muss mindestens 1 sein.").max(9999),
  requiresApproval: z.boolean(),
  mayDisplaceLowerPriority: z.boolean(),
  isActive: z.boolean(),
});

export async function getUsageTypeAdministrationData() {
  return prisma.usageType.findMany({
    orderBy: [{ isActive: "desc" }, { priority: "asc" }, { name: "asc" }],
  });
}

export async function saveUsageType(input: unknown) {
  const data = usageTypeSchema.parse(input);

  if (data.id) {
    await prisma.usageType.update({
      where: { id: data.id },
      data: {
        name: data.name,
        priority: data.priority,
        requiresApproval: data.requiresApproval,
        mayDisplaceLowerPriority: data.mayDisplaceLowerPriority,
        isActive: data.isActive,
      },
    });
  } else {
    await prisma.usageType.create({
      data: {
        code: data.code,
        name: data.name,
        priority: data.priority,
        requiresApproval: data.requiresApproval,
        mayDisplaceLowerPriority: data.mayDisplaceLowerPriority,
        isActive: data.isActive,
      },
    });
  }
}
