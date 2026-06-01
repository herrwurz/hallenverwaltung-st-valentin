import { saveRoomAction } from "@/app/admin/actions";
import { AdminBackLink } from "@/components/admin-back-link";
import { AdminFeedback } from "@/components/admin-feedback";
import { FormActions } from "@/components/form-actions";
import { requirePermission } from "@/lib/permissions";
import { getRoomAdministrationData } from "@/lib/services/admin/room-service";

const inputClass = "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm";

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function RoomsPage({ searchParams }: PageProps) {
  await requirePermission("MANAGE_USERS");
  const [params, data] = await Promise.all([searchParams, getRoomAdministrationData()]);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-400">Räume</p>
      <h2 className="mt-3 text-3xl font-semibold">Raum-Verwaltung</h2>
      <p className="mt-3 text-slate-300">Räume, Betriebsstatus und optionale Teilbereichsbeziehungen pflegen.</p>
      <AdminBackLink />
      <div className="mt-8">
        <AdminFeedback {...params} />
      </div>
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="text-lg font-medium">Neuer Raum</h3>
        <RoomForm buildings={data.buildings} rooms={data.rooms} />
      </section>
      <section className="mt-8 space-y-4">
        {data.rooms.map((room) => (
          <details key={room.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <summary className="cursor-pointer list-none">
              <div className="flex justify-between gap-4">
                <div>
                  <h3 className="font-medium">{room.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {room.building.name} | {room.code}
                    {room.componentChildren[0]?.parentRoom
                      ? ` | Teilbereich von ${room.componentChildren[0].parentRoom.name}`
                      : ""}
                  </p>
                </div>
                <span className={room.status === "ACTIVE" ? "text-emerald-300" : "text-amber-300"}>
                  {room.status}
                </span>
              </div>
            </summary>
            <RoomForm buildings={data.buildings} rooms={data.rooms} room={room} />
          </details>
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
    <form action={saveRoomAction} className="mt-5 grid gap-4 lg:grid-cols-4">
      {room ? <input type="hidden" name="id" value={room.id} /> : null}
      <label className="text-sm text-slate-300">
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
      <label className="text-sm text-slate-300">
        Code
        <input name="code" required defaultValue={room?.code} className={inputClass} />
      </label>
      <label className="text-sm text-slate-300">
        Name
        <input name="name" required defaultValue={room?.name} className={inputClass} />
      </label>
      <label className="text-sm text-slate-300">
        Status
        <select name="status" defaultValue={room?.status ?? "ACTIVE"} className={inputClass}>
          <option value="ACTIVE">Aktiv</option>
          <option value="RESTRICTED">Eingeschränkt</option>
          <option value="OUT_OF_SERVICE">Inaktiv / ausser Betrieb</option>
        </select>
      </label>
      <label className="text-sm text-slate-300 lg:col-span-2">
        Beschreibung
        <input name="description" defaultValue={room?.description ?? ""} className={inputClass} />
      </label>
      <label className="text-sm text-slate-300">
        Parent-Room / Gesamtbereich
        <select
          name="parentRoomId"
          defaultValue={room?.componentChildren[0]?.parentRoomId ?? ""}
          className={inputClass}
        >
          <option value="">Keine Zuordnung</option>
          {rooms
            .filter((candidate) => candidate.id !== room?.id)
            .map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name} ({candidate.building.name})
              </option>
            ))}
        </select>
      </label>
      <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-300">
        <input type="checkbox" name="isCombinable" defaultChecked={room?.isCombinable ?? false} />
        Kombinierbar
      </label>
      <label className="text-sm text-slate-300">
        Geöffnet ab
        <input name="openingTime" required defaultValue={room?.openingTime ?? "06:00"} className={inputClass} />
      </label>
      <label className="text-sm text-slate-300">
        Geöffnet bis
        <input name="closingTime" required defaultValue={room?.closingTime ?? "23:00"} className={inputClass} />
      </label>
      <label className="text-sm text-slate-300">
        Aufbaupuffer (Min.)
        <input
          name="setupBufferMinutes"
          type="number"
          min="0"
          required
          defaultValue={room?.setupBufferMinutes ?? 0}
          className={inputClass}
        />
      </label>
      <label className="text-sm text-slate-300">
        Abbaupuffer (Min.)
        <input
          name="teardownBufferMinutes"
          type="number"
          min="0"
          required
          defaultValue={room?.teardownBufferMinutes ?? 0}
          className={inputClass}
        />
      </label>
      <div className="lg:col-span-4">
        <FormActions submitLabel={room ? "Änderungen speichern" : "Raum anlegen"} cancelHref="/admin/rooms" />
      </div>
    </form>
  );
}
