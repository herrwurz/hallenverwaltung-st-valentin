"use client";

import Link from "next/link";
import { useActionState } from "react";
import { authenticate } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [errorMessage, formAction, pending] = useActionState(authenticate, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-foreground">E-Mail</span>
        <Input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="block">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Passwort</span>
          <Link href="/login/forgot-password" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
            Passwort vergessen?
          </Link>
        </div>
        <Input name="password" type="password" autoComplete="current-password" required />
      </label>
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Anmeldung läuft..." : "Anmelden"}
      </Button>
    </form>
  );
}
