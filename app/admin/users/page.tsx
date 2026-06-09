import { saveUserAction } from "@/app/admin/actions";
import { AdminBackLink } from "@/components/admin-back-link";
import { UsersTable, type UserTableRow } from "@/components/admin-access-tables";
import { AdminFeedback } from "@/components/admin-feedback";
import { FormActions } from "@/components/form-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";
import { getUserAdministrationData } from "@/lib/services/admin/user-service";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function UsersPage({ searchParams }: PageProps) {
  await requirePermission("MANAGE_USERS");
  const [params, data] = await Promise.all([searchParams, getUserAdministrationData()]);
  const tableRows: UserTableRow[] = data.users.map((user) => ({
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    roles: user.roles.map(({ role }) => role.name).join(", ") || "Keine Rolle",
    organizations:
      user.organizationMemberships.map((membership) => membership.organization.name).join(", ") || "Keine Organisation",
    isActive: user.isActive,
  }));

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Benutzer</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Benutzer-Verwaltung</h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Benutzerzugang, Rollen und Organisationsmitgliedschaften verwalten.
      </p>
      <AdminBackLink />
      <div className="mt-8">
        <AdminFeedback {...params} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Neuer Benutzer</CardTitle>
          <CardDescription>Rollen und Organisationen werden serverseitig validiert.</CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm roles={data.roles} organizations={data.organizations} />
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Benutzerübersicht</CardTitle>
          <CardDescription>Filterbare Übersicht aller Benutzer, Rollen und Mitgliedschaften.</CardDescription>
        </CardHeader>
        <CardContent>
          <UsersTable rows={tableRows} />
        </CardContent>
      </Card>

      <section className="mt-8 space-y-4">
        <h3 className="text-xl font-semibold tracking-tight">Benutzer bearbeiten</h3>
        {data.users.map((user) => (
          <Card key={user.id}>
            <CardHeader>
              <div className="flex justify-between gap-4">
                <div>
                  <CardTitle>{user.displayName}</CardTitle>
                  <CardDescription>
                    {user.email} | {user.roles.map(({ role }) => role.name).join(", ") || "Keine Rolle"}
                  </CardDescription>
                </div>
                <Badge variant={user.isActive ? "success" : "secondary"}>{user.isActive ? "Aktiv" : "Inaktiv"}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <UserForm roles={data.roles} organizations={data.organizations} user={user} />
            </CardContent>
          </Card>
        ))}
      </section>
    </>
  );
}

type UserData = Awaited<ReturnType<typeof getUserAdministrationData>>;

function UserForm({
  roles,
  organizations,
  user,
}: {
  roles: UserData["roles"];
  organizations: UserData["organizations"];
  user?: UserData["users"][number];
}) {
  const roleIds = new Set(user?.roles.map(({ roleId }) => roleId));
  const memberships = new Map(user?.organizationMemberships.map((membership) => [membership.organizationId, membership]));
  const primaryOrganizationId = user?.organizationMemberships.find((membership) => membership.isPrimary)?.organizationId;
  const functionValue = user?.organizationMemberships[0]?.function ?? "Mitglied";

  return (
    <form action={saveUserAction} className="space-y-5">
      {user ? <input type="hidden" name="id" value={user.id} /> : null}
      <div className="grid gap-4 lg:grid-cols-4">
        <label className="text-sm font-medium">
          Anzeigename
          <input name="displayName" required defaultValue={user?.displayName} className={inputClass} />
        </label>
        <label className="text-sm font-medium">
          E-Mail
          <input name="email" type="email" required defaultValue={user?.email} className={inputClass} />
        </label>
        <label className="text-sm font-medium">
          {user ? "Neues Passwort (optional)" : "Passwort"}
          <input name="password" type="password" required={!user} minLength={12} className={inputClass} />
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
          <input type="checkbox" name="isActive" defaultChecked={user?.isActive ?? true} />
          Aktiv
        </label>
      </div>
      <fieldset className="rounded-xl border border-border p-4">
        <legend className="px-2 text-sm font-medium">Rollen</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((role) => (
            <label key={role.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="roleIds" value={role.id} defaultChecked={roleIds.has(role.id)} />
              {role.name}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="rounded-xl border border-border p-4">
        <legend className="px-2 text-sm font-medium">Organisationen</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
      <FormActions submitLabel={user ? "Änderungen speichern" : "Benutzer anlegen"} cancelHref="/admin/users" />
    </form>
  );
}
