"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/permissions";
import {
  processPendingNotifications,
  retryFailedNotification,
} from "@/lib/services/notification-service";
import {
  notificationEventSettingsSchema,
  updateNotificationEventSettings,
} from "@/lib/services/notification-settings-service";
import { notificationEventCodes } from "@/lib/services/notification-types";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? fallback;
  }

  return error instanceof Error ? error.message : fallback;
}

export async function retryNotificationAction(formData: FormData) {
  const user = await requirePermission("VIEW_BOOKINGS");
  const notificationId = String(formData.get("notificationId") ?? "");
  const status = String(formData.get("status") ?? "ALL");
  let errorMessage: string | undefined;

  try {
    await retryFailedNotification(notificationId, user.id);
  } catch (error) {
    errorMessage = getErrorMessage(error, "Die Benachrichtigung konnte nicht erneut versendet werden.");
  }

  revalidatePath("/admin/notifications");
  redirect(
    `/admin/notifications?status=${encodeURIComponent(status)}&${
      errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "retried=1"
    }`,
  );
}

export async function processNotificationQueueAction() {
  await requirePermission("VIEW_BOOKINGS");
  let errorMessage: string | undefined;

  try {
    await processPendingNotifications();
  } catch (error) {
    errorMessage = getErrorMessage(error, "Die Queue konnte nicht verarbeitet werden.");
  }

  revalidatePath("/admin/notifications");
  redirect(
    errorMessage
      ? `/admin/notifications?error=${encodeURIComponent(errorMessage)}`
      : "/admin/notifications?processed=1",
  );
}

export async function updateNotificationEventSettingsAction(formData: FormData) {
  await requirePermission("VIEW_BOOKINGS");
  let errorMessage: string | undefined;

  try {
    const input = notificationEventSettingsSchema.parse(
      Object.fromEntries(notificationEventCodes.map((eventCode) => [eventCode, formData.get(eventCode) === "on"])),
    );
    await updateNotificationEventSettings(input);
  } catch (error) {
    errorMessage = getErrorMessage(error, "Die Benachrichtigungseinstellungen konnten nicht gespeichert werden.");
  }

  revalidatePath("/admin/notifications");
  redirect(
    errorMessage
      ? `/admin/notifications?error=${encodeURIComponent(errorMessage)}`
      : "/admin/notifications?settingsSaved=1",
  );
}
