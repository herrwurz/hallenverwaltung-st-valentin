"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/permissions";
import { createOrganizationDocument } from "@/lib/services/document-service";
import { BookingValidationError } from "@/lib/services/booking-rules";

function documentErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Die Eingaben sind nicht gültig.";
  }

  if (error instanceof BookingValidationError) {
    return error.message;
  }

  return "Das Dokument konnte nicht gespeichert werden.";
}

export async function createOrganizationDocumentAction(formData: FormData) {
  const user = await requirePermission("REQUEST_BOOKING");
  let errorMessage: string | undefined;

  try {
    await createOrganizationDocument(
      {
        organizationId: formData.get("organizationId"),
        type: formData.get("type"),
        fileName: formData.get("fileName"),
      },
      user.id,
    );
  } catch (error) {
    errorMessage = documentErrorMessage(error);
  }

  revalidatePath("/portal/documents");
  redirect(`/portal/documents?${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "saved=1"}`);
}
