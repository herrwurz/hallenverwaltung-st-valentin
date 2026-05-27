import { saveOrganizationAction } from "@/app/admin/actions";
import { AdminFeedback } from "@/components/admin-feedback";
import { getOrganizationAdministrationData } from "@/lib/services/admin/organization-service";

const inputClass = "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm";

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function OrganizationsPage({ searchParams }: PageProps) {
  const [params, data] = await Promise.all([searchParams, getOrganizationAdministrationData()]);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-400">Organisationen</p>
      <h2 className="mt-3 text-3xl font-semibold">Organisationen-Verwaltung</h2>
      <p className="mt-3 text-slate-300">
        Organisationstyp, Aktivitaet und verwaltungsseitige Sperre pflegen.
      </p>
      <div className="mt-8">
        <AdminFeedback {...params} />
      </div>
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="text-lg font-medium">Neue Organisation</h3>
        <OrganizationForm organizationTypes={data.organizationTypes} />
      </section>
      <section className="mt-8 space-y-4">
        {data.organizations.map((organization) => (
          <details key={organization.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <summary className="cursor-pointer list-none">
              <div className="flex justify-between gap-4">
                <div>
                  <h3 className="font-medium">{organization.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {organization.organizationType.name} | {organization.members.length} Mitglieder
                  </p>
                </div>
                <span className={organization.status === "ACTIVE" ? "text-emerald-300" : "text-amber-300"}>
                  {organization.status}
                </span>
              </div>
            </summary>
            <OrganizationForm organizationTypes={data.organizationTypes} organization={organization} />
          </details>
        ))}
      </section>
    </>
  );
}

type OrganizationData = Awaited<ReturnType<typeof getOrganizationAdministrationData>>;

function OrganizationForm({
  organizationTypes,
  organization,
}: {
  organizationTypes: OrganizationData["organizationTypes"];
  organization?: OrganizationData["organizations"][number];
}) {
  return (
    <form action={saveOrganizationAction} className="mt-5 grid gap-4 lg:grid-cols-4">
      {organization ? <input type="hidden" name="id" value={organization.id} /> : null}
      <label className="text-sm text-slate-300">
        Name
        <input name="name" required defaultValue={organization?.name} className={inputClass} />
      </label>
      <label className="text-sm text-slate-300">
        Organisationstyp
        <select
          name="organizationTypeId"
          required
          defaultValue={organization?.organizationTypeId ?? ""}
          className={inputClass}
        >
          <option value="" disabled>
            Bitte waehlen
          </option>
          {organizationTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-slate-300">
        Status
        <select name="status" defaultValue={organization?.status ?? "ACTIVE"} className={inputClass}>
          <option value="ACTIVE">Aktiv / entsperrt</option>
          <option value="BLOCKED">Gesperrt</option>
          <option value="INACTIVE">Inaktiv</option>
        </select>
      </label>
      <label className="text-sm text-slate-300">
        Sperrgrund
        <input name="blockedReason" defaultValue={organization?.blockedReason ?? ""} className={inputClass} />
      </label>
      <div className="lg:col-span-4 lg:text-right">
        <button className="rounded-lg bg-sky-500 px-5 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400">
          {organization ? "Aenderungen speichern" : "Organisation anlegen"}
        </button>
      </div>
    </form>
  );
}
