"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { updateRolePermissionsAction } from "@/app/admin/roles/actions";
import { RolesTable, type RoleTableRow } from "@/components/admin-access-tables";
import { ModalFormActions } from "@/components/dialog-form-actions";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { getRoleAdministrationData } from "@/lib/services/admin/role-service";

type AdministrationData = Awaited<ReturnType<typeof getRoleAdministrationData>>;
type RoleRecord = AdministrationData["roles"][number];

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-2 shadow-sm">
      <p className="text-2xl font-semibold leading-none tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function RoleManager({
  roles,
  permissions,
  actorIsSuperAdmin,
}: {
  roles: RoleRecord[];
  permissions: AdministrationData["permissions"];
  actorIsSuperAdmin: boolean;
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

  const editingRole = editingId ? (roles.find((role) => role.id === editingId) ?? null) : null;

  const tableRows: RoleTableRow[] = roles.map((role) => ({
    id: role.id,
    name: role.name,
    code: role.code,
    userCount: role._count.users,
    permissionCount: role.permissions.length,
  }));

  function openEdit(id: string) {
    setEditingId(id);
    setOpen(true);
  }

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-3">
        <StatChip label="Rollen" value={roles.length} />
        <StatChip label="Rechte gesamt" value={permissions.length} />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <RolesTable rows={tableRows} onRowClick={(row) => openEdit(row.id)} />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] w-full max-w-2xl overflow-y-auto">
          {editingRole ? (
            <>
              <DialogHeader>
                <DialogDescription className="flex items-center gap-2 font-medium uppercase tracking-[0.2em] text-primary">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Rechte bearbeiten
                </DialogDescription>
                <DialogTitle className="flex items-center gap-3">
                  {editingRole.name}
                  <Badge variant="outline">{editingRole._count.users} Benutzer</Badge>
                </DialogTitle>
              </DialogHeader>
              <RolePermissionsForm role={editingRole} permissions={permissions} actorIsSuperAdmin={actorIsSuperAdmin} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function RolePermissionsForm({
  role,
  permissions,
  actorIsSuperAdmin,
}: {
  role: RoleRecord;
  permissions: AdministrationData["permissions"];
  actorIsSuperAdmin: boolean;
}) {
  const disabled = role.code === "SUPER_ADMIN" && !actorIsSuperAdmin;

  return (
    <form action={updateRolePermissionsAction} className="mt-4 space-y-4">
      <input type="hidden" name="roleId" value={role.id} />
      {role.code === "SUPER_ADMIN" ? (
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700">
          SUPER_ADMIN darf nur durch SUPER_ADMIN bearbeitet werden und muss alle Rechte behalten.
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        {permissions.map((permission) => {
          const checked = role.permissions.some((entry) => entry.permissionId === permission.id);

          return (
            <label key={permission.id} className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm">
              <input
                type="checkbox"
                name="permissionIds"
                value={permission.id}
                defaultChecked={checked}
                disabled={disabled}
                className="mt-1"
              />
              <span>
                <span className="block font-medium">{permission.name}</span>
                <span className="text-xs text-muted-foreground">{permission.code}</span>
              </span>
            </label>
          );
        })}
      </div>
      <ModalFormActions submitLabel="Rechte speichern" submitDisabled={disabled} />
    </form>
  );
}
