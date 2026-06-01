import { AdminBackLink } from "@/components/admin-back-link";
import { requirePermission } from "@/lib/permissions";
import { getRoleAdministrationData } from "@/lib/services/admin/role-service";

export default async function RolesPage() {
  await requirePermission("MANAGE_USERS");
  const data = await getRoleAdministrationData();

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-400">Rollen / Rechte</p>
      <h2 className="mt-3 text-3xl font-semibold">Berechtigungsübersicht</h2>
      <p className="mt-3 text-slate-300">
        Rollen und ihre aus der Datenbank geladenen Rechte. Die Zuordnung ist in dieser Phase nur lesbar.
      </p>
      <AdminBackLink />
      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        {data.roles.map((role) => (
          <article key={role.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex justify-between gap-4">
              <div>
                <h3 className="font-medium">{role.name}</h3>
                <p className="mt-1 text-sm text-slate-400">{role.code}</p>
              </div>
              <span className="text-sm text-slate-400">{role._count.users} Benutzer</span>
            </div>
            <ul className="mt-4 flex flex-wrap gap-2">
              {role.permissions.map(({ permission }) => (
                <li key={permission.id} className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200">
                  {permission.name}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
      <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="text-lg font-medium">Verfügbare Rechte</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {data.permissions.map((permission) => (
            <div key={permission.id} className="rounded-lg border border-slate-800 p-3">
              <p className="text-sm font-medium">{permission.name}</p>
              <p className="mt-1 text-xs text-slate-400">{permission.code}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
