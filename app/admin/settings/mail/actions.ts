"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z, ZodError } from "zod";
import { requirePermission } from "@/lib/permissions";
import { processPendingNotifications, queueAdminTestEmail } from "@/lib/services/notification-service";

const testMailSchema = z.object({
  recipient: z.email("Bitte eine gültige E-Mail-Adresse eingeben."),
  note: z.string().trim().max(500).optional(),
});

function getErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Die Testmail-Eingabe ist ungültig.";
  }

  return error instanceof Error ? error.message : "Die Testmail konnte nicht versendet werden.";
}

export async function sendSettingsTestMailAction(formData: FormData) {
  const user = await requirePermission("MANAGE_USERS");
  let errorMessage: string | undefined;

  try {
    const input = testMailSchema.parse({
      recipient: formData.get("recipient"),
      note: String(formData.get("note") ?? "").trim() || undefined,
    });
    await queueAdminTestEmail({
      recipient: input.recipient,
      actorUserId: user.id,
      note: input.note,
    });
    await processPendingNotifications();
  } catch (error) {
    errorMessage = getErrorMessage(error);
  }

  revalidatePath("/admin/settings/mail");
  redirect(
    errorMessage
      ? `/admin/settings/mail?error=${encodeURIComponent(errorMessage)}`
      : "/admin/settings/mail?testSent=1",
  );
}
