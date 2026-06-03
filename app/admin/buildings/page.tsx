import { saveBuildingAction } from "@/app/admin/actions";
import { AdminBackLink } from "@/components/admin-back-link";
import { AdminFeedback } from "@/components/admin-feedback";
import { BuildingsTable, type BuildingTableRow } from "@/components/admin-master-data-tables";
import { FormActions } from "@/components/form-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";
import { getBuildingAdministrationData } from "@/lib/services/admin/building-service";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function BuildingsPage({ searchParams }: PageProps) {
  await requirePermission("MANAGE_USERS");
  const [params, data] = await Promise.all([searchParams, getBuildingAdministrationData()]);
  const tableRows: BuildingTableRow[] = data.buildings.map((building) => ({
    id: building.id,
    code: building.code,
    name: building.name,
    address: building.address ?? "-",
    roomCount: building.rooms.length,
    caretakerName: building.caretakers[0]?.caretaker.name ?? "Kein Hauswart",
    isActive: building.isActive,
  }));

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Gebäude</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Gebäude-Verwaltung</h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Standorte erfassen, aktivieren und einem Hauswart zuordnen.
      </p>
      <AdminBackLink />
      <div className="mt-8">
        <AdminFeedback {...params} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Neues Gebäude</CardTitle>
          <CardDescription>Gebäude werden später über Räume, Sperren und Kalenderfilter referenziert.</CardDescription>
        </CardHeader>
        <CardContent>
          <BuildingForm caretakers={data.caretakers} />
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Gebäudeübersicht</CardTitle>
          <CardDescription>Filterbare Tabelle aller Standorte.</CardDescription>
        </CardHeader>
        <CardContent>
          <BuildingsTable rows={tableRows} />
        </CardContent>
      </Card>

      <section className="mt-8 space-y-4">
        <h3 className="text-xl font-semibold tracking-tight">Gebäude bearbeiten</h3>
        {data.buildings.map((building) => (
          <Card key={building.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{building.name}</CardTitle>
                  <CardDescription>
                    {building.code} | {building.rooms.length} Räume | {building.caretakers[0]?.caretaker.name ?? "Kein Hauswart"}
                  </CardDescription>
                </div>
                <Badge variant={building.isActive ? "success" : "secondary"}>
                  {building.isActive ? "Aktiv" : "Inaktiv"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <BuildingForm caretakers={data.caretakers} building={building} />
            </CardContent>
          </Card>
        ))}
      </section>
    </>
  );
}

type BuildingFormProps = {
  caretakers: Awaited<ReturnType<typeof getBuildingAdministrationData>>["caretakers"];
  building?: Awaited<ReturnType<typeof getBuildingAdministrationData>>["buildings"][number];
};

function BuildingForm({ caretakers, building }: BuildingFormProps) {
  return (
    <form action={saveBuildingAction} className="grid gap-4 lg:grid-cols-4">
      {building ? <input type="hidden" name="id" value={building.id} /> : null}
      <label className="text-sm font-medium">
        Code
        <input
          name="code"
          required
          readOnly={Boolean(building)}
          defaultValue={building?.code}
          className={building ? `${inputClass} bg-muted text-muted-foreground` : inputClass}
          placeholder="VS_HAUPTPLATZ"
        />
        {building ? <span className="mt-1 block text-xs text-muted-foreground">Der Code bleibt nach dem Anlegen unverändert.</span> : null}
      </label>
      <label className="text-sm font-medium">
        Name
        <input name="name" required defaultValue={building?.name} className={inputClass} />
      </label>
      <label className="text-sm font-medium">
        Adresse
        <input name="address" defaultValue={building?.address ?? ""} className={inputClass} />
      </label>
      <label className="text-sm font-medium">
        Primärer Hauswart
        <select name="caretakerId" defaultValue={building?.caretakers[0]?.caretakerId ?? ""} className={inputClass}>
          <option value="">Keine Zuordnung</option>
          {caretakers.map((caretaker) => (
            <option key={caretaker.id} value={caretaker.id}>
              {caretaker.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="isActive" defaultChecked={building?.isActive ?? true} />
        Aktiv
      </label>
      <div className="lg:col-span-3">
        <FormActions submitLabel={building ? "Änderungen speichern" : "Gebäude anlegen"} cancelHref="/admin/buildings" />
      </div>
    </form>
  );
}
