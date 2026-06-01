import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { StatusFilterSelect } from "@/components/status-filter-select";
import { requirePermission } from "@/lib/permissions";
import {
  adminWaitlistFilterStatuses,
  getWaitlistStatusBadgeClass,
  getWaitlistStatusLabel,
  type AdminWaitlistFilterKey,
} from "@/lib/waitlist-status";
import { getWaitlistForAdmin } from "@/lib/services/waitlist-service";

const dateFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

type PageProps = {
  searchParams: Promise<{ status?: AdminWaitlistFilterKey }>;
};

export default async function AdminWaitlistPage({ searchParams }: PageProps) {
  const user = await requirePermission("VIEW_BOOKINGS");
  const params = await searchParams;
  const entries = await getWaitlistForAdmin(user.id, params.status);
  const selectedStatus = params.status ?? "";

  return (
    <AdminShell userName={user.name}>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-400">Warteliste</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold">Wartelistenübersicht</h2>
          <p className="mt-3 max-w-3xl text-slate-300">
            Alle Wartelistenplätze mit Status, Frist und Organisationsbezug. Die Reihenfolge bleibt in dieser Phase
            unverändert und richtet sich nach dem Eingangszeitpunkt.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-sky-300 hover:text-sky-200">
          Zurück zum Dashboard
        </Link>
      </div>

      <StatusFilterSelect
        selectedValue={selectedStatus}
        options={[
          { value: "", label: "Aktiv + angeboten" },
          { value: "ALL", label: "Alle" },
          ...adminWaitlistFilterStatuses.map((status) => ({
            value: status,
            label: getWaitlistStatusLabel(status),
          })),
        ]}
      />

      <div className="mt-8 space-y-4">
        {entries.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
            Keine Wartelistenplätze für den ausgewählten Filter gefunden.
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
                  <p className="mt-1 text-sm text-slate-400">
                    Eingereiht am {dateFormatter.format(entry.placedAt)}
                    {entry.requestedBy ? ` | angelegt von ${entry.requestedBy.displayName ?? entry.requestedBy.email}` : ""}
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
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </AdminShell>
  );
}
