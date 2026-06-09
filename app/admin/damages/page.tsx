import { updateDamageStatusAction } from "@/app/admin/damages/actions";
import { AppFeedback } from "@/components/app-feedback";
import { StatusFilterSelect } from "@/components/status-filter-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDamageStatusBadgeClass, getDamageStatusLabel } from "@/lib/document-damage-labels";
import { requirePermission } from "@/lib/permissions";
import { getAdminDamageData } from "@/lib/services/damage-service";

const dateFormatter = new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" });
const selectClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";
const filterButtons = ["ALL", "REPORTED", "IN_REVIEW", "RESOLVED"] as const;

type PageProps = {
  searchParams: Promise<{ status?: string; saved?: string; error?: string }>;
};

export default async function AdminDamagesPage({ searchParams }: PageProps) {
  await requirePermission("MANAGE_DAMAGE");
  const params = await searchParams;
  const data = await getAdminDamageData(params.status);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Schäden</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Schadensmanagement</h2>
      <p className="mt-3 text-muted-foreground">
        Schadensmeldungen einsehen und den Bearbeitungsstatus aktualisieren. Hallenübergaben und Zutrittsverwaltung
        werden in eigenen Verwaltungsbereichen geführt.
      </p>
      <AppFeedback
        messages={[
          { tone: "error", text: params.error },
          { tone: "success", text: params.saved ? "Schadensmeldung wurde aktualisiert." : undefined },
        ]}
      />

      <StatusFilterSelect
        selectedValue={data.selectedStatus ?? "ALL"}
        options={filterButtons.map((filter) => ({
          value: filter,
          label: filter === "ALL" ? "Alle" : getDamageStatusLabel(filter),
        }))}
      />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Schadensmeldungen</CardTitle>
          <CardDescription>Standort, Meldung und Bearbeitungsstatus in einer Tabellenansicht.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.reports.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted p-5 text-sm text-muted-foreground">
              Für den gewählten Filter sind keine Schadensmeldungen vorhanden.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Gebäude / Raum</TableHead>
                    <TableHead>Meldung</TableHead>
                    <TableHead>Gemeldet</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Neuer Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.reports.map((report) => (
                    <TableRow key={report.id} className="align-top">
                      <TableCell>
                        <p className="font-medium">{report.room.building.name}</p>
                        <p className="text-xs text-muted-foreground">{report.room.name}</p>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p>{report.description}</p>
                        {report.photoStorageKey ? <p className="mt-2 text-xs text-muted-foreground">{report.photoStorageKey}</p> : null}
                        {report.resolvedAt ? (
                          <p className="mt-2 text-xs text-muted-foreground">Erledigt am {dateFormatter.format(report.resolvedAt)}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <p>{dateFormatter.format(report.reportedAt)}</p>
                        <p className="text-xs">{report.reportedBy?.displayName ?? report.reportedBy?.email ?? "Unbekannt"}</p>
                      </TableCell>
                      <TableCell>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${getDamageStatusBadgeClass(report.status)}`}>
                          {getDamageStatusLabel(report.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <form action={updateDamageStatusAction} className="flex min-w-64 items-end gap-2">
                          <input type="hidden" name="damageReportId" value={report.id} />
                          <input type="hidden" name="filter" value={params.status ?? ""} />
                          <label className="flex-1 text-xs font-medium">
                            Status
                            <select name="status" defaultValue={report.status} className={selectClass}>
                              <option value="REPORTED">Gemeldet</option>
                              <option value="IN_REVIEW">In Bearbeitung</option>
                              <option value="RESOLVED">Erledigt</option>
                            </select>
                          </label>
                          <Button size="sm">Speichern</Button>
                        </form>
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
