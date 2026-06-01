import Link from "next/link";
import { reportDamageAction } from "@/app/portal/damages/actions";
import { BuildingRoomSelect } from "@/components/building-room-select";
import { FormActions } from "@/components/form-actions";
import { getDamageStatusBadgeClass, getDamageStatusLabel } from "@/lib/document-damage-labels";
import { requirePermission } from "@/lib/permissions";
import { getPortalDamageData } from "@/lib/services/damage-service";

const inputClass = "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm";
const dateFormatter = new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" });

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function PortalDamagesPage({ searchParams }: PageProps) {
  const user = await requirePermission("REPORT_DAMAGE");
  const [params, data] = await Promise.all([searchParams, getPortalDamageData(user.id)]);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-400">Portal</p>
      <h2 className="mt-3 text-3xl font-semibold">Schadensmeldungen</h2>
      <p className="mt-3 text-slate-300">
        Melden Sie Schaeden mit Beschreibung und optionalem Foto-Ablagepfad. Die Gemeinde bearbeitet den Status.
      </p>
      <div className="mt-8 flex items-center justify-between">
        <Link href="/portal" className="text-sm text-sky-300 hover:text-sky-200">
          Zurueck zum Portal
        </Link>
      </div>
      {params.error ? (
        <p className="mt-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">{params.error}</p>
      ) : null}
      {params.saved ? (
        <p className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          Schadensmeldung wurde gespeichert.
        </p>
      ) : null}

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="text-lg font-medium">Neuen Schaden melden</h3>
        <form action={reportDamageAction} className="mt-5 grid gap-4 lg:grid-cols-2">
          <BuildingRoomSelect buildings={data.buildings} inputClassName={inputClass} />
          <label className="text-sm text-slate-300">
            Foto-Ablagepfad optional
            <input name="photoStorageKey" className={inputClass} placeholder="damages/foto-001.jpg" />
          </label>
          <label className="text-sm text-slate-300 lg:col-span-2">
            Beschreibung
            <textarea name="description" rows={4} required className={inputClass} />
          </label>
          <div className="lg:col-span-2">
            <FormActions submitLabel="Schaden melden" cancelHref="/portal" />
          </div>
        </form>
      </section>

      <section className="mt-8 space-y-3">
        {data.reports.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
            Sie haben noch keine Schaeden gemeldet.
          </p>
        ) : (
          data.reports.map((report) => (
            <article key={report.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-medium">
                    {report.room.building.name} - {report.room.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">{dateFormatter.format(report.reportedAt)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm ${getDamageStatusBadgeClass(report.status)}`}>
                  {getDamageStatusLabel(report.status)}
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-300">{report.description}</p>
              {report.photoStorageKey ? <p className="mt-2 text-sm text-slate-500">{report.photoStorageKey}</p> : null}
              {report.processedBy ? (
                <p className="mt-2 text-sm text-slate-500">
                  Bearbeitet von {report.processedBy.displayName ?? report.processedBy.email}
                </p>
              ) : null}
            </article>
          ))
        )}
      </section>
    </>
  );
}
