import { acknowledgeNoShowAction, reportNoShowAction } from "@/app/admin/no-shows/actions";
import { AppFeedback } from "@/components/app-feedback";
import { FormActions } from "@/components/form-actions";
import { StatusFilterSelect } from "@/components/status-filter-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getNoShowStatusBadgeClass, getNoShowStatusLabel } from "@/lib/no-show-status";
import { requirePermission } from "@/lib/permissions";
import { getAdminNoShowData } from "@/lib/services/no-show-service";

const dateFormatter = new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" });
const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";
const filterButtons = ["ALL", "REPORTED", "ACKNOWLEDGED"] as const;

type PageProps = {
  searchParams: Promise<{ status?: string; saved?: string; acknowledged?: string; error?: string }>;
};

export default async function AdminNoShowsPage({ searchParams }: PageProps) {
  const user = await requirePermission("REPORT_NO_SHOW");
  const params = await searchParams;
  const data = await getAdminNoShowData(user.id, params.status);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Hallenwart</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">No-Show-Meldungen</h2>
      <p className="mt-3 text-muted-foreground">
        Nichtnutzungen genehmigter Buchungen protokollieren. Keine Sanktionen, keine automatische Abrechnung und keine
        Statusänderung der Buchung in dieser Phase.
      </p>

      <AppFeedback
        messages={[
          { tone: "error", text: params.error },
          { tone: "success", text: params.saved ? "No-Show wurde gemeldet." : undefined },
          { tone: "success", text: params.acknowledged ? "No-Show wurde zur Kenntnis genommen." : undefined },
        ]}
      />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>No-Show melden</CardTitle>
          <CardDescription>Nur genehmigte und bereits beendete Buchungen können gemeldet werden.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.reportableBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aktuell sind keine abgeschlossenen genehmigten Buchungen für eine neue Meldung verfügbar.
            </p>
          ) : (
            <form action={reportNoShowAction} className="grid gap-4 lg:grid-cols-2">
              <label className="text-sm font-medium lg:col-span-2">
                Buchung
                <select name="bookingId" required defaultValue="" className={inputClass}>
                  <option value="" disabled>
                    Bitte wählen
                  </option>
                  {data.reportableBookings.map((booking) => (
                    <option key={booking.id} value={booking.id}>
                      {dateFormatter.format(booking.startsAt)} | {booking.organization.name} |{" "}
                      {booking.room.building.name} - {booking.room.name} | {booking.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium lg:col-span-2">
                Beschreibung
                <textarea name="description" rows={3} required maxLength={2000} className={inputClass} />
              </label>
              <div className="lg:col-span-2">
                <FormActions submitLabel="No-Show melden" cancelHref="/admin" />
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <StatusFilterSelect
        selectedValue={data.selectedStatus ?? "ALL"}
        options={filterButtons.map((filter) => ({
          value: filter,
          label: filter === "ALL" ? "Alle" : getNoShowStatusLabel(filter),
        }))}
      />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Gemeldete No-Shows</CardTitle>
          <CardDescription>Standort, Buchung, Meldung und Kenntnisnahme in einer Tabellenansicht.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.reports.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted p-5 text-sm text-muted-foreground">
              Für den gewählten Filter sind keine No-Show-Meldungen vorhanden.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Buchung</TableHead>
                    <TableHead>Gebäude / Raum</TableHead>
                    <TableHead>Meldung</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.reports.map((report) => (
                    <TableRow key={report.id} className="align-top">
                      <TableCell>
                        <p className="font-medium">{report.booking.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {dateFormatter.format(report.booking.startsAt)} bis {dateFormatter.format(report.booking.endsAt)}
                        </p>
                        <p className="text-xs text-muted-foreground">{report.organization.name}</p>
                      </TableCell>
                      <TableCell>
                        <p>{report.room.building.name}</p>
                        <p className="text-xs text-muted-foreground">{report.room.name}</p>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p>{report.description}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Gemeldet am {dateFormatter.format(report.reportedAt)} von{" "}
                          {report.reportedBy?.displayName ?? report.reportedBy?.email ?? "Unbekannt"}
                        </p>
                        {report.acknowledgedAt ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Zur Kenntnis genommen am {dateFormatter.format(report.acknowledgedAt)} von{" "}
                            {report.acknowledgedBy?.displayName ?? report.acknowledgedBy?.email ?? "Unbekannt"}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${getNoShowStatusBadgeClass(report.status)}`}>
                          {getNoShowStatusLabel(report.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {data.canAcknowledge && report.status === "REPORTED" ? (
                          <form action={acknowledgeNoShowAction}>
                            <input type="hidden" name="noShowReportId" value={report.id} />
                            <input type="hidden" name="status" value={params.status ?? ""} />
                            <Button size="sm" variant="outline">Zur Kenntnis nehmen</Button>
                          </form>
                        ) : (
                          <span className="text-xs text-muted-foreground">Keine Aktion</span>
                        )}
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
