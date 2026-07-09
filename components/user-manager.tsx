"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Users as UsersIcon } from "lucide-react";
import { saveUserAction } from "@/app/admin/actions";
import { UsersTable, type UserTableRow } from "@/components/admin-access-tables";
import { ModalFormActions } from "@/components/dialog-form-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { getUserAdministrationData } from "@/lib/services/admin/user-service";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";
const CARETAKER_ROLE_CODE = "CARETAKER";

type AdministrationData = Awaited<ReturnType<typeof getUserAdministrationData>>;
type UserRecord = AdministrationData["users"][number];

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-2 shadow-sm">
      <p className="text-2xl font-semibold leading-none tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function UserManager({
  users,
  roles,
  organizations,
  buildings,
}: {
  users: UserRecord[];
  roles: AdministrationData["roles"];
  organizations: AdministrationData["organizations"];
  buildings: AdministrationData["buildings"];
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

  const editingUser = editingId ? (users.find((user) => user.id === editingId) ?? null) : null;
  const activeCount = users.filter((user) => user.isActive).length;

  const tableRows: UserTableRow[] = users.map((user) => ({
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    roles: user.roles.map(({ role }) => role.name).join(", ") || "Keine Rolle",
    organizations:
      user.organizationMemberships
        .map((membership) =>
          membership.organization.status === "ACTIVE"
            ? membership.organization.name
            : `${membership.organization.name} (${membership.organization.status === "BLOCKED" ? "gesperrt" : "inaktiv"})`,
        )
        .join(", ") || "Keine Organisation",
    isActive: user.isActive,
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
          <StatChip label="Benutzer" value={users.length} />
          <StatChip label="Aktiv" value={activeCount} />
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Neuer Benutzer
        </Button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <UsersTable rows={tableRows} onRowClick={(row) => openEdit(row.id)} />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] w-full max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogDescription className="flex items-center gap-2 font-medium uppercase tracking-[0.2em] text-primary">
              <UsersIcon className="h-4 w-4" aria-hidden="true" />
              {editingUser ? "Benutzer bearbeiten" : "Neuer Benutzer"}
            </DialogDescription>
            <DialogTitle>{editingUser ? editingUser.displayName : "Benutzer anlegen"}</DialogTitle>
          </DialogHeader>
          {editingUser?.organizationMemberships.some((membership) => membership.organization.status !== "ACTIVE") ? (
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700">
              Hinweis: Mindestens eine aktive Mitgliedschaft verweist auf eine gesperrte oder inaktive Organisation.
            </p>
          ) : null}
          <UserForm roles={roles} organizations={organizations} buildings={buildings} user={editingUser ?? undefined} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function UserForm({
  roles,
  organizations,
  buildings,
  user,
}: {
  roles: AdministrationData["roles"];
  organizations: AdministrationData["organizations"];
  buildings: AdministrationData["buildings"];
  user?: UserRecord;
}) {
  const roleIds = new Set(user?.roles.map(({ roleId }) => roleId));
  const memberships = new Map(user?.organizationMemberships.map((membership) => [membership.organizationId, membership]));
  const primaryOrganizationId = user?.organizationMemberships.find((membership) => membership.isPrimary)?.organizationId;
  const functionValue = user?.organizationMemberships[0]?.function ?? "Mitglied";
  const isCaretaker = user?.roles.some(({ role }) => role.code === CARETAKER_ROLE_CODE) ?? false;
  const caretakerBuildingIds = new Set(user?.caretaker?.buildings.map((bc) => bc.building.id) ?? []);

  return (
    <form action={saveUserAction} className="mt-4 space-y-5">
      {user ? <input type="hidden" name="id" value={user.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Anzeigename
          <input name="displayName" required defaultValue={user?.displayName} className={inputClass} />
        </label>
        <label className="text-sm font-medium">
          E-Mail
          <input name="email" type="email" required autoComplete="off" defaultValue={user?.email} className={inputClass} />
        </label>
        <label className="text-sm font-medium">
          {user ? "Neues Passwort (optional)" : "Passwort"}
          <input name="password" type="password" required={!user} minLength={12} autoComplete="new-password" className={inputClass} />
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
          <input type="checkbox" name="isActive" defaultChecked={user?.isActive ?? true} />
          Aktiv
        </label>
      </div>
      <fieldset className="rounded-xl border border-border p-4">
        <legend className="px-2 text-sm font-medium">Rollen</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {roles.map((role) => (
            <label key={role.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="roleIds" value={role.id} defaultChecked={roleIds.has(role.id)} />
              {role.name}
            </label>
          ))}
        </div>
      </fieldset>
      {(isCaretaker || buildings.length > 0) ? (
        <fieldset className="rounded-xl border border-border p-4">
          <legend className="px-2 text-sm font-medium">Gebäudezuordnung (Hallenwart)</legend>
          <p className="mb-3 text-xs text-muted-foreground">
            Nur relevant, wenn die Rolle „Hallenwart“ vergeben wird.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {buildings.map((building) => (
              <label key={building.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="caretakerBuildingIds"
                  value={building.id}
                  defaultChecked={caretakerBuildingIds.has(building.id)}
                />
                {building.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <fieldset className="rounded-xl border border-border p-4">
        <legend className="px-2 text-sm font-medium">Organisationen</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {organizations.map((organization) => (
            <label key={organization.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="organizationIds"
                value={organization.id}
                defaultChecked={memberships.has(organization.id)}
              />
              {organization.name}
            </label>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Funktion in zugeordneten Organisationen
            <input name="membershipFunction" defaultValue={functionValue} className={inputClass} />
          </label>
          <label className="text-sm font-medium">
            Primäre Organisation
            <select name="primaryOrganizationId" defaultValue={primaryOrganizationId ?? ""} className={inputClass}>
              <option value="">Keine primäre Organisation</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>
      <ModalFormActions submitLabel={user ? "Änderungen speichern" : "Benutzer anlegen"} />
    </form>
  );
}
