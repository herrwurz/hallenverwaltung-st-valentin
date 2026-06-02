import { AppBackLink } from "@/components/app-back-link";
import { reportDamageAction } from "@/app/portal/damages/actions";
import { AppFeedback } from "@/components/app-feedback";
import { BuildingRoomSelect } from "@/components/building-room-select";
import { FormActions } from "@/components/form-actions";
import { getDamageStatusBadgeClass, getDamageStatusLabel } from "@/lib/document-damage-labels";
import { requirePermission } from "@/lib/permissions";
import { getPortalDamageData } from "@/lib/services/damage-service";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const dateFormatter = new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" });

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function PortalDamagesPage({ searchParams }: PageProps) {
  const user = await requirePermission("REPORT_DAMAGE");
  const [params, data] = await Promise.all([searchParams, getPortalDamageData(user.id)]);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Portal</p>
      <h2 className="mt-3 text-3xl font-semibold">Schadensmeldungen</h2>
      <p className="mt-3 text-muted-foreground">
        Melden Sie Schäden mit Beschreibung und optionalem Foto-Ablagepfad. Die Gemeinde bearbeitet den Status.
      </p>
      <div className="mt-8 flex items-center justify-between">
        <AppBackLink href="/portal" label="Zurück zum Portal" />
      </div>
      <AppFeedback
        messages={[
          { tone: "error", text: params.error },
          { tone: "success", text: params.saved ? "Schadensmeldung wurde gespeichert." : undefined },
        ]}
      />

      <section className="mt-8 rounded-xl border border-border bg-card p-5">
        <h3 className="text-lg font-medium">Neuen Schaden melden</h3>
        <form action={reportDamageAction} className="mt-5 grid gap-4 lg:grid-cols-2">
          <BuildingRoomSelect buildings={data.buildings} inputClassName={inputClass} />
          <label className="text-sm text-muted-foreground">
            Foto-Ablagepfad optional
            <input name="photoStorageKey" className={inputClass} placeholder="damages/foto-001.jpg" />
          </label>
          <label className="text-sm text-muted-foreground lg:col-span-2">
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
          <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            Sie haben noch keine Schäden gemeldet.
          </p>
        ) : (
          data.reports.map((report) => (
            <article key={report.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-medium">
                    {report.room.building.name} - {report.room.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{dateFormatter.format(report.reportedAt)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm ${getDamageStatusBadgeClass(report.status)}`}>
                  {getDamageStatusLabel(report.status)}
                </span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{report.description}</p>
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
