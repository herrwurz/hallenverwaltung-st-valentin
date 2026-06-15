"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/permissions";
import {
  publicAreaEnabledSettingSchema,
  publicCalendarVisibilitySettingSchema,
  updatePublicAreaEnabled,
  updatePublicCalendarVisibilityMode,
} from "@/lib/services/calendar-settings-service";

function getErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Die Einstellung ist ungültig.";
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

export async function updatePublicAreaEnabledSettingAction(formData: FormData) {
  await requirePermission("MANAGE_USERS");

  let errorMessage: string | null = null;

  try {
    const input = publicAreaEnabledSettingSchema.parse({
      enabled: formData.get("enabled") === "on",
    });
    await updatePublicAreaEnabled(input);
  } catch (error) {
    errorMessage =
      error instanceof ZodError
        ? (error.issues[0]?.message ?? "Die Einstellung ist ungueltig.")
        : "Die Einstellung fuer den oeffentlichen Bereich konnte nicht gespeichert werden.";
  }

  revalidatePath("/admin/settings/calendar");
  revalidatePath("/public");
  revalidatePath("/public/calendar");
  redirect(
    errorMessage
      ? `/admin/settings/calendar?error=${encodeURIComponent(errorMessage)}`
      : "/admin/settings/calendar?saved=1",
  );
}
