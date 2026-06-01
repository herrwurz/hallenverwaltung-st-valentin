import { StatusFilterSelect } from "@/components/status-filter-select";
import {
  getBookingChangeStatusBadgeClass,
  getBookingChangeStatusLabel,
  getBookingChangeTypeLabel,
  type BookingChangeFilterKey,
} from "@/lib/booking-change-status";
import { hasPermission, requirePermission } from "@/lib/permissions";
import {
  getChangeRequestsForAdmin,
  resolveBookingChangeFilter,
} from "@/lib/services/booking-change-service";
import {
  approveChangeRequestAction,
  markChangeRequestInReviewAction,
  rejectChangeRequestAction,
} from "@/app/admin/booking-changes/actions";

const dateFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

const filterLabels: Record<BookingChangeFilterKey, string> = {
  OPEN: "Offen (beantragt + in Pruefung)",
  ALL: "Alle",
  REQUESTED: "Beantragt",
  IN_REVIEW: "In Pruefung",
  APPROVED: "Genehmigt",
  REJECTED: "Abgelehnt",
  CANCELLED: "Storniert",
};

const filterButtons: BookingChangeFilterKey[] = [
  "OPEN",
  "REQUESTED",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "ALL",
];

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

function resolveSelectedFilter(status: string | undefined): BookingChangeFilterKey {
  if (
    status === "ALL" ||
    status === "OPEN" ||
    status === "REQUESTED" ||
    status === "IN_REVIEW" ||
    status === "APPROVED" ||
    status === "REJECTED" ||
    status === "CANCELLED"
  ) {
    return status;
  }

  return "OPEN";
}

export default async function AdminBookingChangesPage({ searchParams }: PageProps) {
  const user = await requirePermission("VIEW_BOOKINGS");
  const params = await searchParams;
  const selectedFilter = resolveSelectedFilter(params.status);
  const [canApprove, canReject, requests] = await Promise.all([
    hasPermission(user.id, "APPROVE_BOOKING"),
    hasPermission(user.id, "REJECT_BOOKING"),
    getChangeRequestsForAdmin(selectedFilter),
  ]);
  const activeStatuses = new Set(resolveBookingChangeFilter(selectedFilter));

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-400">Buchungen</p>
      <h2 className="mt-3 text-3xl font-semibold">Aenderungsantraege</h2>
      <p className="mt-3 text-slate-300">
        Terminverschiebungen und vorbereitete Tauschantraege. Genehmigte Verschiebungen behalten die alte Buchung als
        `MOVED` und erzeugen einen neuen genehmigten Ersatztermin.
      </p>

      {params.error ? (
        <p className="mt-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">
          {params.error}
        </p>
      ) : null}
      {params.reviewed ? (
        <p className="mt-6 rounded-lg border border-sky-800 bg-sky-950/40 p-4 text-sm text-sky-200">
          Der Aenderungsantrag wurde in Pruefung uebernommen.
        </p>
      ) : null}
      {params.approved ? (
        <p className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          Der Aenderungsantrag wurde genehmigt.
        </p>
      ) : null}
      {params.rejected ? (
        <p className="mt-6 rounded-lg border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-200">
          Der Aenderungsantrag wurde abgelehnt.
        </p>
      ) : null}

      <StatusFilterSelect
        selectedValue={selectedFilter}
        options={filterButtons.map((filterKey) => ({
          value: filterKey,
          label: filterLabels[filterKey],
        }))}
      />

      <section className="mt-8 space-y-3">
        {requests.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
            Fuer den gewaehlten Statusfilter sind keine Aenderungsantraege vorhanden.
          </p>
        ) : (
          requests.map((request) => (
            <article key={request.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-sky-300">{getBookingChangeTypeLabel(request.type)}</p>
                  <h3 className="mt-1 font-medium">{request.booking.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {request.booking.organization.name} | beantragt von{" "}
                    {request.requestedBy.displayName ?? request.requestedBy.email}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Filter aktiv: {Array.from(activeStatuses).map(getBookingChangeStatusLabel).join(", ")}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm ${getBookingChangeStatusBadgeClass(request.status)}`}>
                  {getBookingChangeStatusLabel(request.status)}
                </span>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm">
                  <h4 className="font-medium text-slate-200">Bisheriger Termin</h4>
                  <p className="mt-2 text-slate-300">
                    {request.oldRoom.building.name} - {request.oldRoom.name}
                  </p>
                  <p className="mt-1 text-slate-400">
                    {dateFormatter.format(request.oldStartAt)} bis {dateFormatter.format(request.oldEndAt)}
                  </p>
                </section>
                <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm">
                  <h4 className="font-medium text-slate-200">Gewuenschter Termin</h4>
                  <p className="mt-2 text-slate-300">
                    {request.newRoom.building.name} - {request.newRoom.name}
                  </p>
                  <p className="mt-1 text-slate-400">
                    {dateFormatter.format(request.newStartAt)} bis {dateFormatter.format(request.newEndAt)}
                  </p>
                </section>
              </div>

              <section className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm">
                <h4 className="font-medium text-slate-200">Begruendung</h4>
                <p className="mt-2 text-slate-300">{request.reason}</p>
                {request.decisionNote ? (
                  <p className="mt-3 text-slate-400">
                    Entscheidung: {request.decisionNote}
                    {request.decidedBy ? ` | ${request.decidedBy.displayName ?? request.decidedBy.email}` : ""}
                    {request.decidedAt ? ` | ${dateFormatter.format(request.decidedAt)}` : ""}
                  </p>
                ) : null}
              </section>

              <section className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                <h4 className="text-sm font-medium text-slate-200">Konflikthinweise neuer Termin</h4>
                {request.conflicts.length === 0 ? (
                  <p className="mt-3 text-sm text-emerald-200">Aktuell keine harten Konflikte erkannt.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {request.conflicts.map((conflict, index) => (
                      <li
                        key={`${request.id}-conflict-${index}`}
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

              {canApprove || canReject ? (
                <section className="mt-5 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                  <h4 className="text-sm font-medium text-slate-200">Entscheidung</h4>
                  <p className="mt-2 text-sm text-slate-400">
                    Verschiebung: Beantragt {"->"} In Pruefung {"->"} Genehmigt oder Abgelehnt. Tausch ist aktuell nur
                    vorbereitet.
                  </p>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {canApprove && request.status === "REQUESTED" ? (
                      <form action={markChangeRequestInReviewAction} className="rounded-lg border border-slate-800 p-4">
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="status" value={selectedFilter} />
                        <p className="text-sm text-slate-300">Antrag zur fachlichen Pruefung uebernehmen.</p>
                        <button className="mt-4 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400">
                          In Pruefung setzen
                        </button>
                      </form>
                    ) : null}

                    {canApprove && request.status === "IN_REVIEW" ? (
                      <form action={approveChangeRequestAction} className="rounded-lg border border-emerald-900 p-4">
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="status" value={selectedFilter} />
                        <p className="text-sm text-slate-300">
                          Genehmigt die Verschiebung, setzt die alte Buchung auf MOVED und legt den Ersatztermin an.
                        </p>
                        <button className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400">
                          Genehmigen
                        </button>
                      </form>
                    ) : null}

                    {canReject && request.status === "IN_REVIEW" ? (
                      <form action={rejectChangeRequestAction} className="rounded-lg border border-rose-900 p-4">
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="status" value={selectedFilter} />
                        <label className="text-sm text-slate-300">
                          Begruendung (erforderlich)
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
