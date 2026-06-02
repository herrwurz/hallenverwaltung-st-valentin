import { saveRoomAction } from "@/app/admin/actions";
import { AdminBackLink } from "@/components/admin-back-link";
import { AdminFeedback } from "@/components/admin-feedback";
import { RoomsTable, type RoomTableRow } from "@/components/admin-master-data-tables";
import { FormActions } from "@/components/form-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";
import { getRoomAdministrationData } from "@/lib/services/admin/room-service";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function RoomsPage({ searchParams }: PageProps) {
  await requirePermission("MANAGE_USERS");
  const [params, data] = await Promise.all([searchParams, getRoomAdministrationData()]);
  const tableRows: RoomTableRow[] = data.rooms.map((room) => ({
    id: room.id,
    code: room.code,
    name: room.name,
    buildingName: room.building.name,
    parentRoomName: room.componentChildren[0]?.parentRoom.name ?? "-",
    status: room.status,
    openingTime: room.openingTime,
    closingTime: room.closingTime,
  }));

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Räume</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Raum-Verwaltung</h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Räume, Betriebsstatus und optionale Teilbereichsbeziehungen pflegen.
      </p>
      <AdminBackLink />
      <div className="mt-8">
        <AdminFeedback {...params} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Neuer Raum</CardTitle>
          <CardDescription>Räume sind immer genau einem Gebäude zugeordnet; Parent-Rooms bilden Teilbereiche ab.</CardDescription>
        </CardHeader>
        <CardContent>
          <RoomForm buildings={data.buildings} rooms={data.rooms} />
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Raumübersicht</CardTitle>
          <CardDescription>Filterbare Tabelle aller Räume inklusive Gebäudezuordnung und Status.</CardDescription>
        </CardHeader>
        <CardContent>
          <RoomsTable rows={tableRows} />
        </CardContent>
      </Card>

      <section className="mt-8 space-y-4">
        <h3 className="text-xl font-semibold tracking-tight">Räume bearbeiten</h3>
        {data.rooms.map((room) => (
          <Card key={room.id}>
            <CardHeader>
              <div className="flex justify-between gap-4">
                <div>
                  <CardTitle>{room.name}</CardTitle>
                  <CardDescription>
                    {room.building.name} | {room.code}
                    {room.componentChildren[0]?.parentRoom ? ` | Teilbereich von ${room.componentChildren[0].parentRoom.name}` : ""}
                  </CardDescription>
                </div>
                <Badge variant={room.status === "ACTIVE" ? "success" : room.status === "RESTRICTED" ? "warning" : "secondary"}>
                  {room.status === "ACTIVE" ? "Aktiv" : room.status === "RESTRICTED" ? "Eingeschränkt" : "Außer Betrieb"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <RoomForm buildings={data.buildings} rooms={data.rooms} room={room} />
            </CardContent>
          </Card>
        ))}
      </section>
    </>
  );
}

type RoomData = Awaited<ReturnType<typeof getRoomAdministrationData>>;

function RoomForm({
  buildings,
  rooms,
  room,
}: {
  buildings: RoomData["buildings"];
  rooms: RoomData["rooms"];
  room?: RoomData["rooms"][number];
}) {
  return (
    <form action={saveRoomAction} className="grid gap-4 lg:grid-cols-4">
      {room ? <input type="hidden" name="id" value={room.id} /> : null}
      <label className="text-sm font-medium">
        Gebäude
        <select name="buildingId" required defaultValue={room?.buildingId ?? ""} className={inputClass}>
          <option value="" disabled>
            Bitte wählen
          </option>
          {buildings.map((building) => (
            <option key={building.id} value={building.id}>
              {building.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        Code
        <input name="code" required defaultValue={room?.code} className={inputClass} />
      </label>
      <label className="text-sm font-medium">
        Name
        <input name="name" required defaultValue={room?.name} className={inputClass} />
      </label>
      <label className="text-sm font-medium">
        Status
        <select name="status" defaultValue={room?.status ?? "ACTIVE"} className={inputClass}>
          <option value="ACTIVE">Aktiv</option>
          <option value="RESTRICTED">Eingeschränkt</option>
          <option value="OUT_OF_SERVICE">Inaktiv / außer Betrieb</option>
        </select>
      </label>
      <label className="text-sm font-medium lg:col-span-2">
        Beschreibung
        <input name="description" defaultValue={room?.description ?? ""} className={inputClass} />
      </label>
      <label className="text-sm font-medium">
        Parent-Room / Gesamtbereich
        <select name="parentRoomId" defaultValue={room?.componentChildren[0]?.parentRoomId ?? ""} className={inputClass}>
          <option value="">Keine Zuordnung</option>
          {rooms
            .filter((candidate) => candidate.id !== room?.id && candidate.buildingId === (room?.buildingId ?? candidate.buildingId))
            .map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name} ({candidate.building.name})
              </option>
            ))}
        </select>
      </label>
      <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
        <input type="checkbox" name="isCombinable" defaultChecked={room?.isCombinable ?? false} />
        Kombinierbar
      </label>
      <label className="text-sm font-medium">
        Geöffnet ab
        <input name="openingTime" required defaultValue={room?.openingTime ?? "06:00"} className={inputClass} />
      </label>
      <label className="text-sm font-medium">
        Geöffnet bis
        <input name="closingTime" required defaultValue={room?.closingTime ?? "23:00"} className={inputClass} />
      </label>
      <label className="text-sm font-medium">
        Aufbaupuffer (Min.)
        <input name="setupBufferMinutes" type="number" min="0" required defaultValue={room?.setupBufferMinutes ?? 0} className={inputClass} />
      </label>
      <label className="text-sm font-medium">
        Abbaupuffer (Min.)
        <input name="teardownBufferMinutes" type="number" min="0" required defaultValue={room?.teardownBufferMinutes ?? 0} className={inputClass} />
      </label>
      <div className="lg:col-span-4">
        <FormActions submitLabel={room ? "Änderungen speichern" : "Raum anlegen"} cancelHref="/admin/rooms" />
      </div>
    </form>
  );
}
