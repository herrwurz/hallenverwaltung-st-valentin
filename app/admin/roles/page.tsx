import { AdminBackLink } from "@/components/admin-back-link";
import { AppFeedback } from "@/components/app-feedback";
import { PermissionsTable, type PermissionTableRow } from "@/components/admin-access-tables";
import { RoleManager } from "@/components/role-manager";
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
        Rollen und ihre aus der Datenbank geladenen Rechte. Auf eine Rolle klicken, um die Rechtezuordnung
        serverseitig geschützt zu bearbeiten.
      </p>
      <AdminBackLink />
      <AppFeedback
        messages={[
          { tone: "success", text: params.saved ? "Die Rolle-Rechte-Zuordnung wurde gespeichert." : undefined },
          { tone: "error", text: params.error },
        ]}
      />

      <RoleManager roles={data.roles} permissions={data.permissions} actorIsSuperAdmin={actorIsSuperAdmin} />

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
