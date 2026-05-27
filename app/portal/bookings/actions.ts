"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/permissions";
import { cancelOwnBookingRequest, createBookingRequest } from "@/lib/services/booking-service";
import { BookingValidationError } from "@/lib/services/booking-rules";

function bookingErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Die Eingaben sind nicht gueltig.";
  }

  if (error instanceof BookingValidationError) {
    return error.message;
  }

  return "Der Buchungsantrag konnte nicht gespeichert werden.";
}

export async function createBookingRequestAction(formData: FormData) {
  const user = await requirePermission("REQUEST_BOOKING");
  let errorMessage: string | undefined;
  let warningMessage: string | undefined;

  try {
    const result = await createBookingRequest(
      {
        organizationId: formData.get("organizationId"),
        roomId: formData.get("roomId"),
        usageTypeId: formData.get("usageTypeId"),
        title: formData.get("title"),
        description: formData.get("description"),
        startsAt: formData.get("startsAt"),
        endsAt: formData.get("endsAt"),
      },
      user.id,
    );
    warningMessage = result.conflicts
      .filter((conflict) => conflict.severity === "soft")
      .map((conflict) => conflict.message)
      .join(" ");
  } catch (error) {
    errorMessage = bookingErrorMessage(error);
  }

  revalidatePath("/portal/bookings");
  const feedback = errorMessage
    ? `error=${encodeURIComponent(errorMessage)}`
    : warningMessage
      ? `saved=1&warning=${encodeURIComponent(warningMessage)}`
      : "saved=1";
  redirect(`/portal/bookings?${feedback}`);
}

export async function cancelOwnBookingRequestAction(formData: FormData) {
  const user = await requirePermission("CANCEL_OWN_BOOKING");
  const bookingId = String(formData.get("bookingId") ?? "");
  let errorMessage: string | undefined;

  try {
    await cancelOwnBookingRequest(bookingId, user.id);
  } catch (error) {
    errorMessage = bookingErrorMessage(error);
  }

  revalidatePath("/portal/bookings");
  redirect(`/portal/bookings?${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "cancelled=1"}`);
}
