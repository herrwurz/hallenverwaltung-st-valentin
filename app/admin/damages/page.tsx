import Link from "next/link";
import { updateDamageStatusAction } from "@/app/admin/damages/actions";
import { getDamageStatusBadgeClass, getDamageStatusLabel } from "@/lib/document-damage-labels";
import { requirePermission } from "@/lib/permissions";
import { getAdminDamageData } from "@/lib/services/damage-service";

const dateFormatter = new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" });
const selectClass = "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm";
const filterButtons = ["ALL", "REPORTED", "IN_REVIEW", "RESOLVED"] as const;

type PageProps = {
  searchParams: Promise<{ status?: string; saved?: string; error?: string }>;
};

export default async function AdminDamagesPage({ searchParams }: PageProps) {
  await requirePermission("MANAGE_DAMAGE");
  const params = await searchParams;
  const data = await getAdminDamageData(params.status);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-400">Schaeden</p>
      <h2 className="mt-3 text-3xl font-semibold">Schadensmanagement</h2>
      <p className="mt-3 text-slate-300">
        Schadensmeldungen einsehen und den Bearbeitungsstatus aktualisieren. Hallenuebergaben und Zutrittsverwaltung
        werden in eigenen Verwaltungsbereichen gefuehrt.
      </p>
      {params.error ? (
        <p className="mt-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">{params.error}</p>
      ) : null}
      {params.saved ? (
        <p className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          Schadensmeldung wurde aktualisiert.
        </p>
      ) : null}

      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Statusfilter">
        {filterButtons.map((filter) => {
          const isActive = filter === "ALL" ? !data.selectedStatus : data.selectedStatus === filter;
          return (
            <Link
              key={filter}
              href={filter === "ALL" ? "/admin/damages" : `/admin/damages?status=${filter}`}
              className={`rounded-full px-4 py-2 text-sm transition ${
                isActive ? "bg-sky-500 text-slate-950" : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {filter === "ALL" ? "Alle" : getDamageStatusLabel(filter)}
            </Link>
          );
        })}
      </nav>

      <section className="mt-8 space-y-3">
        {data.reports.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
            Fuer den gewaehlten Filter sind keine Schadensmeldungen vorhanden.
          </p>
        ) : (
          data.reports.map((report) => (
            <article key={report.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-medium">
                    {report.room.building.name} - {report.room.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Gemeldet am {dateFormatter.format(report.reportedAt)} von{" "}
                    {report.reportedBy?.displayName ?? report.reportedBy?.email ?? "Unbekannt"}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm ${getDamageStatusBadgeClass(report.status)}`}>
                  {getDamageStatusLabel(report.status)}
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-300">{report.description}</p>
              {report.photoStorageKey ? <p className="mt-2 text-sm text-slate-500">{report.photoStorageKey}</p> : null}
              {report.resolvedAt ? (
                <p className="mt-2 text-sm text-slate-500">Erledigt am {dateFormatter.format(report.resolvedAt)}</p>
              ) : null}

              <form action={updateDamageStatusAction} className="mt-5 grid gap-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4 sm:grid-cols-[1fr_auto]">
                <input type="hidden" name="damageReportId" value={report.id} />
                <input type="hidden" name="filter" value={params.status ?? ""} />
                <label className="text-sm text-slate-300">
                  Neuer Status
                  <select name="status" defaultValue={report.status} className={selectClass}>
                    <option value="REPORTED">Gemeldet</option>
                    <option value="IN_REVIEW">In Bearbeitung</option>
                    <option value="RESOLVED">Erledigt</option>
                  </select>
                </label>
                <div className="self-end">
                  <button className="rounded-lg bg-sky-500 px-5 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400">
                    Status speichern
                  </button>
                </div>
              </form>
            </article>
          ))
        )}
      </section>
    </>
  );
}
