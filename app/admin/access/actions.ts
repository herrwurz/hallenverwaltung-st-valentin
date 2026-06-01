"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/permissions";
import { BookingValidationError } from "@/lib/services/booking-rules";
import {
  createAccessMedium,
  deactivateAccessMedium,
  issueAccessMedium,
  returnAccessAssignment,
} from "@/lib/services/access-service";

function accessErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Die Eingaben sind nicht gueltig.";
  }

  if (error instanceof BookingValidationError) {
    return error.message;
  }

  return "Die Zutrittsverwaltung konnte die Aktion nicht verarbeiten.";
}

function redirectAccess(errorMessage?: string) {
  revalidatePath("/admin/access");
  redirect(`/admin/access?${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "saved=1"}`);
}

export async function createAccessMediumAction(formData: FormData) {
  const user = await requirePermission("MANAGE_ACCESS");
  let errorMessage: string | undefined;

  try {
    await createAccessMedium(
      {
        buildingId: formData.get("buildingId"),
        roomId: formData.get("roomId"),
        type: formData.get("type"),
        identifier: formData.get("identifier"),
      },
      user.id,
    );
  } catch (error) {
    errorMessage = accessErrorMessage(error);
  }

  redirectAccess(errorMessage);
}

export async function issueAccessMediumAction(formData: FormData) {
  const user = await requirePermission("MANAGE_ACCESS");
  let errorMessage: string | undefined;

  try {
    await issueAccessMedium(
      {
        accessMediumId: formData.get("accessMediumId"),
        organizationId: formData.get("organizationId"),
        issuedToName: formData.get("issuedToName"),
      },
      user.id,
    );
  } catch (error) {
    errorMessage = accessErrorMessage(error);
  }

  redirectAccess(errorMessage);
}

export async function returnAccessAssignmentAction(formData: FormData) {
  const user = await requirePermission("MANAGE_ACCESS");
  let errorMessage: string | undefined;

  try {
    await returnAccessAssignment({ assignmentId: formData.get("assignmentId") }, user.id);
  } catch (error) {
    errorMessage = accessErrorMessage(error);
  }

  redirectAccess(errorMessage);
}

export async function deactivateAccessMediumAction(formData: FormData) {
  const user = await requirePermission("MANAGE_ACCESS");
  let errorMessage: string | undefined;

  try {
    await deactivateAccessMedium({ accessMediumId: formData.get("accessMediumId") }, user.id);
  } catch (error) {
    errorMessage = accessErrorMessage(error);
  }

  redirectAccess(errorMessage);
}
