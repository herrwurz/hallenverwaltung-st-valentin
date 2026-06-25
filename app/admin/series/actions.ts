"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError, z } from "zod";
import { requireActiveSession } from "@/lib/permissions";
import {
  approveSeriesForAdmin,
  markSeriesInReviewForAdmin,
  rejectSeriesForAdmin,
  type SeriesWorkflowSummary,
} from "@/lib/services/booking-approval-service";
import { BookingValidationError } from "@/lib/services/booking-rules";

const optionalFormString = z.preprocess(
  (value) => (value === null || value === "" ? undefined : value),
  z.string().trim().optional(),
);

const seriesActionSchema = z.object({
  seriesId: z.string().trim().min(1, "Die Serie ist ungültig."),
  decisionNote: optionalFormString,
  allowClosureOverride: z.boolean().default(false),
});

function workflowErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Die Eingaben sind nicht gültig.";
  }

  if (error instanceof BookingValidationError) {
    return error.message;
  }

  return "Die Serie konnte nicht bearbeitet werden.";
}

function buildSeriesResultMessage(summary: SeriesWorkflowSummary) {
  const base = `${summary.processed} Serientermine verarbeitet.`;

  if (summary.failed === 0) {
    return base;
  }

  return `${base} ${summary.failed} Serientermine konnten nicht verarbeitet werden.`;
}

async function executeAction(
  formData: FormData,
  operation: (input: z.infer<typeof seriesActionSchema>, actorUserId: string) => Promise<SeriesWorkflowSummary | void>,
  successParam: string,
) {
  const actor = await requireActiveSession();
  let seriesId = String(formData.get("seriesId") ?? "");
  let errorMessage: string | undefined;
  let resultMessage: string | undefined;

  try {
    const input = seriesActionSchema.parse({
      seriesId: formData.get("seriesId"),
      decisionNote: formData.get("decisionNote"),
      allowClosureOverride: formData.get("allowClosureOverride") === "on",
    });
    seriesId = input.seriesId;
    const result = await operation(input, actor.id);
    if (result) {
      resultMessage = buildSeriesResultMessage(result);
    }
  } catch (error) {
    errorMessage = workflowErrorMessage(error);
  }

  revalidatePath("/admin/series");
  revalidatePath("/portal/bookings");

  if (errorMessage) {
    redirect(`/admin/series?error=${encodeURIComponent(errorMessage)}`);
  }

  redirect(`/admin/series?${successParam}=${encodeURIComponent(resultMessage ?? "Serie wurde bearbeitet.")}&seriesId=${seriesId}`);
}

export async function markSeriesInReviewFromSeriesPageAction(formData: FormData) {
  await executeAction(
    formData,
    async (input, actorUserId) => markSeriesInReviewForAdmin(input.seriesId, actorUserId),
    "seriesReviewed",
  );
}

export async function approveSeriesFromSeriesPageAction(formData: FormData) {
  await executeAction(
    formData,
    async (input, actorUserId) =>
      approveSeriesForAdmin(
        {
          seriesId: input.seriesId,
          decisionNote: input.decisionNote,
          allowClosureOverride: input.allowClosureOverride,
        },
        actorUserId,
      ),
    "seriesApproved",
  );
}

export async function rejectSeriesFromSeriesPageAction(formData: FormData) {
  await executeAction(
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
  );
}
