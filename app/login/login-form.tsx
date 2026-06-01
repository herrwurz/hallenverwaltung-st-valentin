"use client";

import { useActionState } from "react";
import { authenticate } from "@/app/login/actions";

export function LoginForm() {
  const [errorMessage, formAction, pending] = useActionState(authenticate, undefined);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-300">E-Mail</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-300">Passwort</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400"
        />
      </label>
      {errorMessage ? <p className="text-sm text-red-300">{errorMessage}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-sky-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Anmeldung läuft..." : "Anmelden"}
      </button>
    </form>
  );
}
