"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError, z } from "zod";
import { requirePermission } from "@/lib/permissions";
import {
  BillingValidationError,
  createBillingEntriesForPeriod,
  markBillingEntriesExported,
} from "@/lib/services/billing-service";

const periodSchema = z.object({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
});

const exportSchema = z.object({
  entryIds: z.array(z.string()).default([]),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
});

function getErrorMessage(error: unknown) {
  if (error instanceof BillingValidationError) {
    return error.message;
  }

  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Die Eingaben sind ungueltig.";
  }

  return "Die Abrechnung konnte nicht verarbeitet werden.";
}

function billingRedirect(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value !== "undefined" && value !== "") {
      query.set(key, String(value));
    }
  }

  redirect(`/admin/billing?${query.toString()}`);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export async function createBillingEntriesAction(formData: FormData) {
  const user = await requirePermission("BILLING_EXPORT");
  const periodStart = String(formData.get("periodStart") ?? "");
  const periodEnd = String(formData.get("periodEnd") ?? "");

  try {
    const input = periodSchema.parse({ periodStart, periodEnd });
    const result = await createBillingEntriesForPeriod(
      {
        periodStart: input.periodStart,
        periodEnd: addDays(input.periodEnd, 1),
        actorUserId: user.id,
      },
      undefined,
      { canExport: true },
    );

    revalidatePath("/admin/billing");
    billingRedirect({
      periodStart,
      periodEnd,
      created: result.entries.length,
      skipped: result.skipped.length,
    });
  } catch (error) {
    billingRedirect({ periodStart, periodEnd, error: getErrorMessage(error) });
  }
}

export async function markBillingEntriesExportedAction(formData: FormData) {
  const user = await requirePermission("BILLING_EXPORT");
  const periodStart = String(formData.get("periodStart") ?? "");
  const periodEnd = String(formData.get("periodEnd") ?? "");

  try {
    const input = exportSchema.parse({
      entryIds: formData.getAll("entryIds"),
      periodStart,
      periodEnd,
    });
    const result = await markBillingEntriesExported(
      {
        entryIds: input.entryIds,
        actorUserId: user.id,
      },
      undefined,
      { canExport: true },
    );

    revalidatePath("/admin/billing");
    billingRedirect({
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      exported: result.count,
    });
  } catch (error) {
    billingRedirect({ periodStart, periodEnd, error: getErrorMessage(error) });
  }
}
