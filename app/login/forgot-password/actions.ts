"use server";

import crypto from "node:crypto";
import { z } from "zod";
import { getPublicBaseUrl } from "@/lib/config/environment";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/services/mail-service";

export type ForgotPasswordResult = { ok: true } | { ok: false; error: string } | undefined;

const schema = z.object({
  email: z.email("Bitte geben Sie eine gültige E-Mail-Adresse ein.").transform((v) => v.trim().toLowerCase()),
});

export async function requestPasswordResetAction(_: ForgotPasswordResult, formData: FormData): Promise<ForgotPasswordResult> {
  const parsed = schema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, displayName: true, isActive: true, passwordHash: true },
  });

  if (!user || !user.isActive || !user.passwordHash) {
    // Keine Information preisgeben, ob die Adresse existiert
    return { ok: true };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 Stunde

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetTokenExpiry: expiry },
  });

  const resetUrl = `${getPublicBaseUrl()}/login/reset-password?token=${token}`;

  try {
    await sendEmail({
      to: parsed.data.email,
      subject: "Passwort zurücksetzen – Hallenverwaltung St. Valentin",
      text: `Hallo ${user.displayName},\n\nbitte klicken Sie auf folgenden Link, um Ihr Passwort zurückzusetzen:\n\n${resetUrl}\n\nDer Link ist 1 Stunde gültig. Falls Sie kein Passwort zurücksetzen möchten, können Sie diese E-Mail ignorieren.\n\nHallenverwaltung St. Valentin`,
      html: `<p>Hallo ${user.displayName},</p><p>bitte klicken Sie auf folgenden Link, um Ihr Passwort zurückzusetzen:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Der Link ist 1 Stunde gültig. Falls Sie kein Passwort zurücksetzen möchten, können Sie diese E-Mail ignorieren.</p><p>Hallenverwaltung St. Valentin</p>`,
    });
  } catch {
    console.error("Passwort-Reset-Mail konnte nicht gesendet werden für:", parsed.data.email);
  }

  return { ok: true };
}
