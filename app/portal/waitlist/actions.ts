"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/permissions";
import {
  acceptWaitlistOffer,
  createWaitlistEntry,
  declineWaitlistOffer,
} from "@/lib/services/waitlist-service";
import { BookingValidationError } from "@/lib/services/booking-rules";

function waitlistErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Die Eingaben sind nicht gültig.";
  }

  if (error instanceof BookingValidationError) {
    return error.message;
  }

  return "Der Wartelistenplatz konnte nicht verarbeitet werden.";
}

export async function createWaitlistEntryAction(formData: FormData) {
  const user = await requirePermission("REQUEST_BOOKING");
  let errorMessage: string | undefined;

  try {
    await createWaitlistEntry(
      {
        organizationId: formData.get("organizationId"),
        roomId: formData.get("roomId"),
        usageTypeId: formData.get("usageTypeId"),
        title: formData.get("title"),
        startsAt: formData.get("startsAt"),
        endsAt: formData.get("endsAt"),
      },
      user.id,
    );
  } catch (error) {
    errorMessage = waitlistErrorMessage(error);
  }

  revalidatePath("/portal/waitlist");
  redirect(`/portal/waitlist?${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "saved=1"}`);
}

export async function acceptWaitlistOfferAction(formData: FormData) {
  const user = await requirePermission("REQUEST_BOOKING");
  const waitlistEntryId = String(formData.get("waitlistEntryId") ?? "");
  let errorMessage: string | undefined;

  try {
    await acceptWaitlistOffer(waitlistEntryId, user.id);
  } catch (error) {
    errorMessage = waitlistErrorMessage(error);
  }

  revalidatePath("/portal/waitlist");
  revalidatePath("/portal/bookings");
  redirect(`/portal/waitlist?${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "accepted=1"}`);
}

export async function declineWaitlistOfferAction(formData: FormData) {
  const user = await requirePermission("REQUEST_BOOKING");
  const waitlistEntryId = String(formData.get("waitlistEntryId") ?? "");
  let errorMessage: string | undefined;

  try {
    await declineWaitlistOffer(waitlistEntryId, user.id);
  } catch (error) {
    errorMessage = waitlistErrorMessage(error);
  }

  revalidatePath("/portal/waitlist");
  redirect(`/portal/waitlist?${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "declined=1"}`);
}
