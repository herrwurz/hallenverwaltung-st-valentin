import { AppFeedback } from "@/components/app-feedback";
import { AdminBookingsTable, type AdminBookingTableRow } from "@/components/admin-bookings-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBookingStatusBadgeClass, getBookingStatusLabel, type AdminBookingFilterKey } from "@/lib/booking-status";
import { hasPermission, requirePermission } from "@/lib/permissions";
import {
  getAdminBookingFilterOptions,
  getBookingsForAdmin,
  resolveAdminBookingFilter,
} from "@/lib/services/booking-approval-service";
import {
  approveBookingAction,
  approveSeriesAction,
  markBookingInReviewAction,
  markSeriesInReviewAction,
  rejectBookingAction,
  rejectSeriesAction,
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

const textareaClass = "mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";

type PageProps = {
  searchParams: Promise<{
    status?: string;
    reviewed?: string;
    approved?: string;
    rejected?: string;
    seriesReviewed?: string;
    seriesApproved?: string;
    seriesRejected?: string;
    organizationId?: string;
    buildingId?: string;
    roomId?: string;
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
  const selectedOrganizationId = typeof params.organizationId === "string" && params.organizationId ? params.organizationId : "";
  const selectedBuildingId = typeof params.buildingId === "string" && params.buildingId ? params.buildingId : "";
  const selectedRoomId = typeof params.roomId === "string" && params.roomId ? params.roomId : "";
  const [canApprove, canReject, filterOptionsData, bookings] = await Promise.all([
    hasPermission(user.id, "APPROVE_BOOKING"),
    hasPermission(user.id, "REJECT_BOOKING"),
    getAdminBookingFilterOptions(user.id),
    getBookingsForAdmin(user.id, selectedFilter, {}, {
      organizationId: selectedOrganizationId || undefined,
      buildingId: selectedBuildingId || undefined,
      roomId: selectedRoomId || undefined,
    }),
  ]);
  const activeStatuses = new Set(resolveAdminBookingFilter(selectedFilter));
  const filterOptions: AdminBookingFilterKey[] = ["OPEN", "REQUESTED", "IN_REVIEW", "APPROVED", "REJECTED", "CANCELLED", "ALL"];
  const roomOptions = selectedBuildingId
    ? filterOptionsData.rooms.filter((room) => room.buildingId === selectedBuildingId)
    : filterOptionsData.rooms;
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

  // Buchungen in Einzeltermine und Serienblöcke aufteilen (Reihenfolge des ersten Termins beibehalten)
  type BookingItem = (typeof bookings)[number];
  type RenderItem =
    | { kind: "standalone"; booking: BookingItem }
    | { kind: "series"; seriesId: string; seriesTitle: string; items: BookingItem[] };

  const seenSeries = new Set<string>();
  const renderItems: RenderItem[] = [];
  for (const booking of bookings) {
    if (!booking.series) {
      renderItems.push({ kind: "standalone", booking });
    } else if (!seenSeries.has(booking.series.id)) {
      seenSeries.add(booking.series.id);
      const grouped = bookings
        .filter((b) => b.series?.id === booking.series!.id)
        .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
      renderItems.push({ kind: "series", seriesId: booking.series.id, seriesTitle: booking.series.title, items: grouped });
    }
  }

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
          { tone: "info", text: params.seriesReviewed },
          { tone: "success", text: params.seriesApproved },
          { tone: "success", text: params.seriesRejected },
        ]}
      />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Filter</CardTitle>
          <CardDescription>Standard ist die Arbeitsliste aus beantragten und in Prüfung befindlichen Anträgen.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" aria-label="Buchungsfilter">
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
            <label className="text-sm font-medium text-foreground">
              Organisation filtern
              <select
                name="organizationId"
                defaultValue={selectedOrganizationId}
                className="mt-1 min-w-72 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              >
                <option value="">Alle Organisationen</option>
                {filterOptionsData.organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-foreground">
              Gebäude filtern
              <select
                name="buildingId"
                defaultValue={selectedBuildingId}
                className="mt-1 min-w-72 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              >
                <option value="">Alle Gebäude</option>
                {filterOptionsData.buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-foreground">
              Raum filtern
              <select
                name="roomId"
                defaultValue={selectedRoomId}
                className="mt-1 min-w-72 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              >
                <option value="">Alle Räume</option>
                {roomOptions.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.building.name} - {room.name}
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
        {renderItems.map((item) => {
          if (item.kind === "standalone") {
            const booking = item.booking;
            const hasClosureConflict = booking.conflicts.some((c) => c.type === "CLOSURE" && c.severity === "blocking");
            return (
              <Card key={`${booking.id}-details`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{booking.title}</CardTitle>
                      <CardDescription>
                        {booking.organization.name} | {booking.room.building.name} - {booking.room.name} |{" "}
                        {dateFormatter.format(booking.startsAt)} bis {dateFormatter.format(booking.endsAt)}
                      </CardDescription>
                    </div>
                    <span className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-sm leading-none ${getBookingStatusBadgeClass(booking.status)}`}>
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
                              className={`rounded-lg border px-3 py-2 ${conflict.severity === "blocking" ? "border-rose-500/20 bg-destructive/10 text-rose-700" : "border-warning/35 bg-warning/15 text-warning-foreground"}`}
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
                        Beantragte Buchungen können direkt genehmigt oder abgelehnt werden.
                      </p>
                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        {canApprove && booking.status === "REQUESTED" ? (
                          <form action={markBookingInReviewAction} className="rounded-xl border border-border bg-card p-4">
                            <input type="hidden" name="bookingId" value={booking.id} />
                            <input type="hidden" name="status" value={selectedFilter} />
                            <input type="hidden" name="organizationId" value={selectedOrganizationId} />
                            <input type="hidden" name="buildingId" value={selectedBuildingId} />
                            <input type="hidden" name="roomId" value={selectedRoomId} />
                            <p className="text-sm text-muted-foreground">Antrag zur fachlichen Prüfung übernehmen.</p>
                            <Button type="submit" className="mt-4">In Prüfung setzen</Button>
                          </form>
                        ) : null}
                        {canApprove && (booking.status === "REQUESTED" || booking.status === "IN_REVIEW") ? (
                          <form action={approveBookingAction} className="rounded-xl border border-emerald-500/20 bg-card p-4">
                            <input type="hidden" name="bookingId" value={booking.id} />
                            <input type="hidden" name="status" value={selectedFilter} />
                            <input type="hidden" name="organizationId" value={selectedOrganizationId} />
                            <input type="hidden" name="buildingId" value={selectedBuildingId} />
                            <input type="hidden" name="roomId" value={selectedRoomId} />
                            {hasClosureConflict ? (
                              <label className="mb-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
                                <input name="allowClosureOverride" type="checkbox" className="mt-1 rounded border-input bg-background" />
                                <span>
                                  <span className="block font-medium">Sperre bewusst als Ausnahme genehmigen</span>
                                  <span className="mt-1 block text-xs text-muted-foreground">Nur für fachlich gewollte Ausnahmen verwenden. Ein Kommentar ist erforderlich.</span>
                                </span>
                              </label>
                            ) : null}
                            <label className="text-sm font-medium">
                              Kommentar
                              <textarea name="decisionNote" rows={3} required={hasClosureConflict} className={textareaClass} />
                            </label>
                            <Button type="submit" className="mt-4" variant="success">Genehmigen</Button>
                          </form>
                        ) : null}
                        {canReject && (booking.status === "REQUESTED" || booking.status === "IN_REVIEW") ? (
                          <form action={rejectBookingAction} className="rounded-xl border border-rose-500/20 bg-card p-4">
                            <input type="hidden" name="bookingId" value={booking.id} />
                            <input type="hidden" name="status" value={selectedFilter} />
                            <input type="hidden" name="organizationId" value={selectedOrganizationId} />
                            <input type="hidden" name="buildingId" value={selectedBuildingId} />
                            <input type="hidden" name="roomId" value={selectedRoomId} />
                            <label className="text-sm font-medium">
                              Begründung (erforderlich)
                              <textarea name="decisionNote" rows={3} required className={textareaClass} />
                            </label>
                            <Button type="submit" className="mt-4" variant="destructive">Ablehnen</Button>
                          </form>
                        ) : null}
                      </div>
                    </section>
                  ) : null}
                </CardContent>
              </Card>
            );
          }

          // Serienblock
          const firstBooking = item.items[0]!;
          const openItems = item.items.filter((b) => b.status === "REQUESTED" || b.status === "IN_REVIEW");
          const requestedCount = openItems.filter((b) => b.status === "REQUESTED").length;
          const seriesHasClosureConflict = item.items.some((b) =>
            b.conflicts.some((c) => c.type === "CLOSURE" && c.severity === "blocking"),
          );

          return (
            <Card key={`series-${item.seriesId}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-primary">{firstBooking.organization.name}</p>
                    <CardTitle>{item.seriesTitle}</CardTitle>
                    <CardDescription>
                      {firstBooking.room.building.name} – {firstBooking.room.name} | {firstBooking.usageType.name}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{item.items.length} Termine</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {item.items.map((booking) => {
                    const hasClosureConflict = booking.conflicts.some((c) => c.type === "CLOSURE" && c.severity === "blocking");
                    const isOpen = booking.status === "REQUESTED" || booking.status === "IN_REVIEW";
                    return (
                      <div key={booking.id} className="rounded-xl border border-border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-medium">
                            {dateFormatter.format(booking.startsAt)} bis {dateFormatter.format(booking.endsAt)}
                          </p>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs leading-none ${getBookingStatusBadgeClass(booking.status)}`}>
                            {getBookingStatusLabel(booking.status)}
                          </span>
                        </div>
                        {booking.conflicts.length > 0 ? (
                          <ul className="mt-2 space-y-1">
                            {booking.conflicts.map((conflict, index) => (
                              <li
                                key={index}
                                className={`rounded-lg border px-3 py-2 text-sm ${conflict.severity === "blocking" ? "border-rose-500/20 bg-destructive/10 text-rose-700" : "border-warning/35 bg-warning/15 text-warning-foreground"}`}
                              >
                                <span className="font-medium">{conflict.severity === "blocking" ? "Blockierend" : "Soft-Konflikt"}:</span>{" "}
                                {conflict.message}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {(canApprove || canReject) && isOpen ? (
                          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {canApprove && booking.status === "REQUESTED" ? (
                              <form action={markBookingInReviewAction} className="rounded-lg border border-border bg-muted/30 p-3">
                                <input type="hidden" name="bookingId" value={booking.id} />
                                <input type="hidden" name="status" value={selectedFilter} />
                                <input type="hidden" name="organizationId" value={selectedOrganizationId} />
                                <input type="hidden" name="buildingId" value={selectedBuildingId} />
                                <input type="hidden" name="roomId" value={selectedRoomId} />
                                <Button type="submit" size="sm">In Prüfung setzen</Button>
                              </form>
                            ) : null}
                            {canApprove && isOpen ? (
                              <form action={approveBookingAction} className="rounded-lg border border-emerald-500/20 bg-muted/30 p-3">
                                <input type="hidden" name="bookingId" value={booking.id} />
                                <input type="hidden" name="status" value={selectedFilter} />
                                <input type="hidden" name="organizationId" value={selectedOrganizationId} />
                                <input type="hidden" name="buildingId" value={selectedBuildingId} />
                                <input type="hidden" name="roomId" value={selectedRoomId} />
                                {hasClosureConflict ? (
                                  <label className="mb-2 flex items-start gap-2 rounded border border-warning/30 bg-warning/10 p-2 text-xs">
                                    <input name="allowClosureOverride" type="checkbox" className="mt-0.5 rounded border-input bg-background" />
                                    <span>Sperre als Ausnahme genehmigen</span>
                                  </label>
                                ) : null}
                                <label className="block text-xs font-medium">
                                  Kommentar
                                  <textarea name="decisionNote" rows={2} required={hasClosureConflict} className={textareaClass} />
                                </label>
                                <Button type="submit" size="sm" className="mt-2" variant="success">Genehmigen</Button>
                              </form>
                            ) : null}
                            {canReject && isOpen ? (
                              <form action={rejectBookingAction} className="rounded-lg border border-rose-500/20 bg-muted/30 p-3">
                                <input type="hidden" name="bookingId" value={booking.id} />
                                <input type="hidden" name="status" value={selectedFilter} />
                                <input type="hidden" name="organizationId" value={selectedOrganizationId} />
                                <input type="hidden" name="buildingId" value={selectedBuildingId} />
                                <input type="hidden" name="roomId" value={selectedRoomId} />
                                <label className="block text-xs font-medium">
                                  Begründung (erforderlich)
                                  <textarea name="decisionNote" rows={2} required className={textareaClass} />
                                </label>
                                <Button type="submit" size="sm" className="mt-2" variant="destructive">Ablehnen</Button>
                              </form>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {(canApprove || canReject) && openItems.length > 0 ? (
                  <section className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <h4 className="text-sm font-medium">Ganze Serie bearbeiten</h4>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Betrifft alle {openItems.length} offenen Serientermine. Jeder Termin wird einzeln geprüft und historisiert.
                    </p>
                    <div className="mt-4 grid gap-4 lg:grid-cols-3">
                      {canApprove && requestedCount > 0 ? (
                        <form action={markSeriesInReviewAction} className="rounded-xl border border-border bg-card p-4">
                          <input type="hidden" name="seriesId" value={item.seriesId} />
                          <input type="hidden" name="status" value={selectedFilter} />
                          <input type="hidden" name="organizationId" value={selectedOrganizationId} />
                          <input type="hidden" name="buildingId" value={selectedBuildingId} />
                          <input type="hidden" name="roomId" value={selectedRoomId} />
                          <p className="text-sm text-muted-foreground">{requestedCount} beantragten Termin(e) in Prüfung setzen.</p>
                          <Button type="submit" className="mt-4">Serie in Prüfung</Button>
                        </form>
                      ) : null}
                      {canApprove ? (
                        <form action={approveSeriesAction} className="rounded-xl border border-emerald-500/20 bg-card p-4">
                          <input type="hidden" name="seriesId" value={item.seriesId} />
                          <input type="hidden" name="status" value={selectedFilter} />
                          <input type="hidden" name="organizationId" value={selectedOrganizationId} />
                          <input type="hidden" name="buildingId" value={selectedBuildingId} />
                          <input type="hidden" name="roomId" value={selectedRoomId} />
                          {seriesHasClosureConflict ? (
                            <label className="mb-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
                              <input name="allowClosureOverride" type="checkbox" className="mt-1 rounded border-input bg-background" />
                              <span>
                                <span className="block font-medium">Sperren für Serie bewusst als Ausnahme genehmigen</span>
                                <span className="mt-1 block text-xs text-muted-foreground">
                                  Wird nur auf Serientermine angewendet, deren harter Konflikt ausschließlich eine Sperre ist.
                                </span>
                              </span>
                            </label>
                          ) : null}
                          <label className="text-sm font-medium">
                            Kommentar
                            <textarea name="decisionNote" rows={3} required={seriesHasClosureConflict} className={textareaClass} />
                          </label>
                          <Button type="submit" className="mt-4" variant="success">Serie genehmigen</Button>
                        </form>
                      ) : null}
                      {canReject ? (
                        <form action={rejectSeriesAction} className="rounded-xl border border-rose-500/20 bg-card p-4">
                          <input type="hidden" name="seriesId" value={item.seriesId} />
                          <input type="hidden" name="status" value={selectedFilter} />
                          <input type="hidden" name="organizationId" value={selectedOrganizationId} />
                          <input type="hidden" name="buildingId" value={selectedBuildingId} />
                          <input type="hidden" name="roomId" value={selectedRoomId} />
                          <label className="text-sm font-medium">
                            Begründung (erforderlich)
                            <textarea name="decisionNote" rows={3} required className={textareaClass} />
                          </label>
                          <Button type="submit" className="mt-4" variant="destructive">Serie ablehnen</Button>
                        </form>
                      ) : null}
                    </div>
                  </section>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </section>
    </>
  );
}
