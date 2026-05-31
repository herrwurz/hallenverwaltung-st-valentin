import Link from "next/link";
import { AreaShell } from "@/components/area-shell";
import { requirePermission } from "@/lib/permissions";

export default async function PortalPage() {
  const user = await requirePermission("REQUEST_BOOKING");

  return (
    <AreaShell
      eyebrow="Portal"
      title="Organisationsportal"
      description="Geschuetzter Bereich fuer Vereine, VHS und Schulen."
      userName={user.name}
    >
      <Link
        href="/portal/bookings"
        className="mt-10 block rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:border-sky-700"
      >
        <h2 className="text-lg font-medium">Buchungsantraege</h2>
        <p className="mt-2 text-slate-300">Einzeltermine beantragen und bestehende Antraege einsehen.</p>
      </Link>
      <Link
        href="/portal/calendar"
        className="mt-4 block rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:border-sky-700"
      >
        <h2 className="text-lg font-medium">Kalender</h2>
        <p className="mt-2 text-slate-300">Tages- und Wochenansicht mit freien Zeiten und eingeschraenkter Fremdsicht.</p>
      </Link>
      <Link
        href="/portal/waitlist"
        className="mt-4 block rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:border-sky-700"
      >
        <h2 className="text-lg font-medium">Warteliste</h2>
        <p className="mt-2 text-slate-300">Zeitfenster vormerken und Angebote innerhalb von 48 Stunden annehmen.</p>
      </Link>
      <Link
        href="/portal/documents"
        className="mt-4 block rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:border-sky-700"
      >
        <h2 className="text-lg font-medium">Dokumente</h2>
        <p className="mt-2 text-slate-300">Hallenordnungen, Vertraege und Nachweise als Metadaten verwalten.</p>
      </Link>
      <Link
        href="/portal/damages"
        className="mt-4 block rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:border-sky-700"
      >
        <h2 className="text-lg font-medium">Schadensmeldungen</h2>
        <p className="mt-2 text-slate-300">Schaeden mit Beschreibung und optionalem Foto-Ablagepfad melden.</p>
      </Link>
    </AreaShell>
  );
}
