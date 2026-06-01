"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError, z } from "zod";
import { requireActiveSession } from "@/lib/permissions";
import {
  approveChangeRequest,
  markChangeRequestInReview,
  rejectChangeRequest,
} from "@/lib/services/booking-change-service";
import { BookingValidationError } from "@/lib/services/booking-rules";

const changeRequestTransitionSchema = z.object({
  requestId: z.string().trim().min(1, "Der Änderungsantrag ist ungültig."),
  status: z.string().trim().optional(),
});

const changeRequestDecisionSchema = changeRequestTransitionSchema.extend({
  decisionNote: z.string().trim().optional(),
});

function changeRequestErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Die Eingaben sind nicht gültig.";
  }

  if (error instanceof BookingValidationError) {
    return error.message;
  }

  return "Der Änderungsantrag konnte nicht bearbeitet werden.";
}

function buildRedirect(status: string | undefined, params: string) {
  const query = new URLSearchParams(status ? { status } : undefined);

  for (const [key, value] of new URLSearchParams(params)) {
    query.set(key, value);
  }

  redirect(`/admin/booking-changes?${query.toString()}`);
}

async function executeChangeRequestAction(
  formData: FormData,
  operation: (input: z.infer<typeof changeRequestDecisionSchema>, actorUserId: string) => Promise<void>,
  successFlag: string,
) {
  const actor = await requireActiveSession();
  let input: z.infer<typeof changeRequestDecisionSchema>;
  let errorMessage: string | undefined;

  try {
    input = changeRequestDecisionSchema.parse({
      requestId: formData.get("requestId"),
      decisionNote: formData.get("decisionNote"),
      status: formData.get("status"),
    });
    await operation(input, actor.id);
  } catch (error) {
    errorMessage = changeRequestErrorMessage(error);
    input = {
      requestId: String(formData.get("requestId") ?? ""),
      decisionNote: String(formData.get("decisionNote") ?? ""),
      status: String(formData.get("status") ?? ""),
    };
  }

  revalidatePath("/admin/booking-changes");
  revalidatePath("/admin/bookings");
  revalidatePath("/portal/bookings");
  buildRedirect(
    input.status,
    errorMessage ? `error=${encodeURIComponent(errorMessage)}` : `${successFlag}=1`,
  );
}

export async function markChangeRequestInReviewAction(formData: FormData) {
  await executeChangeRequestAction(
    formData,
    async (input, actorUserId) => {
      await markChangeRequestInReview(input.requestId, actorUserId);
    },
    "reviewed",
  );
}

export async function approveChangeRequestAction(formData: FormData) {
  await executeChangeRequestAction(
    formData,
    async (input, actorUserId) => {
      await approveChangeRequest(input.requestId, actorUserId);
    },
    "approved",
  );
}

export async function rejectChangeRequestAction(formData: FormData) {
  await executeChangeRequestAction(
    formData,
    async (input, actorUserId) => {
      await rejectChangeRequest(input.requestId, actorUserId, input.decisionNote);
    },
    "rejected",
  );
}
