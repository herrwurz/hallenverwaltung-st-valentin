"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction, type ForgotPasswordResult } from "@/app/login/forgot-password/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ForgotPasswordForm() {
  const [result, formAction, pending] = useActionState<ForgotPasswordResult, FormData>(
    requestPasswordResetAction,
    undefined,
  );

  if (result?.ok) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary">Login</p>
          <CardTitle className="mt-3 text-3xl">E-Mail gesendet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="rounded-lg border border-emerald-500/20 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Falls ein aktives Konto mit dieser E-Mail-Adresse existiert, wurde ein Link zum Zurücksetzen des Passworts gesendet. Bitte prüfen Sie Ihren Posteingang.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Zurück zum Login</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary">Login</p>
        <CardTitle className="mt-3 text-3xl">Passwort vergessen</CardTitle>
        <CardDescription className="text-base">
          Geben Sie Ihre E-Mail-Adresse ein. Falls ein aktives Konto existiert, erhalten Sie einen Link zum Zurücksetzen Ihres Passworts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-foreground">E-Mail</span>
            <Input name="email" type="email" autoComplete="email" required />
          </label>
          {result && !result.ok ? <p className="text-sm text-destructive">{result.error}</p> : null}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Wird gesendet..." : "Reset-Link anfordern"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
              Zurück zum Login
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
