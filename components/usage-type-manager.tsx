"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Tag } from "lucide-react";
import { saveUsageTypeAction } from "@/app/admin/actions";
import { UsageTypesTable, type UsageTypeTableRow } from "@/components/admin-master-data-tables";
import { ModalFormActions } from "@/components/dialog-form-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { getUsageTypeAdministrationData } from "@/lib/services/admin/usage-type-service";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";

type UsageType = Awaited<ReturnType<typeof getUsageTypeAdministrationData>>[number];

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-2 shadow-sm">
      <p className="text-2xl font-semibold leading-none tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function UsageTypeManager({ usageTypes }: { usageTypes: UsageType[] }) {
  const searchParams = useSearchParams();
  const savedMarker = searchParams.get("saved");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [closedForMarker, setClosedForMarker] = useState<string | null>(null);

  if (savedMarker && savedMarker !== closedForMarker) {
    setClosedForMarker(savedMarker);
    setOpen(false);
  }

  const editingUsageType = editingId ? (usageTypes.find((ut) => ut.id === editingId) ?? null) : null;
  const activeCount = usageTypes.filter((ut) => ut.isActive).length;

  const tableRows: UsageTypeTableRow[] = usageTypes.map((ut) => ({
    id: ut.id,
    code: ut.code,
    name: ut.name,
    priority: ut.priority,
    requiresApproval: ut.requiresApproval,
    mayDisplaceLowerPriority: ut.mayDisplaceLowerPriority,
    isActive: ut.isActive,
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
          <StatChip label="Nutzungstypen" value={usageTypes.length} />
          <StatChip label="Aktiv" value={activeCount} />
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Neuer Nutzungstyp
        </Button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <UsageTypesTable rows={tableRows} onRowClick={(row) => openEdit(row.id)} />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] w-full max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogDescription className="flex items-center gap-2 font-medium uppercase tracking-[0.2em] text-primary">
              <Tag className="h-4 w-4" aria-hidden="true" />
              {editingUsageType ? "Nutzungstyp bearbeiten" : "Neuer Nutzungstyp"}
            </DialogDescription>
            <DialogTitle>{editingUsageType ? editingUsageType.name : "Nutzungstyp anlegen"}</DialogTitle>
          </DialogHeader>
          <UsageTypeForm usageType={editingUsageType ?? undefined} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function UsageTypeForm({ usageType }: { usageType?: UsageType }) {
  return (
    <form action={saveUsageTypeAction} className="mt-4 grid gap-4 sm:grid-cols-2">
      {usageType ? <input type="hidden" name="id" value={usageType.id} /> : null}
      <label className="text-sm font-medium">
        Code
        <input
          name="code"
          required
          readOnly={Boolean(usageType)}
          defaultValue={usageType?.code}
          className={usageType ? `${inputClass} bg-muted text-muted-foreground` : inputClass}
          placeholder="z.B. SCHULSPORT"
        />
        {usageType ? (
          <span className="mt-1 block text-xs text-muted-foreground">Der Code bleibt nach dem Anlegen unverändert.</span>
        ) : null}
      </label>
      <label className="text-sm font-medium">
        Name
        <input name="name" required defaultValue={usageType?.name} className={inputClass} placeholder="z.B. Schulsport" />
      </label>
      <label className="text-sm font-medium">
        Priorität
        <input
          name="priority"
          type="number"
          required
          min={1}
          max={9999}
          defaultValue={usageType?.priority ?? 10}
          className={inputClass}
        />
        <span className="mt-1 block text-xs text-muted-foreground">Niedrigere Zahl = höhere Priorität</span>
      </label>
      <div className="flex flex-col justify-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="requiresApproval" defaultChecked={usageType?.requiresApproval ?? true} />
          Genehmigung erforderlich
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="mayDisplaceLowerPriority"
            defaultChecked={usageType?.mayDisplaceLowerPriority ?? false}
          />
          Darf Typen mit niedrigerer Priorität verdrängen
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="isActive" defaultChecked={usageType?.isActive ?? true} />
          Aktiv
        </label>
      </div>
      <div className="sm:col-span-2">
        <ModalFormActions submitLabel={usageType ? "Änderungen speichern" : "Nutzungstyp anlegen"} />
      </div>
    </form>
  );
}
