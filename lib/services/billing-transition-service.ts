import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type BillingTransitionClient = Pick<PrismaClient, "billingEntry">;

export async function markOpenBillingEntriesExported(
  input: { entryIds: string[]; exportedAt?: Date },
  client: BillingTransitionClient = prisma,
) {
  const ids = [...new Set(input.entryIds.map((id) => id.trim()).filter(Boolean))];

  if (ids.length === 0) {
    throw new Error("Es wurden keine Abrechnungseintraege ausgewaehlt.");
  }

  return client.billingEntry.updateMany({
    where: {
      id: { in: ids },
      status: "OPEN",
    },
    data: {
      status: "EXPORTED",
      exportedAt: input.exportedAt ?? new Date(),
    },
  });
}
