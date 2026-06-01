"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/permissions";
import { reportDamage } from "@/lib/services/damage-service";
import { BookingValidationError } from "@/lib/services/booking-rules";

function damageErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Die Eingaben sind nicht gültig.";
  }

  if (error instanceof BookingValidationError) {
    return error.message;
  }

  return "Die Schadensmeldung konnte nicht gespeichert werden.";
}

export async function reportDamageAction(formData: FormData) {
  const user = await requirePermission("REPORT_DAMAGE");
  let errorMessage: string | undefined;

  try {
    await reportDamage(
      {
        roomId: formData.get("roomId"),
        description: formData.get("description"),
        photoStorageKey: formData.get("photoStorageKey"),
      },
      user.id,
    );
  } catch (error) {
    errorMessage = damageErrorMessage(error);
  }

  revalidatePath("/portal/damages");
  redirect(`/portal/damages?${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "saved=1"}`);
}
