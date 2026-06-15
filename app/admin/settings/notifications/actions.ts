"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/permissions";
import {
  notificationEventSettingsSchema,
  updateNotificationEventSettings,
} from "@/lib/services/notification-settings-service";
import { notificationEventCodes } from "@/lib/services/notification-types";

function getErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Die Benachrichtigungseinstellungen sind ungültig.";
  }

  return "Die Benachrichtigungseinstellungen konnten nicht gespeichert werden.";
}

export async function updateSettingsNotificationEventsAction(formData: FormData) {
  await requirePermission("MANAGE_USERS");
  let errorMessage: string | undefined;

  try {
    const input = notificationEventSettingsSchema.parse(
      Object.fromEntries(notificationEventCodes.map((eventCode) => [eventCode, formData.get(eventCode) === "on"])),
    );
    await updateNotificationEventSettings(input);
  } catch (error) {
    errorMessage = getErrorMessage(error);
  }

  revalidatePath("/admin/settings/notifications");
  revalidatePath("/admin/notifications");
  redirect(
    errorMessage
      ? `/admin/settings/notifications?error=${encodeURIComponent(errorMessage)}`
      : "/admin/settings/notifications?saved=1",
  );
}
