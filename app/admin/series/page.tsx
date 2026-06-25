import {
  approveSeriesFromSeriesPageAction,
  markSeriesInReviewFromSeriesPageAction,
  rejectSeriesFromSeriesPageAction,
} from "@/app/admin/series/actions";
import { AppFeedback } from "@/components/app-feedback";
import { SeriesDataTable, type SeriesTableRow } from "@/components/phase25-data-tables";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBookingStatusBadgeClass, getBookingStatusLabel } from "@/lib/booking-status";
import { hasPermission, requirePermission } from "@/lib/permissions";
import { getBookingSeriesForAdmin } from "@/lib/services/booking-series-service";

const dateFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

const textareaClass = "mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";

function formatRecurrenceRule(rule: string) {
  const parts = new URLSearchParams(rule.replaceAll(";", "&"));
  const frequency = parts.get("FREQ");
  const interval = Number(parts.get("INTERVAL") ?? "1");
  const excluded = parts.get("EXDATE")?.split(",").filter(Boolean).length ?? 0;
  const excludedLabel = excluded > 0 ? `, ${excluded} Ausnahmedaten` : "";

  if (frequency === "DAILY") {
    return `${Number.isFinite(interval) && interval > 1 ? `alle ${interval} Tage` : "täglich"}${excludedLabel}`;
  }

  if (frequency === "WEEKLY") {
    const intervalLabel = Number.isFinite(interval) && interval > 1 ? `alle ${interval} Wochen` : "wöchentlich";
    return `${intervalLabel}${excludedLabel}`;
  }

  if (frequency === "MONTHLY") {
    const intervalLabel = Number.isFinite(interval) && interval > 1 ? `alle ${interval} Monate` : "monatlich";
    return `${intervalLabel}${excludedLabel}`;
  }

  if (frequency === "YEARLY") {
    const intervalLabel = Number.isFinite(interval) && interval > 1 ? `alle ${interval} Jahre` : "jährlich";
    return `${intervalLabel}${excludedLabel}`;
  }

  return "Serienregel";
}

function getSeriesStatus(bookings: Array<{ status: string }>) {
  if (bookings.length === 0) {
    return { label: "Keine Termine", tone: "secondary" as const };
  }

  if (bookings.every((booking) => booking.status === "APPROVED")) {
    return { label: "Komplett genehmigt", tone: "success" as const };
  }

  if (bookings.every((booking) => booking.status === "CANCELLED" || booking.status === "REJECTED")) {
    return { label: "Komplett storniert/abgelehnt", tone: "destructive" as const };
  }

  return { label: "Teilweise offen", tone: "warning" as const };
}

type PageProps = {
  searchParams: Promise<{
    error?: string;
    seriesReviewed?: string;
    seriesApproved?: string;
    seriesRejected?: string;
    seriesId?: string;
  }>;
};

export default async function AdminSeriesPage({ searchParams }: PageProps) {
  const user = await requirePermission("VIEW_BOOKINGS");
  const params = await searchParams;
  const [canApprove, canReject, series] = await Promise.all([
    hasPermission(user.id, "APPROVE_BOOKING"),
    hasPermission(user.id, "REJECT_BOOKING"),
    getBookingSeriesForAdmin(),
  ]);

  const rows: SeriesTableRow[] = series.map((item) => {
    const status = getSeriesStatus(item.bookings);

    return {
      id: item.id,
      title: item.title,
      recurrence: formatRecurrenceRule(item.recurrenceRule),
      statusLabel: status.label,
      statusTone: status.tone,
      organization: item.organization.name,
      room: `${item.room.building.name} - ${item.room.name} / ${item.usageType.name}`,
      period: `${dateFormatter.format(item.startsOn)} bis ${dateFormatter.format(item.endsOn)}`,
      occurrences:
        item.bookings.length === 0
          ? "Keine Termine"
          : item.bookings.map((booking) => `${dateFormatter.format(booking.startsAt)} · ${getBookingStatusLabel(booking.status)}`).join(", "),
    };
  });

  const openSeries = series.filter((item) =>
    item.bookings.some((b) => b.status === "REQUESTED" || b.status === "IN_REVIEW"),
  );

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Serienbuchungen</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Serienanträge</h2>
      <p className="mt-3 text-muted-foreground">
        Übersicht der Serien mit Genehmigungsworkflow. Serien mit offenen Terminen können direkt gesamt genehmigt oder
        abgelehnt werden.
      </p>

      <AppFeedback
        messages={[
          { tone: "error", text: params.error },
          { tone: "info", text: params.seriesReviewed },
          { tone: "success", text: params.seriesApproved },
          { tone: "success", text: params.seriesRejected },
        ]}
      />

      <Card className="mt-8">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Serienübersicht</CardTitle>
              <CardDescription>Organisation, Standort, Zeitraum und erzeugte Einzeltermine.</CardDescription>
            </div>
            <Badge variant="outline">{series.length} Serien</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted p-5 text-sm text-muted-foreground">
              Noch keine Serien vorhanden.
            </p>
          ) : (
            <SeriesDataTable rows={rows} />
          )}
        </CardContent>
      </Card>

      {(canApprove || canReject) && openSeries.length > 0 ? (
        <section className="mt-8">
          <h3 className="text-xl font-semibold tracking-tight">Serien mit offenen Terminen</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Die folgenden Serien enthalten noch beantragte oder in Prüfung befindliche Termine.
          </p>
          <div className="mt-4 space-y-4">
            {openSeries.map((item) => {
              const requestedCount = item.bookings.filter((b) => b.status === "REQUESTED").length;
              const inReviewCount = item.bookings.filter((b) => b.status === "IN_REVIEW").length;
              const openCount = requestedCount + inReviewCount;

              return (
                <Card key={item.id} className={params.seriesId === item.id ? "ring-2 ring-primary" : ""}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-primary">{item.organization.name}</p>
                        <CardTitle className="mt-1">{item.title}</CardTitle>
                        <CardDescription>
                          {item.room.building.name} – {item.room.name} | {item.usageType.name} |{" "}
                          {formatRecurrenceRule(item.recurrenceRule)}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">{openCount} offen</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <section className="rounded-xl border border-border bg-muted/40 p-4">
                      <h4 className="text-sm font-medium">Termine</h4>
                      <ul className="mt-3 space-y-1">
                        {item.bookings.map((booking) => (
                          <li key={booking.id} className="flex items-center gap-3 text-sm">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs leading-none ${getBookingStatusBadgeClass(booking.status)}`}
                            >
                              {getBookingStatusLabel(booking.status)}
                            </span>
                            <span className="text-muted-foreground">
                              {dateFormatter.format(booking.startsAt)} bis {dateFormatter.format(booking.endsAt)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>

                    <section className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <h4 className="text-sm font-medium">Gesamt bearbeiten</h4>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Betrifft alle offenen Serientermine. Jeder Termin wird einzeln geprüft und historisiert.
                      </p>
                      <div className="mt-4 grid gap-4 lg:grid-cols-3">
                        {canApprove && requestedCount > 0 ? (
                          <form action={markSeriesInReviewFromSeriesPageAction} className="rounded-xl border border-border bg-card p-4">
                            <input type="hidden" name="seriesId" value={item.id} />
                            <p className="text-sm text-muted-foreground">
                              {requestedCount} beantragten {requestedCount === 1 ? "Termin" : "Termine"} in Prüfung setzen.
                            </p>
                            <Button type="submit" className="mt-4">
                              Serie in Prüfung
                            </Button>
                          </form>
                        ) : null}

                        {canApprove ? (
                          <form action={approveSeriesFromSeriesPageAction} className="rounded-xl border border-emerald-500/20 bg-card p-4">
                            <input type="hidden" name="seriesId" value={item.id} />
                            <label className="mb-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
                              <input name="allowClosureOverride" type="checkbox" className="mt-1 rounded border-input bg-background" />
                              <span>
                                <span className="block font-medium">Sperren als Ausnahme genehmigen</span>
                                <span className="mt-1 block text-xs text-muted-foreground">
                                  Nur anwenden wenn Sperrkonflikte gewollt überschrieben werden sollen.
                                </span>
                              </span>
                            </label>
                            <label className="text-sm font-medium">
                              Kommentar
                              <textarea name="decisionNote" rows={3} className={textareaClass} />
                            </label>
                            <Button type="submit" className="mt-4" variant="success">
                              Gesamt genehmigen
                            </Button>
                          </form>
                        ) : null}

                        {canReject ? (
                          <form action={rejectSeriesFromSeriesPageAction} className="rounded-xl border border-rose-500/20 bg-card p-4">
                            <input type="hidden" name="seriesId" value={item.id} />
                            <label className="text-sm font-medium">
                              Begründung (erforderlich)
                              <textarea name="decisionNote" rows={3} required className={textareaClass} />
                            </label>
                            <Button type="submit" className="mt-4" variant="destructive">
                              Gesamt ablehnen
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    </section>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}
