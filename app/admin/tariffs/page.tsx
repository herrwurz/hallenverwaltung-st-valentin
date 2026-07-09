import {
  activateTariffAction,
  deactivateTariffAction,
  deleteTariffAction,
  endTariffAction,
  saveTariffAction,
  saveTariffGroupAction,
} from "@/app/admin/tariffs/actions";
import { AdminBackLink } from "@/components/admin-back-link";
import { AdminDeleteForm } from "@/components/admin-delete-form";
import { AdminFeedback } from "@/components/admin-feedback";
import { FormActions } from "@/components/form-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/permissions";
import { getTariffAdministrationData } from "@/lib/services/admin/tariff-service";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";

const dayTypeLabels: Record<string, string> = {
  ALL: "Alle Tage",
  WEEKDAY: "Mo–Fr",
  WEEKEND: "Sa/So",
  HOLIDAY: "Feiertag",
};

const currencyFormatter = new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR" });
const dateFormatter = new Intl.DateTimeFormat("de-AT", { dateStyle: "medium" });

function getTariffStatus(tariff: { isActive: boolean; validUntil: Date | null }, now: Date) {
  if (!tariff.isActive) {
    return { label: "Inaktiv", variant: "secondary" as const };
  }
  if (tariff.validUntil !== null && tariff.validUntil < now) {
    return { label: "Beendet", variant: "secondary" as const };
  }
  return { label: "Aktiv", variant: "success" as const };
}

function toDateInputValue(date: Date | null) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type AdministrationData = Awaited<ReturnType<typeof getTariffAdministrationData>>;

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string; roomId?: string; tariffGroupId?: string }>;
};

export default async function TariffsPage({ searchParams }: PageProps) {
  await requirePermission("MANAGE_TARIFFS");
  const [params, data] = await Promise.all([searchParams, getTariffAdministrationData()]);

  const filteredTariffs = data.tariffs.filter(
    (tariff) =>
      (!params.roomId || tariff.room.id === params.roomId) &&
      (!params.tariffGroupId || tariff.tariffGroup.id === params.tariffGroupId),
  );
  const now = new Date();

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Stammdaten</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Tarife</h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Jede Organisation gehört zu genau einer Tarifgruppe. Der Preis einer Buchung ergibt sich aus Raum,
        Tarifgruppe und Tagesart. Ohne Angabe von Nutzungstyp oder Organisationsart gilt ein Tarif für alle;
        spezifischere Tarife gehen vor. Feiertage verwenden automatisch den Wochenendtarif, falls kein eigener
        Feiertagstarif existiert.
      </p>
      <AdminBackLink />
      <div className="mt-8">
        <AdminFeedback {...params} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tarifgruppen</CardTitle>
          <CardDescription>
            Preiskategorien, denen Organisationen zugeordnet werden (Zuordnung unter Stammdaten → Organisationen).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {data.tariffGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Tarifgruppen vorhanden.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead className="text-right">Organisationen</TableHead>
                  <TableHead className="text-right">Tarife</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.tariffGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell className="text-muted-foreground">{group.code}</TableCell>
                    <TableCell className="text-muted-foreground">{group.description ?? "–"}</TableCell>
                    <TableCell className="text-right">{group._count.organizations}</TableCell>
                    <TableCell className="text-right">{group._count.tariffs}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <details className="rounded-xl border border-border p-4">
            <summary className="cursor-pointer text-sm font-medium">Neue Tarifgruppe anlegen</summary>
            <form action={saveTariffGroupAction} className="mt-4 grid gap-4 lg:grid-cols-3">
              <label className="text-sm font-medium">
                Code
                <input name="code" required className={inputClass} placeholder="z.B. ORTSVEREIN" />
              </label>
              <label className="text-sm font-medium">
                Name
                <input name="name" required maxLength={120} className={inputClass} placeholder="z.B. Ortsverein" />
              </label>
              <label className="text-sm font-medium">
                Beschreibung (optional)
                <input name="description" maxLength={500} className={inputClass} />
              </label>
              <div className="lg:col-span-3">
                <FormActions submitLabel="Tarifgruppe anlegen" cancelHref="/admin/tariffs" />
              </div>
            </form>
          </details>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Neuer Tarif</CardTitle>
          <CardDescription>
            Stundensatz oder Pauschale je Raum, Tarifgruppe und Tagesart. Felder ohne Auswahl gelten für alle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TariffForm data={data} />
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Tarifübersicht</CardTitle>
          <CardDescription>Alle Tarife, filterbar nach Raum und Tarifgruppe.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-medium">
              Raum
              <select name="roomId" defaultValue={params.roomId ?? ""} className={inputClass}>
                <option value="">Alle Räume</option>
                {data.buildings.map((building) =>
                  building.rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {building.name} – {room.name}
                    </option>
                  )),
                )}
              </select>
            </label>
            <label className="text-sm font-medium">
              Tarifgruppe
              <select name="tariffGroupId" defaultValue={params.tariffGroupId ?? ""} className={inputClass}>
                <option value="">Alle Tarifgruppen</option>
                {data.tariffGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button type="submit" className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm">
                Filtern
              </button>
            </div>
          </form>

          {filteredTariffs.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted p-5 text-sm text-muted-foreground">
              Keine Tarife für die gewählten Filter vorhanden.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Raum</TableHead>
                  <TableHead>Tarifgruppe</TableHead>
                  <TableHead>Tagesart</TableHead>
                  <TableHead>Nutzungstyp</TableHead>
                  <TableHead>Organisationsart</TableHead>
                  <TableHead className="text-right">Satz</TableHead>
                  <TableHead>Gültigkeit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTariffs.map((tariff) => {
                  const status = getTariffStatus(tariff, now);
                  return (
                    <TableRow key={tariff.id}>
                      <TableCell className="font-medium">
                        {tariff.room.building.name} – {tariff.room.name}
                      </TableCell>
                      <TableCell>{tariff.tariffGroup.name}</TableCell>
                      <TableCell>{dayTypeLabels[tariff.dayType] ?? tariff.dayType}</TableCell>
                      <TableCell>{tariff.usageType?.name ?? "Alle"}</TableCell>
                      <TableCell>{tariff.organizationType?.name ?? "Alle"}</TableCell>
                      <TableCell className="text-right">
                        {tariff.flatRate !== null
                          ? `${currencyFormatter.format(Number(tariff.flatRate))} pauschal`
                          : `${currencyFormatter.format(Number(tariff.hourlyRate ?? 0))}/h`}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {dateFormatter.format(tariff.validFrom)}
                        {" – "}
                        {tariff.validUntil ? dateFormatter.format(tariff.validUntil) : "unbefristet"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <section className="mt-8 space-y-4">
        <h3 className="text-xl font-semibold tracking-tight">Tarife bearbeiten</h3>
        {filteredTariffs.map((tariff) => (
          <Card key={tariff.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{tariff.name}</CardTitle>
                  <CardDescription>
                    {tariff.room.building.name} – {tariff.room.name} | {tariff.tariffGroup.name} |{" "}
                    {dayTypeLabels[tariff.dayType] ?? tariff.dayType}
                  </CardDescription>
                </div>
                <Badge variant={getTariffStatus(tariff, now).variant}>{getTariffStatus(tariff, now).label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <TariffForm data={data} tariff={tariff} />
              <details className="rounded-xl border border-border p-4">
                <summary className="cursor-pointer text-sm font-medium">Tarif beenden, deaktivieren oder löschen</summary>
                <div className="mt-4 space-y-4">
                  <form action={endTariffAction} className="flex flex-wrap items-end gap-4">
                    <input type="hidden" name="id" value={tariff.id} />
                    <label className="text-sm font-medium">
                      Gültig bis
                      <input name="validUntil" type="date" required className={inputClass} />
                    </label>
                    <FormActions submitLabel="Tarif beenden" cancelHref="/admin/tariffs" />
                  </form>
                  <form action={tariff.isActive ? deactivateTariffAction : activateTariffAction} className="border-t pt-4">
                    <input type="hidden" name="id" value={tariff.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium shadow-sm"
                    >
                      {tariff.isActive ? "Tarif deaktivieren" : "Tarif wieder aktivieren"}
                    </button>
                    <span className="ml-3 text-xs text-muted-foreground">
                      Deaktivierte Tarife werden bei der Abrechnung nicht mehr berücksichtigt, bleiben aber erhalten.
                    </span>
                  </form>
                  {tariff._count.billingEntries > 0 ? (
                    <p className="border-t pt-4 text-sm text-muted-foreground">
                      Löschen nicht möglich: {tariff._count.billingEntries} Abrechnungsposition(en) verweisen auf diesen
                      Tarif. Bitte stattdessen deaktivieren.
                    </p>
                  ) : (
                    <AdminDeleteForm
                      action={deleteTariffAction}
                      id={tariff.id}
                      label="Tarif endgültig löschen"
                      confirmMessage={`Tarif "${tariff.name}" wirklich endgültig löschen?`}
                    />
                  )}
                </div>
              </details>
            </CardContent>
          </Card>
        ))}
      </section>
    </>
  );
}

type TariffFormProps = {
  data: AdministrationData;
  tariff?: AdministrationData["tariffs"][number];
};

function TariffForm({ data, tariff }: TariffFormProps) {
  return (
    <form action={saveTariffAction} className="grid gap-4 lg:grid-cols-3">
      {tariff ? <input type="hidden" name="id" value={tariff.id} /> : null}
      <label className="text-sm font-medium">
        Name
        <input
          name="name"
          required
          maxLength={120}
          defaultValue={tariff?.name}
          className={inputClass}
          placeholder="z.B. Ortsverein Wochenende"
        />
      </label>
      <label className="text-sm font-medium">
        Tarifgruppe
        <select name="tariffGroupId" required defaultValue={tariff?.tariffGroup.id ?? ""} className={inputClass}>
          <option value="" disabled>
            Bitte wählen
          </option>
          {data.tariffGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        Raum
        <select name="roomId" required defaultValue={tariff?.room.id ?? ""} className={inputClass}>
          <option value="" disabled>
            Bitte wählen
          </option>
          {data.buildings.map((building) => (
            <optgroup key={building.id} label={building.name}>
              {building.rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        Tagesart
        <select name="dayType" defaultValue={tariff?.dayType ?? "ALL"} className={inputClass}>
          {Object.entries(dayTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        Nutzungstyp
        <select name="usageTypeId" defaultValue={tariff?.usageType?.id ?? ""} className={inputClass}>
          <option value="">Alle Nutzungstypen</option>
          {data.usageTypes.map((usageType) => (
            <option key={usageType.id} value={usageType.id}>
              {usageType.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        Organisationsart
        <select name="organizationTypeId" defaultValue={tariff?.organizationType?.id ?? ""} className={inputClass}>
          <option value="">Alle Organisationsarten</option>
          {data.organizationTypes.map((organizationType) => (
            <option key={organizationType.id} value={organizationType.id}>
              {organizationType.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        Stundensatz (€/h)
        <input
          name="hourlyRate"
          inputMode="decimal"
          defaultValue={tariff?.hourlyRate !== null && tariff !== undefined ? String(tariff.hourlyRate) : ""}
          className={inputClass}
          placeholder="z.B. 0,73"
        />
        <span className="mt-1 block text-xs text-muted-foreground">Leer lassen, wenn eine Pauschale gilt. 0 = kostenlos.</span>
      </label>
      <label className="text-sm font-medium">
        Pauschale (€)
        <input
          name="flatRate"
          inputMode="decimal"
          defaultValue={tariff?.flatRate !== null && tariff !== undefined ? String(tariff.flatRate) : ""}
          className={inputClass}
          placeholder="z.B. 10,00"
        />
        <span className="mt-1 block text-xs text-muted-foreground">Fester Betrag je Buchung, unabhängig von der Dauer.</span>
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm font-medium">
          Gültig ab
          <input
            name="validFrom"
            type="date"
            required
            defaultValue={tariff ? toDateInputValue(tariff.validFrom) : ""}
            className={inputClass}
          />
        </label>
        <label className="text-sm font-medium">
          Gültig bis
          <input
            name="validUntil"
            type="date"
            defaultValue={tariff ? toDateInputValue(tariff.validUntil) : ""}
            className={inputClass}
          />
        </label>
      </div>
      <div className="lg:col-span-3">
        <FormActions submitLabel={tariff ? "Änderungen speichern" : "Tarif anlegen"} cancelHref="/admin/tariffs" />
      </div>
    </form>
  );
}
