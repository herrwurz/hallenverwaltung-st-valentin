"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Home, Plus } from "lucide-react";
import { saveOrganizationAction } from "@/app/admin/actions";
import { OrganizationsTable, type OrganizationTableRow } from "@/components/admin-master-data-tables";
import { ModalFormActions } from "@/components/dialog-form-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { getOrganizationAdministrationData } from "@/lib/services/admin/organization-service";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";

type AdministrationData = Awaited<ReturnType<typeof getOrganizationAdministrationData>>;
type OrganizationRecord = AdministrationData["organizations"][number];

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-2 shadow-sm">
      <p className="text-2xl font-semibold leading-none tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function OrganizationManager({
  organizations,
  organizationTypes,
  tariffGroups,
}: {
  organizations: OrganizationRecord[];
  organizationTypes: AdministrationData["organizationTypes"];
  tariffGroups: AdministrationData["tariffGroups"];
}) {
  const searchParams = useSearchParams();
  const savedMarker = searchParams.get("saved");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [closedForMarker, setClosedForMarker] = useState<string | null>(null);

  if (savedMarker && savedMarker !== closedForMarker) {
    setClosedForMarker(savedMarker);
    setOpen(false);
  }

  const editingOrganization = editingId ? (organizations.find((org) => org.id === editingId) ?? null) : null;
  const activeCount = organizations.filter((org) => org.status === "ACTIVE").length;

  const tableRows: OrganizationTableRow[] = organizations.map((organization) => ({
    id: organization.id,
    name: organization.name,
    organizationTypeName: organization.organizationType.name,
    memberCount: organization.members.length,
    status: organization.status,
    blockedReason: organization.blockedReason ?? "-",
  }));

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
        <div className="flex flex-wrap gap-3">
          <StatChip label="Organisationen" value={organizations.length} />
          <StatChip label="Aktiv" value={activeCount} />
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Neue Organisation
        </Button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <OrganizationsTable rows={tableRows} onRowClick={(row) => openEdit(row.id)} />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] w-full max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogDescription className="flex items-center gap-2 font-medium uppercase tracking-[0.2em] text-primary">
              <Home className="h-4 w-4" aria-hidden="true" />
              {editingOrganization ? "Organisation bearbeiten" : "Neue Organisation"}
            </DialogDescription>
            <DialogTitle>{editingOrganization ? editingOrganization.name : "Organisation anlegen"}</DialogTitle>
          </DialogHeader>
          <OrganizationForm
            organizationTypes={organizationTypes}
            tariffGroups={tariffGroups}
            organization={editingOrganization ?? undefined}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function OrganizationForm({
  organizationTypes,
  tariffGroups,
  organization,
}: {
  organizationTypes: AdministrationData["organizationTypes"];
  tariffGroups: AdministrationData["tariffGroups"];
  organization?: OrganizationRecord;
}) {
  return (
    <form action={saveOrganizationAction} className="mt-4 grid gap-4 sm:grid-cols-2">
      {organization ? <input type="hidden" name="id" value={organization.id} /> : null}
      <label className="text-sm font-medium">
        Name
        <input name="name" required defaultValue={organization?.name} className={inputClass} />
      </label>
      <label className="text-sm font-medium">
        Organisationstyp
        <select name="organizationTypeId" required defaultValue={organization?.organizationTypeId ?? ""} className={inputClass}>
          <option value="" disabled>
            Bitte wählen
          </option>
          {organizationTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        Status
        <select name="status" defaultValue={organization?.status ?? "ACTIVE"} className={inputClass}>
          <option value="ACTIVE">Aktiv / entsperrt</option>
          <option value="BLOCKED">Gesperrt</option>
          <option value="INACTIVE">Inaktiv</option>
        </select>
      </label>
      <label className="text-sm font-medium">
        Sperr-/Stilllegungsgrund
        <input name="blockedReason" defaultValue={organization?.blockedReason ?? ""} className={inputClass} />
      </label>
      <label className="text-sm font-medium">
        Tarifgruppe
        <select name="tariffGroupId" defaultValue={organization?.tariffGroupId ?? ""} className={inputClass}>
          <option value="">Keine Tarifgruppe</option>
          {tariffGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-muted-foreground">
          Bestimmt die Preise in der Abrechnung (Stammdaten → Tarife).
        </span>
      </label>
      <label className="inline-flex items-center gap-2 self-end pb-2 text-sm font-medium">
        <input type="checkbox" name="isBillingRelevant" defaultChecked={organization?.isBillingRelevant ?? true} />
        Abrechnungsrelevant
      </label>
      <div className="sm:col-span-2">
        <ModalFormActions submitLabel={organization ? "Änderungen speichern" : "Organisation anlegen"} />
      </div>
    </form>
  );
}
