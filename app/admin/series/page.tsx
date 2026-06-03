import { SeriesDataTable, type SeriesTableRow } from "@/components/phase25-data-tables";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBookingStatusLabel } from "@/lib/booking-status";
import { requirePermission } from "@/lib/permissions";
import { getBookingSeriesForAdmin } from "@/lib/services/booking-series-service";

const dateFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminSeriesPage() {
  await requirePermission("VIEW_BOOKINGS");
  const series = await getBookingSeriesForAdmin();
  const rows: SeriesTableRow[] = series.map((item) => ({
    id: item.id,
    title: `${item.title} (${item.recurrenceRule})`,
    organization: item.organization.name,
    room: `${item.room.building.name} - ${item.room.name} / ${item.usageType.name}`,
    period: `${dateFormatter.format(item.startsOn)} bis ${dateFormatter.format(item.endsOn)}`,
    occurrences:
      item.bookings.length === 0
        ? "Keine Termine"
        : item.bookings.map((booking) => `${dateFormatter.format(booking.startsAt)} · ${getBookingStatusLabel(booking.status)}`).join(", "),
  }));

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Serienbuchungen</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Serienanträge</h2>
      <p className="mt-3 text-muted-foreground">
        Lesende Übersicht der wöchentlichen Serien. Ganze Serien werden in Version 1 nicht gesammelt geändert; einzelne
        Termine bleiben normale Buchungsanträge im Genehmigungsworkflow.
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
