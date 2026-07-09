"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, Plus } from "lucide-react";
import {
  createBuildingClosureAction,
  createBuildingClosureFromHolidayAction,
  deleteBuildingAction,
  deleteBuildingClosureAction,
  saveBuildingAction,
  updateBuildingClosureAction,
} from "@/app/admin/actions";
import { AdminClosurePanel } from "@/components/admin-closure-panel";
import { AdminDeleteForm } from "@/components/admin-delete-form";
import { BuildingsTable, type BuildingTableRow } from "@/components/admin-master-data-tables";
import { ModalFormActions } from "@/components/dialog-form-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { getBuildingAdministrationData } from "@/lib/services/admin/building-service";
import type { getHolidayOptions } from "@/lib/services/holiday-service";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";

type AdministrationData = Awaited<ReturnType<typeof getBuildingAdministrationData>>;
type BuildingRecord = AdministrationData["buildings"][number];

type BuildingManagerProps = {
  buildings: BuildingRecord[];
  caretakers: AdministrationData["caretakers"];
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

export function BuildingManager({ buildings, caretakers, holidays }: BuildingManagerProps) {
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

  const editingBuilding = editingId ? (buildings.find((building) => building.id === editingId) ?? null) : null;
  const activeCount = buildings.filter((building) => building.isActive).length;
  const roomCount = buildings.reduce((total, building) => total + building.rooms.length, 0);

  const tableRows: BuildingTableRow[] = buildings.map((building) => ({
    id: building.id,
    code: building.code,
    name: building.name,
    address: building.address ?? "-",
    postalCode: building.postalCode ?? "",
    city: building.city ?? "",
    email: building.email ?? "",
    phone: building.phone ?? "",
    roomCount: building.rooms.length,
    caretakerName: building.caretakers[0]?.caretaker.name ?? "Kein Hauswart",
    isActive: building.isActive,
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
          <StatChip label="Gebäude" value={buildings.length} />
          <StatChip label="Aktiv" value={activeCount} />
          <StatChip label="Räume gesamt" value={roomCount} />
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Neues Gebäude
        </Button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <BuildingsTable rows={tableRows} onRowClick={(row) => openEdit(row.id)} />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] w-full max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogDescription className="flex items-center gap-2 font-medium uppercase tracking-[0.2em] text-primary">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              {editingBuilding ? "Gebäude bearbeiten" : "Neues Gebäude"}
            </DialogDescription>
            <DialogTitle>{editingBuilding ? editingBuilding.name : "Gebäude anlegen"}</DialogTitle>
          </DialogHeader>

          {editingBuilding ? (
            <Tabs value={tab} onValueChange={(value) => setTab(value as "details" | "closures")}>
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="closures">Sperren</TabsTrigger>
              </TabsList>
              <TabsContent value="details">
                <BuildingForm caretakers={caretakers} building={editingBuilding} />
                {editingBuilding.rooms.length === 0 && (
                  <AdminDeleteForm
                    action={deleteBuildingAction}
                    id={editingBuilding.id}
                    label="Gebäude löschen"
                    confirmMessage={`Gebäude „${editingBuilding.name}" wirklich löschen?`}
                  />
                )}
              </TabsContent>
              <TabsContent value="closures">
                <AdminClosurePanel
                  action={createBuildingClosureAction}
                  updateAction={updateBuildingClosureAction}
                  deleteAction={deleteBuildingClosureAction}
                  fromHolidayAction={createBuildingClosureFromHolidayAction}
                  targetName="buildingId"
                  targetId={editingBuilding.id}
                  closures={editingBuilding.closures}
                  holidays={holidays}
                  relatedClosures={editingBuilding.rooms
                    .flatMap((room) =>
                      room.closures.map((closure) => ({
                        ...closure,
                        sourceLabel: `Raum: ${room.name}`,
                      })),
                    )
                    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
                    .slice(0, 5)}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <BuildingForm caretakers={caretakers} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

type BuildingFormProps = {
  caretakers: AdministrationData["caretakers"];
  building?: BuildingRecord;
};

function BuildingForm({ caretakers, building }: BuildingFormProps) {
  return (
    <form action={saveBuildingAction} className="mt-4 grid gap-4 sm:grid-cols-2">
      {building ? <input type="hidden" name="id" value={building.id} /> : null}
      <label className="text-sm font-medium">
        Code
        <input
          name="code"
          required
          readOnly={Boolean(building)}
          defaultValue={building?.code}
          className={building ? `${inputClass} bg-muted text-muted-foreground` : inputClass}
          placeholder="z.B. NMS_LANGENHART"
        />
        {building ? (
          <span className="mt-1 block text-xs text-muted-foreground">Der Code bleibt nach dem Anlegen unverändert.</span>
        ) : null}
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
        PLZ
        <input name="postalCode" defaultValue={building?.postalCode ?? ""} className={inputClass} inputMode="numeric" />
      </label>
      <label className="text-sm font-medium">
        Ort
        <input name="city" defaultValue={building?.city ?? ""} className={inputClass} />
      </label>
      <label className="text-sm font-medium">
        E-Mail
        <input name="email" type="email" defaultValue={building?.email ?? ""} className={inputClass} />
      </label>
      <label className="text-sm font-medium">
        Telefonnummer
        <input name="phone" defaultValue={building?.phone ?? ""} className={inputClass} />
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
      <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
        <input type="checkbox" name="isActive" defaultChecked={building?.isActive ?? true} />
        Aktiv
      </label>
      <div className="sm:col-span-2">
        <ModalFormActions submitLabel={building ? "Änderungen speichern" : "Gebäude anlegen"} />
      </div>
    </form>
  );
}
