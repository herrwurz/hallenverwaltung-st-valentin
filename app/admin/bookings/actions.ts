"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError, z } from "zod";
import { requireActiveSession } from "@/lib/permissions";
import {
  approveBookingForAdmin,
  markBookingInReviewForAdmin,
  rejectBookingForAdmin,
} from "@/lib/services/booking-approval-service";
import { BookingValidationError } from "@/lib/services/booking-rules";

const transitionSchema = z.object({
  bookingId: z.string().trim().min(1, "Die Buchung ist ungültig."),
  status: z.string().trim().optional(),
});

const decisionSchema = transitionSchema.extend({
  decisionNote: z.string().trim().optional(),
});

function workflowErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Die Eingaben sind nicht gültig.";
  }

  if (error instanceof BookingValidationError) {
    return error.message;
  }

  return "Die Buchung konnte nicht bearbeitet werden.";
}

function buildRedirect(pathname: string, status: string | undefined, params: string) {
  const query = new URLSearchParams(status ? { status } : undefined);

  for (const [key, value] of new URLSearchParams(params)) {
    query.set(key, value);
  }

  redirect(`${pathname}?${query.toString()}`);
}

async function executeBookingWorkflowAction(
  formData: FormData,
  operation: (input: z.infer<typeof decisionSchema>, actorUserId: string) => Promise<void>,
  successFlag: string,
  successStatus?: string,
) {
  const actor = await requireActiveSession();
  let input: z.infer<typeof decisionSchema>;
  let errorMessage: string | undefined;

  try {
    input = decisionSchema.parse({
      bookingId: formData.get("bookingId"),
      decisionNote: formData.get("decisionNote"),
      status: formData.get("status"),
    });
    await operation(input, actor.id);
  } catch (error) {
    errorMessage = workflowErrorMessage(error);
    input = {
      bookingId: String(formData.get("bookingId") ?? ""),
      decisionNote: String(formData.get("decisionNote") ?? ""),
      status: String(formData.get("status") ?? ""),
    };
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/portal/bookings");
  buildRedirect(
    "/admin/bookings",
    errorMessage ? input.status : successStatus ?? input.status,
    errorMessage ? `error=${encodeURIComponent(errorMessage)}` : `${successFlag}=1`,
  );
}

export async function markBookingInReviewAction(formData: FormData) {
  await executeBookingWorkflowAction(
    formData,
    async (input, actorUserId) => {
      await markBookingInReviewForAdmin(input.bookingId, actorUserId);
    },
    "reviewed",
    "IN_REVIEW",
  );
}

export async function approveBookingAction(formData: FormData) {
  await executeBookingWorkflowAction(
    formData,
    async (input, actorUserId) => {
      await approveBookingForAdmin(
        {
          bookingId: input.bookingId,
          decisionNote: input.decisionNote,
        },
        actorUserId,
      );
    },
    "approved",
    "APPROVED",
  );
}

export async function rejectBookingAction(formData: FormData) {
  await executeBookingWorkflowAction(
    formData,
    async (input, actorUserId) => {
      await rejectBookingForAdmin(
        {
          bookingId: input.bookingId,
          decisionNote: input.decisionNote,
        },
        actorUserId,
      );
    },
    "rejected",
    "REJECTED",
  );
}
