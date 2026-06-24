"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z, ZodError } from "zod";
import { requirePermission } from "@/lib/permissions";
import { sendEmail } from "@/lib/services/mail-service";

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
  await requirePermission("MANAGE_USERS");
  let errorMessage: string | undefined;

  try {
    const input = testMailSchema.parse({
      recipient: formData.get("recipient"),
      note: String(formData.get("note") ?? "").trim() || undefined,
    });

    const noteLine = input.note ? `\n\nHinweis: ${input.note}` : "";
    const noteHtml = input.note ? `<p><strong>Hinweis:</strong> ${input.note}</p>` : "";

    await sendEmail({
      to: input.recipient,
      subject: "Testmail – Hallenverwaltung St. Valentin",
      text: `Dies ist eine Testmail der Hallenverwaltung St. Valentin.${noteLine}\n\nWenn Sie diese Nachricht erhalten haben, ist der SMTP-Versand korrekt konfiguriert.`,
      html: `<p>Dies ist eine Testmail der <strong>Hallenverwaltung St. Valentin</strong>.</p>${noteHtml}<p>Wenn Sie diese Nachricht erhalten haben, ist der SMTP-Versand korrekt konfiguriert.</p>`,
    });
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
