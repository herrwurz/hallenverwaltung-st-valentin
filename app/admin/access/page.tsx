import {
  createAccessMediumAction,
  deactivateAccessMediumAction,
  issueAccessMediumAction,
  returnAccessAssignmentAction,
} from "@/app/admin/access/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAccessMediumTypeLabel } from "@/lib/access-labels";
import { requirePermission } from "@/lib/permissions";
import { accessMediumTypes, getAdminAccessData } from "@/lib/services/access-service";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";
const dateFormatter = new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" });

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function AdminAccessPage({ searchParams }: PageProps) {
  await requirePermission("MANAGE_ACCESS");
  const [params, data] = await Promise.all([searchParams, getAdminAccessData()]);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Hallenwart</p>
      <h2 className="mt-3 text-3xl font-semibold">Zutrittsverwaltung</h2>
      <p className="mt-3 text-muted-foreground">
        Schlüssel, RFID-Karten und elektronische Zutritte verwalten. Noch keine Kopplung an ein externes Tür- oder
        Schließsystem.
      </p>

      {params.error ? (
        <p className="mt-6 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {params.error}
        </p>
      ) : null}
      {params.saved ? (
        <p className="mt-6 rounded-lg border border-emerald-500/20 bg-success/10 p-4 text-sm text-emerald-700">
          Zutrittsdaten wurden gespeichert.
        </p>
      ) : null}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Zutrittsmedium anlegen</CardTitle>
          <CardDescription>Ein Medium wird einem Gebäude und optional einem konkreten Raum zugeordnet.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createAccessMediumAction} className="grid gap-4 lg:grid-cols-2">
            <label className="text-sm text-muted-foreground">
              Gebäude
              <select name="buildingId" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Bitte wählen
                </option>
                {data.buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-muted-foreground">
              Raum optional
              <select name="roomId" defaultValue="" className={inputClass}>
                <option value="">Gebäudeweit</option>
                {data.rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.building.name} - {room.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-muted-foreground">
              Typ
              <select name="type" required defaultValue="KEY" className={inputClass}>
                {accessMediumTypes.map((type) => (
                  <option key={type} value={type}>
                    {getAccessMediumTypeLabel(type)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-muted-foreground">
              Kennung / Nummer
              <input name="identifier" required maxLength={100} className={inputClass} />
            </label>
            <div className="lg:col-span-2 lg:text-right">
              <Button>Medium anlegen</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="mt-8 space-y-3">
        {data.accessMedia.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground">Noch keine Zutrittsmedien vorhanden.</Card>
        ) : (
          data.accessMedia.map((medium) => {
            const activeAssignment = medium.assignments.find((assignment) => !assignment.returnedAt);

            return (
              <Card key={medium.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium">
                      {medium.identifier} | {getAccessMediumTypeLabel(medium.type)}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {medium.building.name}
                      {medium.room ? ` - ${medium.room.name}` : " | gebäudeweit"}
                    </p>
                  </div>
                  <Badge variant={medium.isActive ? "success" : "secondary"}>
                    {medium.isActive ? "Aktiv" : "Inaktiv"}
                  </Badge>
                </div>

                {activeAssignment ? (
                  <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                    <p>
                      Ausgegeben an {activeAssignment.issuedToName}
                      {activeAssignment.organization ? ` (${activeAssignment.organization.name})` : ""} seit{" "}
                      {dateFormatter.format(activeAssignment.issuedAt)}
                    </p>
                    <form action={returnAccessAssignmentAction} className="mt-3">
                      <input type="hidden" name="assignmentId" value={activeAssignment.id} />
                      <Button variant="outline" size="sm">
                        Rückgabe erfassen
                      </Button>
                    </form>
                  </div>
                ) : medium.isActive ? (
                  <form action={issueAccessMediumAction} className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                    <input type="hidden" name="accessMediumId" value={medium.id} />
                    <label className="text-sm text-muted-foreground">
                      Organisation optional
                      <select name="organizationId" defaultValue="" className={inputClass}>
                        <option value="">Keine Organisation</option>
                        {data.organizations.map((organization) => (
                          <option key={organization.id} value={organization.id}>
                            {organization.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm text-muted-foreground">
                      Empfänger
                      <input name="issuedToName" required maxLength={150} className={inputClass} />
                    </label>
                    <div className="self-end">
                      <Button>Ausgeben</Button>
                    </div>
                  </form>
                ) : null}

                {!activeAssignment && medium.isActive ? (
                  <form action={deactivateAccessMediumAction} className="mt-4">
                    <input type="hidden" name="accessMediumId" value={medium.id} />
                    <Button variant="outline" size="sm">
                      Medium deaktivieren
                    </Button>
                  </form>
                ) : null}
              </Card>
            );
          })
        )}
      </section>
    </>
  );
}
