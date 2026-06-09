import { SeriesDataTable, type SeriesTableRow } from "@/components/phase25-data-tables";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBookingStatusLabel } from "@/lib/booking-status";
import { requirePermission } from "@/lib/permissions";
import { getBookingSeriesForAdmin } from "@/lib/services/booking-series-service";

const dateFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

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

export default async function AdminSeriesPage() {
  await requirePermission("VIEW_BOOKINGS");
  const series = await getBookingSeriesForAdmin();
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

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Serienbuchungen</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Serienanträge</h2>
      <p className="mt-3 text-muted-foreground">
        Lesende Übersicht der Serien. Ganze Serien werden in der nächsten Ausbaustufe fachlich zusammenhängend geprüft;
        einzelne erzeugte Termine bleiben bis dahin normale Buchungsanträge im Genehmigungsworkflow.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Serienübersicht</CardTitle>
          <CardDescription>Organisation, Standort, Zeitraum und erzeugte Einzeltermine.</CardDescription>
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
    </>
  );
}
