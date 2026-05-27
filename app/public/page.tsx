import Link from "next/link";
import { AreaShell } from "@/components/area-shell";

export default function PublicPage() {
  return (
    <AreaShell
      eyebrow="Oeffentlich"
      title="Oeffentlicher Bereich"
      description="Dieser Bereich ist ohne Anmeldung erreichbar. Hier stehen Kalenderansicht, freie Zeiten und der Login ins Portal bereit."
      authenticated={false}
    >
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Link
          href="/public/calendar"
          className="rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:border-sky-700"
        >
          <h2 className="text-lg font-medium">Kalender</h2>
          <p className="mt-2 text-slate-300">Lesende Belegungsansicht mit Tages-, Wochen- und freie-Zeiten-Sicht.</p>
        </Link>
        <Link
          href="/login"
          className="rounded-xl border border-sky-700 bg-sky-500 p-6 text-slate-950 transition hover:bg-sky-400"
        >
          <h2 className="text-lg font-medium">Zum Login</h2>
          <p className="mt-2 text-sm text-slate-900">Vereinsportal und Verwaltungsportal mit Anmeldung oeffnen.</p>
        </Link>
      </div>
    </AreaShell>
  );
}
