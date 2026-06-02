import Link from "next/link";
import { AppFeedback } from "@/components/app-feedback";
import { AreaShell } from "@/components/area-shell";
import { BuildingRoomSelect } from "@/components/building-room-select";
import { FormActions } from "@/components/form-actions";
import { PortalOrganizationField } from "@/components/portal-organization-field";
import { requirePermission } from "@/lib/permissions";
import { getBookingRequestOptions } from "@/lib/services/booking-service";
import {
  getWaitlistStatusBadgeClass,
  getWaitlistStatusLabel,
} from "@/lib/waitlist-status";
import { getWaitlistForOrganization } from "@/lib/services/waitlist-service";
import {
  acceptWaitlistOfferAction,
  createWaitlistEntryAction,
  declineWaitlistOfferAction,
} from "@/app/portal/waitlist/actions";

const inputClass = "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm";
const dateFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

type PageProps = {
  searchParams: Promise<{ saved?: string; accepted?: string; declined?: string; error?: string }>;
};

export default async function PortalWaitlistPage({ searchParams }: PageProps) {
  const user = await requirePermission("REQUEST_BOOKING");
  const [params, options, entries] = await Promise.all([
    searchParams,
    getBookingRequestOptions(user.id),
    getWaitlistForOrganization(user.id),
  ]);

  return (
    <AreaShell
      eyebrow="Portal"
      title="Warteliste"
      description="Wartelistenplätze für gefragte Zeitfenster anlegen und Angebote innerhalb von 48 Stunden bearbeiten."
      userName={user.name}
    >
      <div className="mt-8 flex items-center justify-between">
        <Link href="/portal" className="text-sm text-sky-300 hover:text-sky-200">
          Zurück zum Portal
        </Link>
      </div>

      <AppFeedback
        messages={[
          { tone: "error", text: params.error },
          { tone: "success", text: params.saved ? "Der Wartelistenplatz wurde gespeichert." : undefined },
          {
            tone: "success",
            text: params.accepted ? "Das Angebot wurde angenommen und als neuer Buchungsantrag angelegt." : undefined,
          },
          { tone: "success", text: params.declined ? "Das Angebot wurde abgelehnt." : undefined },
        ]}
      />

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-medium">Neuer Wartelistenplatz</h2>
        {options.organizations.length === 0 ? (
          <p className="mt-4 text-sm text-amber-200">
            Keine aktive, wartelistenberechtigte Organisation ist Ihrem Benutzer zugeordnet.
          </p>
        ) : (
          <form action={createWaitlistEntryAction} className="mt-5 grid gap-4 lg:grid-cols-2">
            <PortalOrganizationField organizations={options.organizations} inputClassName={inputClass} />
            <BuildingRoomSelect buildings={options.buildings} inputClassName={inputClass} />
            <label className="text-sm text-slate-300">
              Titel
              <input name="title" required maxLength={160} className={inputClass} />
            </label>
            <label className="text-sm text-slate-300">
              Nutzungstyp
              <select name="usageTypeId" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Bitte wählen
                </option>
                {options.usageTypes.map((usageType) => (
                  <option key={usageType.id} value={usageType.id}>
                    {usageType.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-300">
              Beginn
              <input name="startsAt" type="datetime-local" required className={inputClass} />
            </label>
            <label className="text-sm text-slate-300">
              Ende
              <input name="endsAt" type="datetime-local" required className={inputClass} />
            </label>
            <div className="lg:col-span-2">
              <FormActions submitLabel="Wartelistenplatz anlegen" cancelHref="/portal" />
            </div>
          </form>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-medium">Wartelistenplätze Ihrer Organisationen</h2>
        <div className="mt-4 space-y-3">
          {entries.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
              Noch keine Wartelistenplätze vorhanden.
            </p>
          ) : (
            entries.map((entry) => (
              <article key={entry.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex flex-wrap justify-between gap-4">
                  <div>
                    <h3 className="font-medium">{entry.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {entry.organization.name} | {entry.room.building.name} - {entry.room.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {dateFormatter.format(entry.startsAt)} bis {dateFormatter.format(entry.endsAt)} |{" "}
                      {entry.usageType.name}
                    </p>
                    {entry.offerExpiresAt ? (
                      <p className="mt-1 text-sm text-amber-200">
                        Angebotsfrist bis {dateFormatter.format(entry.offerExpiresAt)}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className={`inline-flex rounded-full px-3 py-1 text-sm ${getWaitlistStatusBadgeClass(entry.status)}`}>
                      {getWaitlistStatusLabel(entry.status)}
                    </p>
                    {entry.status === "OFFERED" ? (
                      <div className="mt-3 flex justify-end gap-3">
                        <form action={acceptWaitlistOfferAction}>
                          <input type="hidden" name="waitlistEntryId" value={entry.id} />
                          <button className="text-sm text-emerald-300 hover:text-emerald-200">Annehmen</button>
                        </form>
                        <form action={declineWaitlistOfferAction}>
                          <input type="hidden" name="waitlistEntryId" value={entry.id} />
                          <button className="text-sm text-red-300 hover:text-red-200">Ablehnen</button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </AreaShell>
  );
}
