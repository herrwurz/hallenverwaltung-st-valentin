import { approveChangeRequestAction, markChangeRequestInReviewAction, rejectChangeRequestAction } from "@/app/admin/booking-changes/actions";
import { AppFeedback } from "@/components/app-feedback";
import { StatusFilterSelect } from "@/components/status-filter-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getBookingChangeStatusBadgeClass,
  getBookingChangeStatusLabel,
  getBookingChangeTypeLabel,
  type BookingChangeFilterKey,
} from "@/lib/booking-change-status";
import { hasPermission, requirePermission } from "@/lib/permissions";
import { getChangeRequestsForAdmin, resolveBookingChangeFilter } from "@/lib/services/booking-change-service";

const dateFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

const filterLabels: Record<BookingChangeFilterKey, string> = {
  OPEN: "Offen (beantragt + in Prüfung)",
  ALL: "Alle",
  REQUESTED: "Beantragt",
  IN_REVIEW: "In Prüfung",
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

const textareaClass = "mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";

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
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Buchungen</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Änderungsanträge</h2>
      <p className="mt-3 text-muted-foreground">
        Terminverschiebungen und vorbereitete Tauschanträge. Genehmigte Verschiebungen behalten die alte Buchung als
        `MOVED` und erzeugen einen neuen genehmigten Ersatztermin.
      </p>

      <AppFeedback
        messages={[
          { tone: "error", text: params.error },
          { tone: "info", text: params.reviewed ? "Der Änderungsantrag wurde in Prüfung übernommen." : undefined },
          { tone: "success", text: params.approved ? "Der Änderungsantrag wurde genehmigt." : undefined },
          { tone: "success", text: params.rejected ? "Der Änderungsantrag wurde abgelehnt." : undefined },
        ]}
      />

      <StatusFilterSelect
        selectedValue={selectedFilter}
        options={filterButtons.map((filterKey) => ({
          value: filterKey,
          label: filterLabels[filterKey],
        }))}
      />

      <section className="mt-8 space-y-4">
        {requests.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            Für den gewählten Statusfilter sind keine Änderungsanträge vorhanden.
          </p>
        ) : (
          requests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-primary">{getBookingChangeTypeLabel(request.type)}</p>
                    <CardTitle className="mt-1">{request.booking.title}</CardTitle>
                    <CardDescription>
                      {request.booking.organization.name} | beantragt von{" "}
                      {request.requestedBy.displayName ?? request.requestedBy.email}
                    </CardDescription>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Filter aktiv: {Array.from(activeStatuses).map(getBookingChangeStatusLabel).join(", ")}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm ${getBookingChangeStatusBadgeClass(request.status)}`}>
                    {getBookingChangeStatusLabel(request.status)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 lg:grid-cols-2">
                  <section className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
                    <h4 className="font-medium">Bisheriger Termin</h4>
                    <p className="mt-2 text-muted-foreground">
                      {request.oldRoom.building.name} - {request.oldRoom.name}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {dateFormatter.format(request.oldStartAt)} bis {dateFormatter.format(request.oldEndAt)}
                    </p>
                  </section>
                  <section className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
                    <h4 className="font-medium">Gewünschter Termin</h4>
                    <p className="mt-2 text-muted-foreground">
                      {request.newRoom.building.name} - {request.newRoom.name}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {dateFormatter.format(request.newStartAt)} bis {dateFormatter.format(request.newEndAt)}
                    </p>
                  </section>
                </div>

                <section className="mt-4 rounded-lg border border-border bg-muted/40 p-4 text-sm">
                  <h4 className="font-medium">Begründung</h4>
                  <p className="mt-2 text-muted-foreground">{request.reason}</p>
                  {request.decisionNote ? (
                    <p className="mt-3 text-muted-foreground">
                      Entscheidung: {request.decisionNote}
                      {request.decidedBy ? ` | ${request.decidedBy.displayName ?? request.decidedBy.email}` : ""}
                      {request.decidedAt ? ` | ${dateFormatter.format(request.decidedAt)}` : ""}
                    </p>
                  ) : null}
                </section>

                <section className="mt-4 rounded-lg border border-border bg-muted/40 p-4">
                  <h4 className="text-sm font-medium">Konflikthinweise neuer Termin</h4>
                  {request.conflicts.length === 0 ? (
                    <p className="mt-3 text-sm text-emerald-700">Aktuell keine harten Konflikte erkannt.</p>
                  ) : (
                    <ul className="mt-3 space-y-2 text-sm">
                      {request.conflicts.map((conflict, index) => (
                        <li
                          key={`${request.id}-conflict-${index}`}
                          className={`rounded-lg border px-3 py-2 ${
                            conflict.severity === "blocking"
                              ? "border-rose-500/20 bg-destructive/10 text-rose-700"
                              : "border-warning/35 bg-warning/15 text-warning-foreground"
                          }`}
                        >
                          <p className="font-medium">{conflict.severity === "blocking" ? "Blockierend" : "Soft-Konflikt"}</p>
                          <p className="mt-1">{conflict.message}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {canApprove || canReject ? (
                  <section className="mt-5 rounded-lg border border-border bg-muted/40 p-4">
                    <h4 className="text-sm font-medium">Entscheidung</h4>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Verschiebung: Beantragt {"->"} In Prüfung {"->"} Genehmigt oder Abgelehnt. Tausch ist aktuell nur
                      vorbereitet.
                    </p>
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      {canApprove && request.status === "REQUESTED" ? (
                        <form action={markChangeRequestInReviewAction} className="rounded-lg border border-border bg-card p-4">
                          <input type="hidden" name="requestId" value={request.id} />
                          <input type="hidden" name="status" value={selectedFilter} />
                          <p className="text-sm text-muted-foreground">Antrag zur fachlichen Prüfung übernehmen.</p>
                          <Button className="mt-4">In Prüfung setzen</Button>
                        </form>
                      ) : null}

                      {canApprove && request.status === "IN_REVIEW" ? (
                        <form action={approveChangeRequestAction} className="rounded-lg border border-emerald-500/20 bg-card p-4">
                          <input type="hidden" name="requestId" value={request.id} />
                          <input type="hidden" name="status" value={selectedFilter} />
                          <p className="text-sm text-muted-foreground">
                            Genehmigt die Verschiebung, setzt die alte Buchung auf MOVED und legt den Ersatztermin an.
                          </p>
                          <Button className="mt-4" variant="success">Genehmigen</Button>
                        </form>
                      ) : null}

                      {canReject && request.status === "IN_REVIEW" ? (
                        <form action={rejectChangeRequestAction} className="rounded-lg border border-rose-500/20 bg-card p-4">
                          <input type="hidden" name="requestId" value={request.id} />
                          <input type="hidden" name="status" value={selectedFilter} />
                          <label className="text-sm font-medium">
                            Begründung (erforderlich)
                            <textarea name="decisionNote" rows={3} required className={textareaClass} />
                          </label>
                          <Button className="mt-4" variant="destructive">Ablehnen</Button>
                        </form>
                      ) : null}
                    </div>
                  </section>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </>
  );
}
