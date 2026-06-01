"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/permissions";
import { BookingValidationError } from "@/lib/services/booking-rules";
import { recordHandoverEvent } from "@/lib/services/handover-service";

function handoverErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Die Eingaben sind nicht gueltig.";
  }

  if (error instanceof BookingValidationError) {
    return error.message;
  }

  return "Die Hallenuebergabe konnte nicht verarbeitet werden.";
}

export async function recordHandoverEventAction(formData: FormData) {
  const user = await requirePermission("MANAGE_HANDOVERS");
  let errorMessage: string | undefined;

  try {
    await recordHandoverEvent(
      {
        bookingId: formData.get("bookingId"),
        action: formData.get("action"),
        notes: formData.get("notes"),
      },
      user.id,
    );
  } catch (error) {
    errorMessage = handoverErrorMessage(error);
  }

  revalidatePath("/admin/handovers");
  redirect(`/admin/handovers?${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "saved=1"}`);
}
