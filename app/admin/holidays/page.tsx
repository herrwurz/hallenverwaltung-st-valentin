import { createHolidayPeriodAction } from "@/app/admin/holidays/actions";
import { AppFeedback } from "@/components/app-feedback";
import { HolidaysDataTable, type HolidayTableRow } from "@/components/phase25-data-tables";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";
import {
  getHolidayAdministrationData,
  getHolidayScopeLabel,
  getHolidayStatusLabel,
  holidayCountryOptions,
  holidayRegionOptions,
} from "@/lib/services/holiday-service";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";
const dateFormatter = new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" });

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function AdminHolidaysPage({ searchParams }: PageProps) {
  await requirePermission("BLOCK_ROOM");
  const [params, holidays] = await Promise.all([searchParams, getHolidayAdministrationData()]);
  const holidayRows: HolidayTableRow[] = holidays.map((holiday) => ({
    id: holiday.id,
    name: holiday.name,
    period: `${getHolidayScopeLabel(holiday.countryCode, holiday.regionCode)} | ${dateFormatter.format(holiday.startsOn)} bis ${dateFormatter.format(holiday.endsOn)}`,
    status: getHolidayStatusLabel(holiday.defaultStatus),
    visibility: holiday.isPublic ? "Sichtbar" : "Intern",
    reason: holiday.reason,
  }));

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Ferienlogik</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Ferien und Feiertage</h2>
      <p className="mt-3 text-muted-foreground">
        Konfigurierbare Ferien-, Feiertags- und schulautonome Zeiträume für Serienbuchungen. Geschlossene Zeiträume
        werden bei neuen Serienanträgen übersprungen, eingeschränkte Zeiträume als Hinweis angezeigt.
      </p>

      <AppFeedback
        messages={[
          { tone: "error", text: params.error },
          { tone: "success", text: params.saved ? "Ferienzeitraum wurde gespeichert." : undefined },
        ]}
      />

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
              Land
              <select name="countryCode" required defaultValue="AT" className={inputClass}>
                {holidayCountryOptions.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Bundesland
              <select name="regionCode" defaultValue="" className={inputClass}>
                <option value="">Bundesweit / nicht eingeschränkt</option>
                {holidayRegionOptions.map((region) => (
                  <option key={region.code} value={region.code}>
                    {region.label}
                  </option>
                ))}
              </select>
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
            <HolidaysDataTable rows={holidayRows} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
