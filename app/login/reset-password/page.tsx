"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";
import { resetPasswordAction, type ResetPasswordResult } from "@/app/login/reset-password/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [result, formAction, pending] = useActionState<ResetPasswordResult, FormData>(
    resetPasswordAction,
    undefined,
  );

  if (!token) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary">Login</p>
          <CardTitle className="mt-3 text-3xl">Ungültiger Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-destructive">Der Reset-Link ist ungültig. Bitte fordern Sie einen neuen an.</p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login/forgot-password">Neuen Link anfordern</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (result?.ok) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary">Login</p>
          <CardTitle className="mt-3 text-3xl">Passwort geändert</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="rounded-lg border border-emerald-500/20 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Ihr Passwort wurde erfolgreich geändert. Sie können sich jetzt mit dem neuen Passwort anmelden.
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Zum Login</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary">Login</p>
        <CardTitle className="mt-3 text-3xl">Neues Passwort</CardTitle>
        <CardDescription className="text-base">
          Geben Sie Ihr neues Passwort ein. Es muss mindestens 8 Zeichen lang sein.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="token" value={token} />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-foreground">Neues Passwort</span>
            <Input name="password" type="password" autoComplete="new-password" required minLength={8} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-foreground">Passwort bestätigen</span>
            <Input name="passwordConfirm" type="password" autoComplete="new-password" required minLength={8} />
          </label>
          {result && !result.ok ? <p className="text-sm text-destructive">{result.error}</p> : null}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Wird gespeichert..." : "Passwort speichern"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="windows-shell flex min-h-screen items-center justify-center bg-background px-6 py-10 text-foreground">
      <Suspense
        fallback={
          <Card className="w-full max-w-md">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">Lädt...</CardContent>
          </Card>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
