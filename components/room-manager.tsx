"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Warehouse } from "lucide-react";
import {
  createRoomClosureAction,
  createRoomClosureFromHolidayAction,
  deleteRoomAction,
  deleteRoomClosureAction,
  saveRoomAction,
  updateRoomClosureAction,
} from "@/app/admin/actions";
import { AdminClosurePanel } from "@/components/admin-closure-panel";
import { AdminDeleteForm } from "@/components/admin-delete-form";
import { RoomsTable, type RoomTableRow } from "@/components/admin-master-data-tables";
import { ModalFormActions } from "@/components/dialog-form-actions";
import { RoomOpeningHoursFields } from "@/components/room-opening-hours-fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { getHolidayOptions } from "@/lib/services/holiday-service";
import type { getRoomAdministrationData } from "@/lib/services/admin/room-service";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";

type AdministrationData = Awaited<ReturnType<typeof getRoomAdministrationData>>;
type RoomRecord = AdministrationData["rooms"][number];

type RoomManagerProps = {
  rooms: RoomRecord[];
  buildings: AdministrationData["buildings"];
  holidays: Awaited<ReturnType<typeof getHolidayOptions>>;
};

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-2 shadow-sm">
      <p className="text-2xl font-semibold leading-none tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function RoomManager({ rooms, buildings, holidays }: RoomManagerProps) {
  const searchParams = useSearchParams();
  const savedMarker = searchParams.get("saved");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"details" | "closures">("details");
  const [closedForMarker, setClosedForMarker] = useState<string | null>(null);

  // Nach erfolgreichem Speichern (neuer "saved"-Marker in der URL) den Dialog
  // schliessen. Anpassung waehrend des Renderns statt in einem Effect, siehe
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (savedMarker && savedMarker !== closedForMarker) {
    setClosedForMarker(savedMarker);
    setOpen(false);
  }

  const editingRoom = editingId ? (rooms.find((room) => room.id === editingId) ?? null) : null;
  const activeCount = rooms.filter((room) => room.status === "ACTIVE").length;

  const tableRows: RoomTableRow[] = rooms.map((room) => ({
    id: room.id,
    code: room.code,
    name: room.name,
    buildingName: room.building.name,
    parentRoomName: room.componentChildren[0]?.parentRoom.name ?? "-",
    status: room.status,
    openingTime: room.openingTime,
    closingTime: room.closingTime,
  }));

  function openCreate() {
    setEditingId(null);
    setTab("details");
    setOpen(true);
  }

  function openEdit(id: string) {
    setEditingId(id);
    setTab("details");
    setOpen(true);
  }

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <StatChip label="Räume" value={rooms.length} />
          <StatChip label="Aktiv" value={activeCount} />
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Neuer Raum
        </Button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <RoomsTable rows={tableRows} onRowClick={(row) => openEdit(row.id)} />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] w-full max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogDescription className="flex items-center gap-2 font-medium uppercase tracking-[0.2em] text-primary">
              <Warehouse className="h-4 w-4" aria-hidden="true" />
              {editingRoom ? "Raum bearbeiten" : "Neuer Raum"}
            </DialogDescription>
            <DialogTitle>{editingRoom ? editingRoom.name : "Raum anlegen"}</DialogTitle>
          </DialogHeader>

          {editingRoom ? (
            <Tabs value={tab} onValueChange={(value) => setTab(value as "details" | "closures")}>
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="closures">Sperren</TabsTrigger>
              </TabsList>
              <TabsContent value="details">
                <RoomForm buildings={buildings} rooms={rooms} room={editingRoom} />
                {editingRoom._count.bookings === 0 && editingRoom._count.series === 0 && (
                  <AdminDeleteForm
                    action={deleteRoomAction}
                    id={editingRoom.id}
                    label="Raum löschen"
                    confirmMessage={`Raum „${editingRoom.name}" wirklich löschen?`}
                  />
                )}
              </TabsContent>
              <TabsContent value="closures">
                <AdminClosurePanel
                  action={createRoomClosureAction}
                  updateAction={updateRoomClosureAction}
                  deleteAction={deleteRoomClosureAction}
                  fromHolidayAction={createRoomClosureFromHolidayAction}
                  targetName="roomId"
                  targetId={editingRoom.id}
                  closures={editingRoom.closures}
                  holidays={holidays}
                  relatedClosures={editingRoom.building.closures.map((closure) => ({
                    ...closure,
                    sourceLabel: `Gebäude: ${editingRoom.building.name}`,
                  }))}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <RoomForm buildings={buildings} rooms={rooms} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

type RoomFormProps = {
  buildings: AdministrationData["buildings"];
  rooms: RoomRecord[];
  room?: RoomRecord;
};

function RoomForm({ buildings, rooms, room }: RoomFormProps) {
  return (
    <form action={saveRoomAction} className="mt-4 grid gap-4 sm:grid-cols-2">
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
        <input
          name="code"
          required
          readOnly={Boolean(room)}
          defaultValue={room?.code}
          className={room ? `${inputClass} bg-muted text-muted-foreground` : inputClass}
          placeholder="VS_HAUPTSAAL"
        />
        {room ? (
          <span className="mt-1 block text-xs text-muted-foreground">Der Code bleibt nach dem Anlegen unverändert.</span>
        ) : null}
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
      <label className="text-sm font-medium sm:col-span-2">
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
      <RoomOpeningHoursFields openingTime={room?.openingTime} closingTime={room?.closingTime} />
      <label className="text-sm font-medium">
        Aufbaupuffer (Min.)
        <input name="setupBufferMinutes" type="number" min="0" required defaultValue={room?.setupBufferMinutes ?? 0} className={inputClass} />
      </label>
      <label className="text-sm font-medium">
        Abbaupuffer (Min.)
        <input name="teardownBufferMinutes" type="number" min="0" required defaultValue={room?.teardownBufferMinutes ?? 0} className={inputClass} />
      </label>
      <div className="sm:col-span-2">
        <ModalFormActions submitLabel={room ? "Änderungen speichern" : "Raum anlegen"} />
      </div>
    </form>
  );
}
