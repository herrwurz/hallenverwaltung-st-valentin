import { AppFeedback } from "@/components/app-feedback";
import { AdminBookingsTable, type AdminBookingTableRow } from "@/components/admin-bookings-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBookingStatusBadgeClass, getBookingStatusLabel, type AdminBookingFilterKey } from "@/lib/booking-status";
import { hasPermission, requirePermission } from "@/lib/permissions";
import { getBookingsForAdmin, resolveAdminBookingFilter } from "@/lib/services/booking-approval-service";
import { approveBookingAction, markBookingInReviewAction, rejectBookingAction } from "@/app/admin/bookings/actions";

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
  const bookingTableRows: AdminBookingTableRow[] = bookings.map((booking) => ({
    id: booking.id,
    title: booking.title,
    usageTypeName: booking.usageType.name,
    organizationName: booking.organization.name,
    buildingName: booking.room.building.name,
    roomName: booking.room.name,
    startsAtLabel: dateFormatter.format(booking.startsAt),
    endsAtLabel: dateFormatter.format(booking.endsAt),
    status: booking.status,
    conflictCount: booking.conflicts.length,
    hasBlockingConflict: booking.conflicts.some((conflict) => conflict.severity === "blocking"),
  }));

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Buchungen</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Buchungsanträge</h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Offene und bearbeitete Buchungsanträge mit Konflikthinweisen, Historie und serverseitig gesicherten
        Entscheidungsaktionen.
      </p>
      <AppFeedback
        messages={[
          { tone: "error", text: params.error },
          { tone: "info", text: params.reviewed ? "Der Antrag wurde in Prüfung übernommen." : undefined },
          { tone: "success", text: params.approved ? "Die Buchung wurde genehmigt." : undefined },
          { tone: "success", text: params.rejected ? "Die Buchung wurde abgelehnt." : undefined },
        ]}
      />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Filter</CardTitle>
          <CardDescription>Standard ist die Arbeitsliste aus beantragten und in Prüfung befindlichen Anträgen.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" aria-label="Statusfilter">
            <label className="text-sm font-medium text-foreground">
              Status filtern
              <select
                name="status"
                defaultValue={selectedFilter}
                className="mt-1 min-w-72 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              >
                {filterOptions.map((filterKey) => (
                  <option key={filterKey} value={filterKey}>
                    {statusLabels[filterKey]}
                  </option>
                ))}
              </select>
            </label>
            <Button>Anwenden</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Buchungsliste</CardTitle>
              <CardDescription>
                Aktiver Statusfilter: {Array.from(activeStatuses).map(getBookingStatusLabel).join(", ")}
              </CardDescription>
            </div>
            <Badge variant="outline">{bookings.length} Einträge</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted p-5 text-sm text-muted-foreground">
              Für den gewählten Statusfilter sind keine Buchungen vorhanden.
            </p>
          ) : (
            <AdminBookingsTable rows={bookingTableRows} />
          )}
        </CardContent>
      </Card>

      <section className="mt-8 space-y-4">
        {bookings.map((booking) => (
          <Card key={`${booking.id}-details`}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>{booking.title}</CardTitle>
                  <CardDescription>
                    {booking.organization.name} | {booking.room.building.name} - {booking.room.name} |{" "}
                    {dateFormatter.format(booking.startsAt)} bis {dateFormatter.format(booking.endsAt)}
                  </CardDescription>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm ${getBookingStatusBadgeClass(booking.status)}`}>
                  {getBookingStatusLabel(booking.status)}
                </span>
              </div>
              {booking.description ? <p className="pt-3 text-sm text-muted-foreground">{booking.description}</p> : null}
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 xl:grid-cols-[1.4fr,1fr]">
                <section className="rounded-xl border border-border bg-muted/40 p-4">
                  <h4 className="text-sm font-medium">Konflikthinweise</h4>
                  {booking.conflicts.length === 0 ? (
                    <p className="mt-3 text-sm text-emerald-700">Aktuell keine Konflikte erkannt.</p>
                  ) : (
                    <ul className="mt-3 space-y-2 text-sm">
                      {booking.conflicts.map((conflict, index) => (
                        <li
                          key={`${booking.id}-conflict-${index}`}
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

                <section className="rounded-xl border border-border bg-muted/40 p-4">
                  <h4 className="text-sm font-medium">Historie</h4>
                  <ul className="mt-3 space-y-3 text-sm">
                    {booking.statusHistory.map((entry) => (
                      <li key={entry.id} className="rounded-lg border border-border bg-card p-3">
                        <p className="font-medium">
                          {entry.oldStatus ? getBookingStatusLabel(entry.oldStatus) : "Neu"}{" "}
                          <span className="text-muted-foreground">{"->"}</span> {getBookingStatusLabel(entry.newStatus)}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {dateFormatter.format(entry.createdAt)} | {entry.actor?.displayName ?? "System"}
                        </p>
                        {entry.reason ? <p className="mt-2">{entry.reason}</p> : null}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              {canApprove || canReject ? (
                <section className="mt-5 rounded-xl border border-border bg-muted/40 p-4">
                  <h4 className="text-sm font-medium">Entscheidung</h4>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Workflow: Beantragt {"->"} In Prüfung {"->"} Genehmigt oder Abgelehnt.
                  </p>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {canApprove && booking.status === "REQUESTED" ? (
                      <form action={markBookingInReviewAction} className="rounded-xl border border-border bg-card p-4">
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <input type="hidden" name="status" value={selectedFilter} />
                        <p className="text-sm text-muted-foreground">Antrag zur fachlichen Prüfung übernehmen.</p>
                        <Button className="mt-4">In Prüfung setzen</Button>
                      </form>
                    ) : null}

                    {canApprove && booking.status === "IN_REVIEW" ? (
                      <form action={approveBookingAction} className="rounded-xl border border-emerald-500/20 bg-card p-4">
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <input type="hidden" name="status" value={selectedFilter} />
                        <label className="text-sm font-medium">
                          Kommentar (optional)
                          <textarea name="decisionNote" rows={3} className={textareaClass} />
                        </label>
                        <Button className="mt-4" variant="success">
                          Genehmigen
                        </Button>
                      </form>
                    ) : null}

                    {canReject && booking.status === "IN_REVIEW" ? (
                      <form action={rejectBookingAction} className="rounded-xl border border-rose-500/20 bg-card p-4">
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <input type="hidden" name="status" value={selectedFilter} />
                        <label className="text-sm font-medium">
                          Begründung (erforderlich)
                          <textarea name="decisionNote" rows={3} required className={textareaClass} />
                        </label>
                        <Button className="mt-4" variant="destructive">
                          Ablehnen
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </section>
    </>
  );
}
