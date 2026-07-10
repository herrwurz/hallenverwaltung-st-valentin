import crypto from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { getPublicBaseUrl } from "@/lib/config/environment";
import { sendEmail } from "@/lib/services/mail-service";

type ActivationClient = Pick<PrismaClient, "user"> | Pick<Prisma.TransactionClient, "user">;

const ACTIVATION_TOKEN_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000; // 7 Tage

function escapeHtml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Wird beim Anlegen eines Benutzers ohne von der Verwaltung vergebenes Passwort
 * aufgerufen. Erzeugt denselben Reset-Token wie "Passwort vergessen" und
 * versendet die Mail direkt (wie der Passwort-Reset bewusst ausserhalb der
 * abschaltbaren Benachrichtigungs-Queue, da ohne diese Mail kein Login moeglich ist).
 */
export async function sendAccountActivationEmail(
  userId: string,
  client: ActivationClient,
  deliverEmail: typeof sendEmail = sendEmail,
) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + ACTIVATION_TOKEN_VALIDITY_MS);

  const user = await client.user.update({
    where: { id: userId },
    data: { passwordResetToken: token, passwordResetTokenExpiry: expiry },
    select: { email: true, displayName: true },
  });

  const activationUrl = `${getPublicBaseUrl()}/login/reset-password?token=${token}`;

  await deliverEmail({
    to: user.email,
    subject: "Konto aktivieren – Hallenverwaltung St. Valentin",
    text: `Hallo ${user.displayName},\n\nfür Sie wurde ein Konto in der Hallenverwaltung St. Valentin angelegt. Bitte klicken Sie auf folgenden Link, um ein eigenes Passwort zu vergeben und sich danach anzumelden:\n\n${activationUrl}\n\nDer Link ist 7 Tage gültig. Falls er abgelaufen ist, können Sie über "Passwort vergessen" auf der Anmeldeseite einen neuen Link anfordern.\n\nHallenverwaltung St. Valentin`,
    html: `<p>Hallo ${escapeHtml(user.displayName)},</p><p>für Sie wurde ein Konto in der Hallenverwaltung St. Valentin angelegt. Bitte klicken Sie auf folgenden Link, um ein eigenes Passwort zu vergeben und sich danach anzumelden:</p><p><a href="${escapeHtml(activationUrl)}">${escapeHtml(activationUrl)}</a></p><p>Der Link ist 7 Tage gültig. Falls er abgelaufen ist, können Sie über „Passwort vergessen" auf der Anmeldeseite einen neuen Link anfordern.</p><p>Hallenverwaltung St. Valentin</p>`,
  });
}
