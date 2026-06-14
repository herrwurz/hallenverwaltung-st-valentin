import {
  createHolidayClosureAction,
  createHolidayPeriodAction,
  importHolidayPresetAction,
} from "@/app/admin/holidays/actions";
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
  holidayPresetOptions,
  holidayPresetYearOptions,
  holidayRegionOptions,
} from "@/lib/services/holiday-service";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";
const dateFormatter = new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" });

type PageProps = {
  searchParams: Promise<{
    saved?: string;
    presetImported?: string;
    closureCreated?: string;
    created?: string;
    skipped?: string;
    error?: string;
  }>;
};

export default async function AdminHolidaysPage({ searchParams }: PageProps) {
  await requirePermission("BLOCK_ROOM");
  const [params, data] = await Promise.all([searchParams, getHolidayAdministrationData()]);
  const holidayRows: HolidayTableRow[] = data.holidays.map((holiday) => ({
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
        Ferien- und Feiertagszeitraeume sind Hinweisdaten fuer Serienbuchungen. Sie sperren keine Halle automatisch.
        Soll eine Halle tatsaechlich geschlossen werden, muss unten bewusst eine Gebaeude- oder Raumsperre erzeugt werden.
      </p>

      <AppFeedback
        messages={[
          { tone: "error", text: params.error },
          { tone: "success", text: params.saved ? "Ferienzeitraum wurde gespeichert." : undefined },
          { tone: "success", text: params.closureCreated ? "Sperre wurde aus Ferienzeitraum angelegt." : undefined },
          {
            tone: "success",
            text: params.presetImported
              ? `Vorlage uebernommen: ${params.created ?? "0"} neu, ${params.skipped ?? "0"} bereits vorhanden.`
              : undefined,
          },
        ]}
      />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Vorlagen übernehmen</CardTitle>
          <CardDescription>
            Legt oesterreichische Feiertage und Niederoesterreich-Schulferien als Ferienzeitraeume an. Standard ist
            geoeffnet, damit Ferien nicht automatisch Gebaeude oder Raeume sperren.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={importHolidayPresetAction} className="grid gap-4 lg:grid-cols-4">
            <label className="text-sm font-medium lg:col-span-2">
              Vorlage
              <select name="presetKey" required defaultValue="AT_NO_ALL" className={inputClass}>
                {holidayPresetOptions.map((preset) => (
                  <option key={preset.key} value={preset.key}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Jahr
              <select name="year" required defaultValue={new Date().getFullYear()} className={inputClass}>
                {holidayPresetYearOptions.map((year) => (
                  <option key={year.value} value={year.value}>
                    {year.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Serien-Hinweisstatus
              <select name="defaultStatus" required defaultValue="OPEN" className={inputClass}>
                <option value="OPEN">Geoeffnet</option>
                <option value="RESTRICTED">Eingeschraenkt</option>
                <option value="CLOSED">Fuer Serien ueberspringen</option>
              </select>
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-medium lg:col-span-3">
              <input name="isPublic" type="checkbox" defaultChecked className="rounded border-input bg-background" />
              Fuer Benutzer sichtbar
            </label>
            <div className="lg:text-right">
              <Button>Vorlage importieren</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Zeitraum erfassen</CardTitle>
          <CardDescription>Ferien, Feiertage oder schulautonome Tage mit Hinweisstatus und Sichtbarkeit speichern.</CardDescription>
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
                <option value="">Bundesweit / nicht eingeschraenkt</option>
                {holidayRegionOptions.map((region) => (
                  <option key={region.code} value={region.code}>
                    {region.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Serien-Hinweisstatus
              <select name="defaultStatus" required defaultValue="OPEN" className={inputClass}>
                <option value="OPEN">Geoeffnet</option>
                <option value="RESTRICTED">Eingeschraenkt</option>
                <option value="CLOSED">Fuer Serien ueberspringen</option>
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
              Fuer Benutzer sichtbar
            </label>
            <div className="lg:col-span-2 lg:text-right">
              <Button>Zeitraum speichern</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Aus Ferienzeitraum Hallensperre anlegen</CardTitle>
          <CardDescription>
            Diese Aktion erzeugt bewusst einen separaten Sperr-Datensatz fuer genau ein Gebaeude oder genau einen Raum.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.holidays.length === 0 ? (
            <p className="text-sm text-muted-foreground">Zuerst einen Ferienzeitraum anlegen oder importieren.</p>
          ) : (
            <form action={createHolidayClosureAction} className="grid gap-4 lg:grid-cols-2">
              <label className="text-sm font-medium">
                Ferienzeitraum
                <select name="holidayId" required defaultValue="" className={inputClass}>
                  <option value="" disabled>
                    Bitte waehlen
                  </option>
                  {data.holidays.map((holiday) => (
                    <option key={holiday.id} value={holiday.id}>
                      {holiday.name} ({dateFormatter.format(holiday.startsOn)} bis {dateFormatter.format(holiday.endsOn)})
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Gebaeude
                <select name="buildingId" defaultValue="" className={inputClass}>
                  <option value="">Keine Gebaeudesperre</option>
                  {data.buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Raum
                <select name="roomId" defaultValue="" className={inputClass}>
                  <option value="">Keine Raumsperre</option>
                  {data.buildings.flatMap((building) =>
                    building.rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {building.name} - {room.name}
                      </option>
                    )),
                  )}
                </select>
              </label>
              <label className="text-sm font-medium">
                Sperrstatus
                <select name="status" required defaultValue="CLOSED" className={inputClass}>
                  <option value="CLOSED">Gesperrt</option>
                  <option value="RESTRICTED">Eingeschraenkt</option>
                </select>
              </label>
              <label className="text-sm font-medium lg:col-span-2">
                Sperrgrund optional
                <input name="reason" maxLength={1000} className={inputClass} placeholder="Leer lassen, um Feriengrund zu uebernehmen" />
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-medium">
                <input name="isPublic" type="checkbox" defaultChecked className="rounded border-input bg-background" />
                Sperre sichtbar
              </label>
              <div className="lg:text-right">
                <Button>Sperre aus Ferienzeitraum anlegen</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Erfasste Zeitraeume</CardTitle>
          <CardDescription>Ferien- und Feiertagslogik fuer Serienantraege.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.holidays.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted p-5 text-sm text-muted-foreground">
              Noch keine Ferien- oder Feiertagszeitraeume vorhanden.
            </p>
          ) : (
            <HolidaysDataTable rows={holidayRows} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
