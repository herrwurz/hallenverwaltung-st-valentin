import { saveUserAction } from "@/app/admin/actions";
import { AdminBackLink } from "@/components/admin-back-link";
import { AdminFeedback } from "@/components/admin-feedback";
import { FormActions } from "@/components/form-actions";
import { requirePermission } from "@/lib/permissions";
import { getUserAdministrationData } from "@/lib/services/admin/user-service";

const inputClass = "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm";

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function UsersPage({ searchParams }: PageProps) {
  await requirePermission("MANAGE_USERS");
  const [params, data] = await Promise.all([searchParams, getUserAdministrationData()]);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-400">Benutzer</p>
      <h2 className="mt-3 text-3xl font-semibold">Benutzer-Verwaltung</h2>
      <p className="mt-3 text-slate-300">
        Benutzerzugang, Rollen und Organisationsmitgliedschaften verwalten.
      </p>
      <AdminBackLink />
      <div className="mt-8">
        <AdminFeedback {...params} />
      </div>
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="text-lg font-medium">Neuer Benutzer</h3>
        <UserForm roles={data.roles} organizations={data.organizations} />
      </section>
      <section className="mt-8 space-y-4">
        {data.users.map((user) => (
          <details key={user.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <summary className="cursor-pointer list-none">
              <div className="flex justify-between gap-4">
                <div>
                  <h3 className="font-medium">{user.displayName}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {user.email} | {user.roles.map(({ role }) => role.name).join(", ") || "Keine Rolle"}
                  </p>
                </div>
                <span className={user.isActive ? "text-emerald-300" : "text-slate-400"}>
                  {user.isActive ? "Aktiv" : "Inaktiv"}
                </span>
              </div>
            </summary>
            <UserForm roles={data.roles} organizations={data.organizations} user={user} />
          </details>
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
  const memberships = new Map(
    user?.organizationMemberships.map((membership) => [membership.organizationId, membership]),
  );
  const primaryOrganizationId = user?.organizationMemberships.find((membership) => membership.isPrimary)?.organizationId;
  const functionValue = user?.organizationMemberships[0]?.function ?? "Mitglied";

  return (
    <form action={saveUserAction} className="mt-5 space-y-5">
      {user ? <input type="hidden" name="id" value={user.id} /> : null}
      <div className="grid gap-4 lg:grid-cols-4">
        <label className="text-sm text-slate-300">
          Anzeigename
          <input name="displayName" required defaultValue={user?.displayName} className={inputClass} />
        </label>
        <label className="text-sm text-slate-300">
          E-Mail
          <input name="email" type="email" required defaultValue={user?.email} className={inputClass} />
        </label>
        <label className="text-sm text-slate-300">
          {user ? "Neues Passwort (optional)" : "Passwort"}
          <input name="password" type="password" required={!user} minLength={12} className={inputClass} />
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-300">
          <input type="checkbox" name="isActive" defaultChecked={user?.isActive ?? true} />
          Aktiv
        </label>
      </div>
      <fieldset className="rounded-lg border border-slate-800 p-4">
        <legend className="px-2 text-sm font-medium text-slate-300">Rollen</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((role) => (
            <label key={role.id} className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="roleIds" value={role.id} defaultChecked={roleIds.has(role.id)} />
              {role.name}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="rounded-lg border border-slate-800 p-4">
        <legend className="px-2 text-sm font-medium text-slate-300">Organisationen</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.map((organization) => (
            <label key={organization.id} className="flex items-center gap-2 text-sm text-slate-300">
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
          <label className="text-sm text-slate-300">
            Funktion in zugeordneten Organisationen
            <input name="membershipFunction" defaultValue={functionValue} className={inputClass} />
          </label>
          <label className="text-sm text-slate-300">
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
      <div>
        <FormActions submitLabel={user ? "Änderungen speichern" : "Benutzer anlegen"} cancelHref="/admin/users" />
      </div>
    </form>
  );
}
