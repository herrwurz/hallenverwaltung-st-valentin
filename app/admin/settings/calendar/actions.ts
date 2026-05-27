"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/permissions";
import {
  publicCalendarVisibilitySettingSchema,
  updatePublicCalendarVisibilityMode,
} from "@/lib/services/calendar-settings-service";

function getErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Die Einstellung ist ungueltig.";
  }

  return "Die Kalender-Datenschutzeinstellung konnte nicht gespeichert werden.";
}

export async function updateCalendarVisibilitySettingAction(formData: FormData) {
  await requirePermission("MANAGE_USERS");

  let errorMessage: string | null = null;

  try {
    const input = publicCalendarVisibilitySettingSchema.parse({
      mode: formData.get("mode"),
    });
    await updatePublicCalendarVisibilityMode(input);
  } catch (error) {
    errorMessage = getErrorMessage(error);
  }

  revalidatePath("/admin/settings/calendar");
  revalidatePath("/admin/calendar");
  revalidatePath("/public/calendar");
  redirect(
    errorMessage
      ? `/admin/settings/calendar?error=${encodeURIComponent(errorMessage)}`
      : "/admin/settings/calendar?saved=1",
  );
}
