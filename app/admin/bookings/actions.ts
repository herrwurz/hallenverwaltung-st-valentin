"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError, z } from "zod";
import { requireActiveSession } from "@/lib/permissions";
import {
  approveBookingForAdmin,
  approveSeriesForAdmin,
  markBookingInReviewForAdmin,
  markSeriesInReviewForAdmin,
  rejectBookingForAdmin,
  rejectSeriesForAdmin,
  type SeriesWorkflowSummary,
} from "@/lib/services/booking-approval-service";
import { BookingValidationError } from "@/lib/services/booking-rules";

const optionalFormString = z.preprocess(
  (value) => (value === null || value === "" ? undefined : value),
  z.string().trim().optional(),
);

const transitionSchema = z.object({
  bookingId: z.string().trim().min(1, "Die Buchung ist ungültig."),
  status: optionalFormString,
  organizationId: optionalFormString,
});

const decisionSchema = transitionSchema.extend({
  decisionNote: optionalFormString,
});

const seriesTransitionSchema = z.object({
  seriesId: z.string().trim().min(1, "Die Serie ist ungültig."),
  status: optionalFormString,
  organizationId: optionalFormString,
  decisionNote: optionalFormString,
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

function buildRedirect(pathname: string, status: string | undefined, organizationId: string | undefined, params: string) {
  const query = new URLSearchParams(status ? { status } : undefined);

  if (organizationId) {
    query.set("organizationId", organizationId);
  }

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
      organizationId: formData.get("organizationId"),
    });
    await operation(input, actor.id);
  } catch (error) {
    errorMessage = workflowErrorMessage(error);
    input = {
      bookingId: String(formData.get("bookingId") ?? ""),
      decisionNote: String(formData.get("decisionNote") ?? ""),
      status: String(formData.get("status") ?? ""),
      organizationId: String(formData.get("organizationId") ?? ""),
    };
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/portal/bookings");
  buildRedirect(
    "/admin/bookings",
    errorMessage ? input.status : successStatus ?? input.status,
    input.organizationId,
    errorMessage ? `error=${encodeURIComponent(errorMessage)}` : `${successFlag}=1`,
  );
}

function buildSeriesResultMessage(summary: SeriesWorkflowSummary) {
  const base = `${summary.processed} Serientermine verarbeitet.`;

  if (summary.failed === 0) {
    return base;
  }

  return `${base} ${summary.failed} Serientermine konnten nicht verarbeitet werden.`;
}

async function executeSeriesWorkflowAction(
  formData: FormData,
  operation: (input: z.infer<typeof seriesTransitionSchema>, actorUserId: string) => Promise<SeriesWorkflowSummary>,
  successFlag: string,
  successStatus?: string,
) {
  const actor = await requireActiveSession();
  let input: z.infer<typeof seriesTransitionSchema>;
  let errorMessage: string | undefined;
  let resultMessage: string | undefined;

  try {
    input = seriesTransitionSchema.parse({
      seriesId: formData.get("seriesId"),
      decisionNote: formData.get("decisionNote"),
      status: formData.get("status"),
      organizationId: formData.get("organizationId"),
    });
    const summary = await operation(input, actor.id);
    resultMessage = buildSeriesResultMessage(summary);
  } catch (error) {
    errorMessage = workflowErrorMessage(error);
    input = {
      seriesId: String(formData.get("seriesId") ?? ""),
      decisionNote: String(formData.get("decisionNote") ?? ""),
      status: String(formData.get("status") ?? ""),
      organizationId: String(formData.get("organizationId") ?? ""),
    };
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/portal/bookings");
  buildRedirect(
    "/admin/bookings",
    errorMessage ? input.status : successStatus ?? input.status,
    input.organizationId,
    errorMessage ? `error=${encodeURIComponent(errorMessage)}` : `${successFlag}=${encodeURIComponent(resultMessage ?? "Serie wurde bearbeitet.")}`,
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

export async function markSeriesInReviewAction(formData: FormData) {
  await executeSeriesWorkflowAction(
    formData,
    async (input, actorUserId) => markSeriesInReviewForAdmin(input.seriesId, actorUserId),
    "seriesReviewed",
    "IN_REVIEW",
  );
}

export async function approveSeriesAction(formData: FormData) {
  await executeSeriesWorkflowAction(
    formData,
    async (input, actorUserId) =>
      approveSeriesForAdmin(
        {
          seriesId: input.seriesId,
          decisionNote: input.decisionNote,
        },
        actorUserId,
      ),
    "seriesApproved",
    "APPROVED",
  );
}

export async function rejectSeriesAction(formData: FormData) {
  await executeSeriesWorkflowAction(
    formData,
    async (input, actorUserId) =>
      rejectSeriesForAdmin(
        {
          seriesId: input.seriesId,
          decisionNote: input.decisionNote,
        },
        actorUserId,
      ),
    "seriesRejected",
    "REJECTED",
  );
}
