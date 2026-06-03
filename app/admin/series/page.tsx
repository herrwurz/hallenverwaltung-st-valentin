import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBookingStatusBadgeClass, getBookingStatusLabel } from "@/lib/booking-status";
import { requirePermission } from "@/lib/permissions";
import { getBookingSeriesForAdmin } from "@/lib/services/booking-series-service";

const dateFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminSeriesPage() {
  await requirePermission("VIEW_BOOKINGS");
  const series = await getBookingSeriesForAdmin();

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Serienbuchungen</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Serienanträge</h2>
      <p className="mt-3 text-muted-foreground">
        Lesende Übersicht der wöchentlichen Serien. Ganze Serien werden in Version 1 nicht gesammelt geändert;
        einzelne Termine bleiben normale Buchungsanträge im Genehmigungsworkflow.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Serienübersicht</CardTitle>
          <CardDescription>Organisation, Standort, Zeitraum und erzeugte Einzeltermine.</CardDescription>
        </CardHeader>
        <CardContent>
          {series.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted p-5 text-sm text-muted-foreground">
              Noch keine Serien vorhanden.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Serie</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Gebäude / Raum</TableHead>
                    <TableHead>Zeitraum</TableHead>
                    <TableHead>Einzeltermine</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {series.map((item) => (
                    <TableRow key={item.id} className="align-top">
                      <TableCell>
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-1 max-w-sm truncate text-xs text-muted-foreground">{item.recurrenceRule}</p>
                      </TableCell>
                      <TableCell>{item.organization.name}</TableCell>
                      <TableCell>
                        <p>{item.room.building.name}</p>
                        <p className="text-xs text-muted-foreground">{item.room.name}</p>
                        <p className="text-xs text-muted-foreground">{item.usageType.name}</p>
                      </TableCell>
                      <TableCell>
                        <p>{dateFormatter.format(item.startsOn)}</p>
                        <p className="text-xs text-muted-foreground">bis {dateFormatter.format(item.endsOn)}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-md flex-wrap gap-2">
                          {item.bookings.length === 0 ? (
                            <Badge variant="outline">Keine Termine</Badge>
                          ) : (
                            item.bookings.map((booking) => (
                              <span key={booking.id} className={`rounded-full px-2 py-1 text-xs ${getBookingStatusBadgeClass(booking.status)}`}>
                                {dateFormatter.format(booking.startsAt)} · {getBookingStatusLabel(booking.status)}
                              </span>
                            ))
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
