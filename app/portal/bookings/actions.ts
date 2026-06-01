"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/permissions";
import { createMoveChangeRequest } from "@/lib/services/booking-change-service";
import { cancelOwnBookingRequest, createBookingRequest } from "@/lib/services/booking-service";
import { BookingValidationError } from "@/lib/services/booking-rules";
import { createBookingSeriesRequest } from "@/lib/services/booking-series-service";
import {
  processPendingNotifications,
  queueBookingNotifications,
} from "@/lib/services/notification-service";

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

export async function createBookingSeriesRequestAction(formData: FormData) {
  const user = await requirePermission("REQUEST_BOOKING");
  let errorMessage: string | undefined;
  let warningMessage: string | undefined;

  try {
    const result = await createBookingSeriesRequest(
      {
        organizationId: formData.get("organizationId"),
        roomId: formData.get("roomId"),
        usageTypeId: formData.get("usageTypeId"),
        title: formData.get("title"),
        description: formData.get("description"),
        firstStartsAt: formData.get("firstStartsAt"),
        firstEndsAt: formData.get("firstEndsAt"),
        repeatUntil: formData.get("repeatUntil"),
      },
      user.id,
    );

    try {
      for (const booking of result.createdBookings) {
        await queueBookingNotifications(booking.id, "BOOKING_REQUESTED");
      }
      await processPendingNotifications();
    } catch (notificationError) {
      console.error("Booking series notifications failed", notificationError);
    }

    warningMessage = [
      ...result.warnings,
      ...result.skipped.map((entry) => `${entry.startsAt.toLocaleDateString("de-AT")}: ${entry.reason}`),
    ].join(" ");
  } catch (error) {
    errorMessage = bookingErrorMessage(error);
  }

  revalidatePath("/portal/bookings");
  const feedback = errorMessage
    ? `error=${encodeURIComponent(errorMessage)}`
    : warningMessage
      ? `seriesSaved=1&warning=${encodeURIComponent(warningMessage)}`
      : "seriesSaved=1";
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

export async function createMoveChangeRequestAction(formData: FormData) {
  const user = await requirePermission("REQUEST_RESCHEDULE");
  let errorMessage: string | undefined;

  try {
    await createMoveChangeRequest(
      {
        bookingId: formData.get("bookingId"),
        newRoomId: formData.get("newRoomId"),
        newStartAt: formData.get("newStartAt"),
        newEndAt: formData.get("newEndAt"),
        reason: formData.get("reason"),
      },
      user.id,
    );
  } catch (error) {
    errorMessage = bookingErrorMessage(error);
  }

  revalidatePath("/portal/bookings");
  redirect(`/portal/bookings?${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "changeRequested=1"}`);
}
