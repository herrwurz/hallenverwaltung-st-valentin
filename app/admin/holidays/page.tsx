import { createHolidayPeriodAction } from "@/app/admin/holidays/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/permissions";
import { getHolidayAdministrationData, getHolidayStatusLabel } from "@/lib/services/holiday-service";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";
const dateFormatter = new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" });

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function AdminHolidaysPage({ searchParams }: PageProps) {
  await requirePermission("BLOCK_ROOM");
  const [params, holidays] = await Promise.all([searchParams, getHolidayAdministrationData()]);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Ferienlogik</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Ferien und Feiertage</h2>
      <p className="mt-3 text-muted-foreground">
        Konfigurierbare Ferien-, Feiertags- und schulautonome Zeiträume für Serienbuchungen. Geschlossene Zeiträume
        werden bei neuen Serienanträgen übersprungen, eingeschränkte Zeiträume als Hinweis angezeigt.
      </p>

      {params.error ? (
        <p className="mt-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">{params.error}</p>
      ) : null}
      {params.saved ? (
        <p className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          Ferienzeitraum wurde gespeichert.
        </p>
      ) : null}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Zeitraum erfassen</CardTitle>
          <CardDescription>Ferien, Feiertage oder schulautonome Tage mit Status und Sichtbarkeit speichern.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createHolidayPeriodAction} className="grid gap-4 lg:grid-cols-2">
            <label className="text-sm font-medium">
              Name
              <input name="name" required maxLength={160} className={inputClass} />
            </label>
            <label className="text-sm font-medium">
              Status
              <select name="defaultStatus" required defaultValue="CLOSED" className={inputClass}>
                <option value="OPEN">Geöffnet</option>
                <option value="RESTRICTED">Eingeschränkt</option>
                <option value="CLOSED">Gesperrt</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Beginn
              <input name="startsOn" type="datetime-local" required className={inputClass} />
            </label>
            <label className="text-sm font-medium">
              Ende
              <input name="endsOn" type="datetime-local" required className={inputClass} />
            </label>
            <label className="text-sm font-medium lg:col-span-2">
              Grund
              <textarea name="reason" rows={3} required maxLength={1000} className={inputClass} />
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-medium lg:col-span-2">
              <input name="isPublic" type="checkbox" defaultChecked className="rounded border-input bg-background" />
              Für Benutzer sichtbar
            </label>
            <div className="lg:col-span-2 lg:text-right">
              <Button>Zeitraum speichern</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Erfasste Zeiträume</CardTitle>
          <CardDescription>Ferien- und Feiertagslogik für Serienanträge.</CardDescription>
        </CardHeader>
        <CardContent>
          {holidays.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted p-5 text-sm text-muted-foreground">
              Noch keine Ferien- oder Feiertagszeiträume vorhanden.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Zeitraum</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sichtbarkeit</TableHead>
                    <TableHead>Grund</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map((holiday) => (
                    <TableRow key={holiday.id}>
                      <TableCell className="font-medium">{holiday.name}</TableCell>
                      <TableCell>
                        <p>{dateFormatter.format(holiday.startsOn)}</p>
                        <p className="text-xs text-muted-foreground">bis {dateFormatter.format(holiday.endsOn)}</p>
                      </TableCell>
                      <TableCell className="font-medium text-primary">{getHolidayStatusLabel(holiday.defaultStatus)}</TableCell>
                      <TableCell>{holiday.isPublic ? "Sichtbar" : "Intern"}</TableCell>
                      <TableCell className="max-w-md text-muted-foreground">{holiday.reason}</TableCell>
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
