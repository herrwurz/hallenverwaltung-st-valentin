import { updateRolePermissionsAction } from "@/app/admin/roles/actions";
import { AdminBackLink } from "@/components/admin-back-link";
import { AppFeedback } from "@/components/app-feedback";
import {
  PermissionsTable,
  RolesTable,
  type PermissionTableRow,
  type RoleTableRow,
} from "@/components/admin-access-tables";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";
import { getRoleAdministrationData } from "@/lib/services/admin/role-service";

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function RolesPage({ searchParams }: PageProps) {
  const sessionUser = await requirePermission("MANAGE_USERS");
  const [params, data] = await Promise.all([searchParams, getRoleAdministrationData()]);
  const actorIsSuperAdmin = sessionUser.roles.includes("SUPER_ADMIN");
  const roleRows: RoleTableRow[] = data.roles.map((role) => ({
    id: role.id,
    name: role.name,
    code: role.code,
    userCount: role._count.users,
    permissionCount: role.permissions.length,
  }));
  const permissionRows: PermissionTableRow[] = data.permissions.map((permission) => ({
    id: permission.id,
    name: permission.name,
    code: permission.code,
  }));

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Rollen / Rechte</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Berechtigungsübersicht</h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Rollen und ihre aus der Datenbank geladenen Rechte. Zuordnungen können serverseitig geschützt bearbeitet werden.
      </p>
      <AdminBackLink />
      <AppFeedback
        messages={[
          { tone: "success", text: params.saved ? "Die Rolle-Rechte-Zuordnung wurde gespeichert." : undefined },
          { tone: "error", text: params.error },
        ]}
      />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Rollen</CardTitle>
          <CardDescription>Filterbare Übersicht der Rollen und Benutzerzuordnungen.</CardDescription>
        </CardHeader>
        <CardContent>
          <RolesTable rows={roleRows} />
        </CardContent>
      </Card>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        {data.roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <div className="flex justify-between gap-4">
                <div>
                  <CardTitle>{role.name}</CardTitle>
                  <CardDescription>{role.code}</CardDescription>
                </div>
                <Badge variant="outline">{role._count.users} Benutzer</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <form action={updateRolePermissionsAction} className="space-y-4">
                <input type="hidden" name="roleId" value={role.id} />
                {role.code === "SUPER_ADMIN" ? (
                  <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700">
                    SUPER_ADMIN darf nur durch SUPER_ADMIN bearbeitet werden und muss alle Rechte behalten.
                  </p>
                ) : null}
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.permissions.map((permission) => {
                    const checked = role.permissions.some((entry) => entry.permissionId === permission.id);
                    const disabled = role.code === "SUPER_ADMIN" && !actorIsSuperAdmin;

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
                <div className="text-right">
                  <Button type="submit" disabled={role.code === "SUPER_ADMIN" && !actorIsSuperAdmin}>
                    Rechte speichern
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="mt-10">
        <CardHeader>
          <CardTitle>Verfügbare Rechte</CardTitle>
          <CardDescription>Alle Rechte werden aus der Datenbank geladen.</CardDescription>
        </CardHeader>
        <CardContent>
          <PermissionsTable rows={permissionRows} />
        </CardContent>
      </Card>
    </>
  );
}
