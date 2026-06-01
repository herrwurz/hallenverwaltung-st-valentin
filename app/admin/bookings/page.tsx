import { getBookingStatusBadgeClass, getBookingStatusLabel, type AdminBookingFilterKey } from "@/lib/booking-status";
import { hasPermission, requirePermission } from "@/lib/permissions";
import {
  getBookingsForAdmin,
  resolveAdminBookingFilter,
} from "@/lib/services/booking-approval-service";
import {
  approveBookingAction,
  markBookingInReviewAction,
  rejectBookingAction,
} from "@/app/admin/bookings/actions";

const dateFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

const statusLabels: Record<AdminBookingFilterKey, string> = {
  OPEN: "Offen (beantragt + in Prüfung)",
  ALL: "Alle",
  REQUESTED: "Beantragt",
  IN_REVIEW: "In Prüfung",
  APPROVED: "Genehmigt",
  REJECTED: "Abgelehnt",
  CANCELLED: "Storniert",
};

const textareaClass = "mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm";

type PageProps = {
  searchParams: Promise<{
    status?: string;
    reviewed?: string;
    approved?: string;
    rejected?: string;
    error?: string;
  }>;
};

export default async function AdminBookingsPage({ searchParams }: PageProps) {
  const user = await requirePermission("VIEW_BOOKINGS");
  const params = await searchParams;
  const requestedFilter = params.status as AdminBookingFilterKey | undefined;
  const selectedFilter =
    requestedFilter === "ALL" ||
    requestedFilter === "OPEN" ||
    requestedFilter === "REQUESTED" ||
    requestedFilter === "IN_REVIEW" ||
    requestedFilter === "APPROVED" ||
    requestedFilter === "REJECTED" ||
    requestedFilter === "CANCELLED"
      ? requestedFilter
      : "OPEN";
  const [canApprove, canReject, bookings] = await Promise.all([
    hasPermission(user.id, "APPROVE_BOOKING"),
    hasPermission(user.id, "REJECT_BOOKING"),
    getBookingsForAdmin(user.id, selectedFilter),
  ]);
  const activeStatuses = new Set(resolveAdminBookingFilter(selectedFilter));
  const filterOptions: AdminBookingFilterKey[] = ["OPEN", "REQUESTED", "IN_REVIEW", "APPROVED", "REJECTED", "CANCELLED", "ALL"];

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-400">Buchungen</p>
      <h2 className="mt-3 text-3xl font-semibold">Buchungsanträge</h2>
      <p className="mt-3 text-slate-300">
        Offene und bearbeitete Buchungsanträge mit Konflikthinweisen, Historie und serverseitig gesicherten
        Entscheidungsaktionen.
      </p>
      {params.error ? (
        <p className="mt-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">{params.error}</p>
      ) : null}
      {params.reviewed ? (
        <p className="mt-6 rounded-lg border border-sky-800 bg-sky-950/40 p-4 text-sm text-sky-200">
          Der Antrag wurde in Prüfung übernommen.
        </p>
      ) : null}
      {params.approved ? (
        <p className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          Die Buchung wurde genehmigt.
        </p>
      ) : null}
      {params.rejected ? (
        <p className="mt-6 rounded-lg border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-200">
          Die Buchung wurde abgelehnt.
        </p>
      ) : null}

      <form className="mt-8 flex flex-wrap items-end gap-3" aria-label="Statusfilter">
        <label className="text-sm text-slate-300">
          Status filtern
          <select
            name="status"
            defaultValue={selectedFilter}
            className="mt-1 min-w-72 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          >
            {filterOptions.map((filterKey) => (
              <option key={filterKey} value={filterKey}>
                {statusLabels[filterKey]}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400">
          Anwenden
        </button>
      </form>

      <section className="mt-8 space-y-3">
        {bookings.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
            Für den gewählten Statusfilter sind keine Buchungen vorhanden.
          </p>
        ) : (
          bookings.map((booking) => (
            <article key={booking.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-medium">{booking.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {booking.organization.name} | {booking.room.building.name} - {booking.room.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {dateFormatter.format(booking.startsAt)} bis {dateFormatter.format(booking.endsAt)} |{" "}
                    {booking.usageType.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Beantragt von {booking.requestedBy?.displayName ?? "Unbekannt"}
                    {booking.processedBy ? ` | Zuletzt bearbeitet von ${booking.processedBy.displayName}` : ""}
                  </p>
                  {booking.description ? (
                    <p className="mt-3 max-w-3xl text-sm text-slate-300">{booking.description}</p>
                  ) : null}
                </div>
                <span className={`rounded-full px-3 py-1 text-sm ${getBookingStatusBadgeClass(booking.status)}`}>
                  {getBookingStatusLabel(booking.status)}
                </span>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[1.4fr,1fr]">
                <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-medium text-slate-200">Konflikthinweise</h4>
                    <span className="text-xs text-slate-500">
                      Filter aktiv: {Array.from(activeStatuses).map(getBookingStatusLabel).join(", ")}
                    </span>
                  </div>
                  {booking.conflicts.length === 0 ? (
                    <p className="mt-3 text-sm text-emerald-200">Aktuell keine Konflikte erkannt.</p>
                  ) : (
                    <ul className="mt-3 space-y-2 text-sm">
                      {booking.conflicts.map((conflict, index) => (
                        <li
                          key={`${booking.id}-conflict-${index}`}
                          className={`rounded-lg border px-3 py-2 ${
                            conflict.severity === "blocking"
                              ? "border-rose-900 bg-rose-950/40 text-rose-200"
                              : "border-amber-900 bg-amber-950/40 text-amber-200"
                          }`}
                        >
                          <p className="font-medium">
                            {conflict.severity === "blocking" ? "Blockierend" : "Soft-Konflikt"}
                          </p>
                          <p className="mt-1">{conflict.message}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                  <h4 className="text-sm font-medium text-slate-200">Historie</h4>
                  <ul className="mt-3 space-y-3 text-sm text-slate-300">
                    {booking.statusHistory.map((entry) => (
                      <li key={entry.id} className="rounded-lg border border-slate-800 p-3">
                        <p className="font-medium">
                          {entry.oldStatus ? getBookingStatusLabel(entry.oldStatus) : "Neu"}{" "}
                          <span className="text-slate-500">{"->"}</span> {getBookingStatusLabel(entry.newStatus)}
                        </p>
                        <p className="mt-1 text-slate-400">
                          {dateFormatter.format(entry.createdAt)} | {entry.actor?.displayName ?? "System"}
                        </p>
                        {entry.reason ? <p className="mt-2 text-slate-300">{entry.reason}</p> : null}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              {canApprove || canReject ? (
                <section className="mt-5 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                  <h4 className="text-sm font-medium text-slate-200">Entscheidung</h4>
                  <p className="mt-2 text-sm text-slate-400">
                    Workflow in Phase 6: Beantragt {"->"} In Prüfung {"->"} Genehmigt oder Abgelehnt.
                  </p>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {canApprove && booking.status === "REQUESTED" ? (
                      <form action={markBookingInReviewAction} className="rounded-lg border border-slate-800 p-4">
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <input type="hidden" name="status" value={selectedFilter} />
                        <p className="text-sm text-slate-300">Antrag zur fachlichen Prüfung übernehmen.</p>
                        <button className="mt-4 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400">
                          In Prüfung setzen
                        </button>
                      </form>
                    ) : null}

                    {canApprove && booking.status === "IN_REVIEW" ? (
                      <form action={approveBookingAction} className="rounded-lg border border-emerald-900 p-4">
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <input type="hidden" name="status" value={selectedFilter} />
                        <label className="text-sm text-slate-300">
                          Kommentar (optional)
                          <textarea name="decisionNote" rows={3} className={textareaClass} />
                        </label>
                        <button className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400">
                          Genehmigen
                        </button>
                      </form>
                    ) : null}

                    {canReject && booking.status === "IN_REVIEW" ? (
                      <form action={rejectBookingAction} className="rounded-lg border border-rose-900 p-4">
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <input type="hidden" name="status" value={selectedFilter} />
                        <label className="text-sm text-slate-300">
                          Begründung (erforderlich)
                          <textarea name="decisionNote" rows={3} required className={textareaClass} />
                        </label>
                        <button className="mt-4 rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-rose-400">
                          Ablehnen
                        </button>
                      </form>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </article>
          ))
        )}
      </section>
    </>
  );
}
