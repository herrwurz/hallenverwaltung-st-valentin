"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export type ResetPasswordResult = { ok: true } | { ok: false; error: string } | undefined;

const schema = z.object({
  token: z.string().trim().min(1, "Token fehlt."),
  password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen lang sein."),
  passwordConfirm: z.string().min(1, "Bitte bestätigen Sie das Passwort."),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Die Passwörter stimmen nicht überein.",
  path: ["passwordConfirm"],
});

export async function resetPasswordAction(_: ResetPasswordResult, formData: FormData): Promise<ResetPasswordResult> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const user = await prisma.user.findUnique({
    where: { passwordResetToken: parsed.data.token },
    select: { id: true, isActive: true, passwordResetTokenExpiry: true },
  });

  if (!user || !user.isActive) {
    return { ok: false, error: "Der Reset-Link ist ungültig oder abgelaufen." };
  }

  if (!user.passwordResetTokenExpiry || user.passwordResetTokenExpiry < new Date()) {
    return { ok: false, error: "Der Reset-Link ist abgelaufen. Bitte fordern Sie einen neuen an." };
  }

  const passwordHash = await hash(parsed.data.password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetTokenExpiry: null,
    },
  });

  return { ok: true };
}
