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
        href="/portal/waitlist"
        className="mt-4 block rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:border-sky-700"
      >
        <h2 className="text-lg font-medium">Warteliste</h2>
        <p className="mt-2 text-slate-300">Zeitfenster vormerken und Angebote innerhalb von 48 Stunden annehmen.</p>
      </Link>
    </AreaShell>
  );
}
