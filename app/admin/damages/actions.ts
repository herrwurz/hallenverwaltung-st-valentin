"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/permissions";
import { updateDamageStatus } from "@/lib/services/damage-service";
import { BookingValidationError } from "@/lib/services/booking-rules";

function damageErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Die Eingaben sind nicht gueltig.";
  }

  if (error instanceof BookingValidationError) {
    return error.message;
  }

  return "Die Schadensmeldung konnte nicht bearbeitet werden.";
}

export async function updateDamageStatusAction(formData: FormData) {
  const user = await requirePermission("MANAGE_DAMAGE");
  const filter = String(formData.get("filter") ?? "");
  let errorMessage: string | undefined;

  try {
    await updateDamageStatus(
      {
        damageReportId: formData.get("damageReportId"),
        status: formData.get("status"),
      },
      user.id,
    );
  } catch (error) {
    errorMessage = damageErrorMessage(error);
  }

  revalidatePath("/admin/damages");
  revalidatePath("/portal/damages");
  const query = new URLSearchParams(filter ? { status: filter } : undefined);
  query.set(errorMessage ? "error" : "saved", errorMessage ?? "1");
  redirect(`/admin/damages?${query.toString()}`);
}
