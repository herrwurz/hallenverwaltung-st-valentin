import Link from "next/link";
import { AreaShell } from "@/components/area-shell";
import { getPublicOverview } from "@/lib/services/public-service";

export const dynamic = "force-dynamic";

const visibilityLabels = {
  occupied_only: "Nur belegt/frei",
  organization: "Vereinsname sichtbar",
  event: "Veranstaltungsname sichtbar",
} as const;

export default async function PublicPage() {
  const overview = await getPublicOverview();

  return (
    <AreaShell
      eyebrow="Oeffentlich"
      title="Oeffentlicher Bereich"
      description="Dieser Bereich ist ohne Anmeldung erreichbar. Hier stehen die oeffentliche Hallenbelegung, freie Zeiten und der Login ins Portal bereit."
      authenticated={false}
    >
      <section className="mt-10 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Gebaeude</p>
          <p className="mt-2 text-3xl font-semibold">{overview.buildingCount}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Raeume</p>
          <p className="mt-2 text-3xl font-semibold">{overview.roomCount}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Naechste Belegungen</p>
          <p className="mt-2 text-3xl font-semibold">{overview.nextEventCount}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Datenschutz</p>
          <p className="mt-2 text-lg font-medium">{visibilityLabels[overview.visibilityMode]}</p>
        </div>
      </section>

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

      <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-medium">Standorte</h2>
        {overview.buildings.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">Derzeit sind keine oeffentlich verfuegbaren Standorte aktiv.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {overview.buildings.map((building) => (
              <div key={building.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                <p className="font-medium">{building.name}</p>
                <p className="mt-1 text-sm text-slate-400">{building.roomCount} aktive Raeume</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </AreaShell>
  );
}
