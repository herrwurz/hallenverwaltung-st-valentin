"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveSession } from "@/lib/permissions";
import { retryNotification } from "@/lib/services/notification-service";

export async function retryNotificationAction(formData: FormData) {
  const user = await requireActiveSession();
  const notificationId = String(formData.get("notificationId") ?? "");
  const status = String(formData.get("status") ?? "ALL");
  let errorMessage: string | undefined;

  try {
    await retryNotification(notificationId, user.id);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Die Benachrichtigung konnte nicht erneut versendet werden.";
  }

  revalidatePath("/admin/notifications");
  redirect(
    `/admin/notifications?status=${encodeURIComponent(status)}&${
      errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "retried=1"
    }`,
  );
}
