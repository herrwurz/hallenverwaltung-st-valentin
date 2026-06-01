import { acknowledgeNoShowAction, reportNoShowAction } from "@/app/admin/no-shows/actions";
import { FormActions } from "@/components/form-actions";
import { StatusFilterSelect } from "@/components/status-filter-select";
import { getNoShowStatusBadgeClass, getNoShowStatusLabel } from "@/lib/no-show-status";
import { requirePermission } from "@/lib/permissions";
import { getAdminNoShowData } from "@/lib/services/no-show-service";

const dateFormatter = new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" });
const inputClass = "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm";
const filterButtons = ["ALL", "REPORTED", "ACKNOWLEDGED"] as const;

type PageProps = {
  searchParams: Promise<{ status?: string; saved?: string; acknowledged?: string; error?: string }>;
};

export default async function AdminNoShowsPage({ searchParams }: PageProps) {
  const user = await requirePermission("REPORT_NO_SHOW");
  const params = await searchParams;
  const data = await getAdminNoShowData(user.id, params.status);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-400">Hallenwart</p>
      <h2 className="mt-3 text-3xl font-semibold">No-Show-Meldungen</h2>
      <p className="mt-3 text-slate-300">
        Nichtnutzungen genehmigter Buchungen protokollieren. Keine Sanktionen, keine automatische Abrechnung und keine
        Statusänderung der Buchung in dieser Phase.
      </p>

      {params.error ? (
        <p className="mt-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">{params.error}</p>
      ) : null}
      {params.saved ? (
        <p className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          No-Show wurde gemeldet.
        </p>
      ) : null}
      {params.acknowledged ? (
        <p className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          No-Show wurde zur Kenntnis genommen.
        </p>
      ) : null}

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="text-lg font-medium">No-Show melden</h3>
        {data.reportableBookings.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">
            Aktuell sind keine abgeschlossenen genehmigten Buchungen für eine neue Meldung verfügbar.
          </p>
        ) : (
          <form action={reportNoShowAction} className="mt-5 grid gap-4 lg:grid-cols-2">
            <label className="text-sm text-slate-300 lg:col-span-2">
              Buchung
              <select name="bookingId" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Bitte wählen
                </option>
                {data.reportableBookings.map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {dateFormatter.format(booking.startsAt)} | {booking.organization.name} |{" "}
                    {booking.room.building.name} - {booking.room.name} | {booking.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-300 lg:col-span-2">
              Beschreibung
              <textarea name="description" rows={3} required maxLength={2000} className={inputClass} />
            </label>
            <div className="lg:col-span-2">
              <FormActions submitLabel="No-Show melden" cancelHref="/admin" />
            </div>
          </form>
        )}
      </section>

      <StatusFilterSelect
        selectedValue={data.selectedStatus ?? "ALL"}
        options={filterButtons.map((filter) => ({
          value: filter,
          label: filter === "ALL" ? "Alle" : getNoShowStatusLabel(filter),
        }))}
      />

      <section className="mt-8 space-y-3">
        {data.reports.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
            Für den gewählten Filter sind keine No-Show-Meldungen vorhanden.
          </p>
        ) : (
          data.reports.map((report) => (
            <article key={report.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-medium">{report.booking.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {report.organization.name} | {report.room.building.name} - {report.room.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Buchung: {dateFormatter.format(report.booking.startsAt)} bis{" "}
                    {dateFormatter.format(report.booking.endsAt)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Gemeldet am {dateFormatter.format(report.reportedAt)} von{" "}
                    {report.reportedBy?.displayName ?? report.reportedBy?.email ?? "Unbekannt"}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm ${getNoShowStatusBadgeClass(report.status)}`}>
                  {getNoShowStatusLabel(report.status)}
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-300">{report.description}</p>
              {report.acknowledgedAt ? (
                <p className="mt-2 text-sm text-slate-500">
                  Zur Kenntnis genommen am {dateFormatter.format(report.acknowledgedAt)} von{" "}
                  {report.acknowledgedBy?.displayName ?? report.acknowledgedBy?.email ?? "Unbekannt"}
                </p>
              ) : null}

              {data.canAcknowledge && report.status === "REPORTED" ? (
                <form action={acknowledgeNoShowAction} className="mt-5">
                  <input type="hidden" name="noShowReportId" value={report.id} />
                  <input type="hidden" name="status" value={params.status ?? ""} />
                  <button className="rounded-lg border border-sky-700 px-4 py-2 text-sm text-sky-200 hover:bg-sky-950">
                    Zur Kenntnis nehmen
                  </button>
                </form>
              ) : null}
            </article>
          ))
        )}
      </section>
    </>
  );
}
