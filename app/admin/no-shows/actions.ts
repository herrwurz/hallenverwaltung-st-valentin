"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/permissions";
import { BookingValidationError } from "@/lib/services/booking-rules";
import { acknowledgeNoShow, reportNoShow } from "@/lib/services/no-show-service";

function noShowErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Die Eingaben sind nicht gueltig.";
  }

  if (error instanceof BookingValidationError) {
    return error.message;
  }

  return "Die No-Show-Meldung konnte nicht verarbeitet werden.";
}

export async function reportNoShowAction(formData: FormData) {
  const user = await requirePermission("REPORT_NO_SHOW");
  let errorMessage: string | undefined;

  try {
    await reportNoShow(
      {
        bookingId: formData.get("bookingId"),
        description: formData.get("description"),
      },
      user.id,
    );
  } catch (error) {
    errorMessage = noShowErrorMessage(error);
  }

  revalidatePath("/admin/no-shows");
  redirect(`/admin/no-shows?${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "saved=1"}`);
}

export async function acknowledgeNoShowAction(formData: FormData) {
  const user = await requirePermission("VIEW_BOOKINGS");
  const status = String(formData.get("status") ?? "");
  let errorMessage: string | undefined;

  try {
    await acknowledgeNoShow({ noShowReportId: formData.get("noShowReportId") }, user.id);
  } catch (error) {
    errorMessage = noShowErrorMessage(error);
  }

  revalidatePath("/admin/no-shows");
  const query = new URLSearchParams(status ? { status } : undefined);
  query.set(errorMessage ? "error" : "acknowledged", errorMessage ?? "1");
  redirect(`/admin/no-shows?${query.toString()}`);
}
