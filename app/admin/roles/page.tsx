import { AdminBackLink } from "@/components/admin-back-link";
import {
  PermissionsTable,
  RolesTable,
  type PermissionTableRow,
  type RoleTableRow,
} from "@/components/admin-access-tables";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";
import { getRoleAdministrationData } from "@/lib/services/admin/role-service";

export default async function RolesPage() {
  await requirePermission("MANAGE_USERS");
  const data = await getRoleAdministrationData();
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
        Rollen und ihre aus der Datenbank geladenen Rechte. Die Zuordnung ist in dieser Phase nur lesbar.
      </p>
      <AdminBackLink />

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
              <ul className="flex flex-wrap gap-2">
                {role.permissions.map(({ permission }) => (
                  <li key={permission.id} className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                    {permission.name}
                  </li>
                ))}
              </ul>
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
