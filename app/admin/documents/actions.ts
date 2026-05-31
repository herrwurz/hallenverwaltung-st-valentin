"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/permissions";
import { createAdminDocument } from "@/lib/services/document-service";
import { BookingValidationError } from "@/lib/services/booking-rules";

function documentErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Die Eingaben sind nicht gueltig.";
  }

  if (error instanceof BookingValidationError) {
    return error.message;
  }

  return "Das Dokument konnte nicht gespeichert werden.";
}

export async function createAdminDocumentAction(formData: FormData) {
  const user = await requirePermission("MANAGE_DOCUMENTS");
  let errorMessage: string | undefined;

  try {
    await createAdminDocument(
      {
        organizationId: formData.get("organizationId"),
        buildingId: formData.get("buildingId"),
        roomId: formData.get("roomId"),
        type: formData.get("type"),
        fileName: formData.get("fileName"),
      },
      user.id,
    );
  } catch (error) {
    errorMessage = documentErrorMessage(error);
  }

  revalidatePath("/admin/documents");
  revalidatePath("/portal/documents");
  redirect(`/admin/documents?${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "saved=1"}`);
}
