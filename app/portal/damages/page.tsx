import { reportDamageAction } from "@/app/portal/damages/actions";
import { AppBackLink } from "@/components/app-back-link";
import { AppFeedback } from "@/components/app-feedback";
import { BuildingRoomSelect } from "@/components/building-room-select";
import { FormActions } from "@/components/form-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDamageStatusBadgeClass, getDamageStatusLabel } from "@/lib/document-damage-labels";
import { requirePermission } from "@/lib/permissions";
import { getPortalDamageData } from "@/lib/services/damage-service";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";
const dateFormatter = new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" });

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function PortalDamagesPage({ searchParams }: PageProps) {
  const user = await requirePermission("REPORT_DAMAGE");
  const [params, data] = await Promise.all([searchParams, getPortalDamageData(user.id)]);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Portal</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Schadensmeldungen</h2>
      <p className="mt-3 text-muted-foreground">
        Melden Sie Schäden mit Beschreibung und optionalem Foto-Ablagepfad. Die Gemeinde bearbeitet den Status.
      </p>
      <div className="mt-8 flex items-center justify-between">
        <AppBackLink href="/portal" label="Zurück zum Portal" />
      </div>
      <AppFeedback
        messages={[
          { tone: "error", text: params.error },
          { tone: "success", text: params.saved ? "Schadensmeldung wurde gespeichert." : undefined },
        ]}
      />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Neuen Schaden melden</CardTitle>
          <CardDescription>Gebäude und Raum auswählen, Beschreibung erfassen und optional einen Foto-Ablagepfad ergänzen.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={reportDamageAction} className="grid gap-4 lg:grid-cols-2">
            <BuildingRoomSelect buildings={data.buildings} inputClassName={inputClass} />
            <label className="text-sm font-medium">
              Foto-Ablagepfad optional
              <input name="photoStorageKey" className={inputClass} placeholder="damages/foto-001.jpg" />
            </label>
            <label className="text-sm font-medium lg:col-span-2">
              Beschreibung
              <textarea name="description" rows={4} required className={inputClass} />
            </label>
            <div className="lg:col-span-2">
              <FormActions submitLabel="Schaden melden" cancelHref="/portal" />
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Ihre Schadensmeldungen</CardTitle>
          <CardDescription>Status und Bearbeitung je gemeldetem Standort.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.reports.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted p-5 text-sm text-muted-foreground">
              Sie haben noch keine Schäden gemeldet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table className="min-w-[820px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Gebäude / Raum</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead>Gemeldet</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bearbeitung</TableHead>
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
                      </TableCell>
                      <TableCell className="text-muted-foreground">{dateFormatter.format(report.reportedAt)}</TableCell>
                      <TableCell>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${getDamageStatusBadgeClass(report.status)}`}>
                          {getDamageStatusLabel(report.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {report.processedBy ? report.processedBy.displayName ?? report.processedBy.email : "Noch offen"}
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
