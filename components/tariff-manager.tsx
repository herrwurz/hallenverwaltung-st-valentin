"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Euro, Plus, Tags } from "lucide-react";
import {
  activateTariffAction,
  deactivateTariffAction,
  deleteTariffAction,
  endTariffAction,
  saveTariffAction,
  saveTariffGroupAction,
} from "@/app/admin/tariffs/actions";
import { AdminDeleteForm } from "@/components/admin-delete-form";
import { ModalFormActions } from "@/components/dialog-form-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { getTariffAdministrationData } from "@/lib/services/admin/tariff-service";

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

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-2 shadow-sm">
      <p className="text-2xl font-semibold leading-none tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

type AdministrationData = Awaited<ReturnType<typeof getTariffAdministrationData>>;
type TariffGroupRecord = AdministrationData["tariffGroups"][number];
type TariffRecord = AdministrationData["tariffs"][number];

export function TariffManager({ data }: { data: AdministrationData }) {
  return (
    <>
      <TariffGroupSection tariffGroups={data.tariffGroups} />
      <TariffSection data={data} />
    </>
  );
}

function TariffGroupSection({ tariffGroups }: { tariffGroups: TariffGroupRecord[] }) {
  const searchParams = useSearchParams();
  const savedMarker = searchParams.get("saved");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [closedForMarker, setClosedForMarker] = useState<string | null>(null);

  if (savedMarker && savedMarker !== closedForMarker) {
    setClosedForMarker(savedMarker);
    setOpen(false);
  }

  const editingGroup = editingId ? (tariffGroups.find((group) => group.id === editingId) ?? null) : null;

  function openCreate() {
    setEditingId(null);
    setOpen(true);
  }

  function openEdit(id: string) {
    setEditingId(id);
    setOpen(true);
  }

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Tarifgruppen</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Preiskategorien, denen Organisationen zugeordnet werden (Zuordnung unter Stammdaten → Organisationen).
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Neue Tarifgruppe
        </Button>
      </div>

      {tariffGroups.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Noch keine Tarifgruppen vorhanden.</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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
              {tariffGroups.map((group) => (
                <TableRow key={group.id} onClick={() => openEdit(group.id)} className="cursor-pointer">
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell className="text-muted-foreground">{group.code}</TableCell>
                  <TableCell className="text-muted-foreground">{group.description ?? "–"}</TableCell>
                  <TableCell className="text-right">{group._count.organizations}</TableCell>
                  <TableCell className="text-right">{group._count.tariffs}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] w-full max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogDescription className="flex items-center gap-2 font-medium uppercase tracking-[0.2em] text-primary">
              <Tags className="h-4 w-4" aria-hidden="true" />
              {editingGroup ? "Tarifgruppe bearbeiten" : "Neue Tarifgruppe"}
            </DialogDescription>
            <DialogTitle>{editingGroup ? editingGroup.name : "Tarifgruppe anlegen"}</DialogTitle>
          </DialogHeader>
          <form action={saveTariffGroupAction} className="mt-4 grid gap-4">
            {editingGroup ? <input type="hidden" name="id" value={editingGroup.id} /> : null}
            <label className="text-sm font-medium">
              Code
              <input
                name="code"
                required
                readOnly={Boolean(editingGroup)}
                defaultValue={editingGroup?.code}
                className={editingGroup ? `${inputClass} bg-muted text-muted-foreground` : inputClass}
                placeholder="z.B. ORTSVEREIN"
              />
              {editingGroup ? (
                <span className="mt-1 block text-xs text-muted-foreground">Der Code bleibt nach dem Anlegen unverändert.</span>
              ) : null}
            </label>
            <label className="text-sm font-medium">
              Name
              <input name="name" required maxLength={120} defaultValue={editingGroup?.name} className={inputClass} placeholder="z.B. Ortsverein" />
            </label>
            <label className="text-sm font-medium">
              Beschreibung (optional)
              <input name="description" maxLength={500} defaultValue={editingGroup?.description ?? ""} className={inputClass} />
            </label>
            <ModalFormActions submitLabel={editingGroup ? "Änderungen speichern" : "Tarifgruppe anlegen"} />
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TariffSection({ data }: { data: AdministrationData }) {
  const searchParams = useSearchParams();
  const savedMarker = searchParams.get("saved");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [closedForMarker, setClosedForMarker] = useState<string | null>(null);

  if (savedMarker && savedMarker !== closedForMarker) {
    setClosedForMarker(savedMarker);
    setOpen(false);
  }

  const roomFilter = searchParams.get("roomId") ?? "";
  const tariffGroupFilter = searchParams.get("tariffGroupId") ?? "";
  const filteredTariffs = data.tariffs.filter(
    (tariff) =>
      (!roomFilter || tariff.room.id === roomFilter) && (!tariffGroupFilter || tariff.tariffGroup.id === tariffGroupFilter),
  );
  const now = new Date();
  const editingTariff = editingId ? (filteredTariffs.find((tariff) => tariff.id === editingId) ?? null) : null;

  function openCreate() {
    setEditingId(null);
    setOpen(true);
  }

  function openEdit(id: string) {
    setEditingId(id);
    setOpen(true);
  }

  return (
    <>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <StatChip label="Tarife" value={data.tariffs.length} />
          <StatChip label="Aktiv" value={data.tariffs.filter((t) => getTariffStatus(t, now).label === "Aktiv").length} />
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Neuer Tarif
        </Button>
      </div>

      <form method="get" className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-medium">
          Raum
          <select name="roomId" defaultValue={roomFilter} className={inputClass}>
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
          <select name="tariffGroupId" defaultValue={tariffGroupFilter} className={inputClass}>
            <option value="">Alle Tarifgruppen</option>
            {data.tariffGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <Button type="submit" variant="outline">
            Filtern
          </Button>
        </div>
      </form>

      {filteredTariffs.length === 0 ? (
        <p className="mt-4 rounded-xl border border-border bg-muted p-5 text-sm text-muted-foreground">
          Keine Tarife für die gewählten Filter vorhanden.
        </p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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
                  <TableRow key={tariff.id} onClick={() => openEdit(tariff.id)} className="cursor-pointer">
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
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] w-full max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogDescription className="flex items-center gap-2 font-medium uppercase tracking-[0.2em] text-primary">
              <Euro className="h-4 w-4" aria-hidden="true" />
              {editingTariff ? "Tarif bearbeiten" : "Neuer Tarif"}
            </DialogDescription>
            <DialogTitle>{editingTariff ? editingTariff.name : "Tarif anlegen"}</DialogTitle>
          </DialogHeader>
          <TariffForm data={data} tariff={editingTariff ?? undefined} />
          {editingTariff ? (
            <details className="mt-2 rounded-xl border border-border p-4">
              <summary className="cursor-pointer text-sm font-medium">Tarif beenden, deaktivieren oder löschen</summary>
              <div className="mt-4 space-y-4">
                <form action={endTariffAction} className="flex flex-wrap items-end gap-4">
                  <input type="hidden" name="id" value={editingTariff.id} />
                  <label className="text-sm font-medium">
                    Gültig bis
                    <input name="validUntil" type="date" required className={inputClass} />
                  </label>
                  <Button type="submit" variant="outline">
                    Tarif beenden
                  </Button>
                </form>
                <form
                  action={editingTariff.isActive ? deactivateTariffAction : activateTariffAction}
                  className="border-t border-border pt-4"
                >
                  <input type="hidden" name="id" value={editingTariff.id} />
                  <Button type="submit" variant="outline">
                    {editingTariff.isActive ? "Tarif deaktivieren" : "Tarif wieder aktivieren"}
                  </Button>
                  <span className="ml-3 text-xs text-muted-foreground">
                    Deaktivierte Tarife werden bei der Abrechnung nicht mehr berücksichtigt, bleiben aber erhalten.
                  </span>
                </form>
                {editingTariff._count.billingEntries > 0 ? (
                  <p className="border-t border-border pt-4 text-sm text-muted-foreground">
                    Löschen nicht möglich: {editingTariff._count.billingEntries} Abrechnungsposition(en) verweisen auf
                    diesen Tarif. Bitte stattdessen deaktivieren.
                  </p>
                ) : (
                  <AdminDeleteForm
                    action={deleteTariffAction}
                    id={editingTariff.id}
                    label="Tarif endgültig löschen"
                    confirmMessage={`Tarif "${editingTariff.name}" wirklich endgültig löschen?`}
                  />
                )}
              </div>
            </details>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function TariffForm({ data, tariff }: { data: AdministrationData; tariff?: TariffRecord }) {
  return (
    <form action={saveTariffAction} className="mt-4 grid gap-4 sm:grid-cols-2">
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
      <div className="sm:col-span-2">
        <ModalFormActions submitLabel={tariff ? "Änderungen speichern" : "Tarif anlegen"} />
      </div>
    </form>
  );
}
