import { AdminFeedback } from "@/components/admin-feedback";
import { FormActions } from "@/components/form-actions";
import { saveBuildingAction } from "@/app/admin/actions";
import { requirePermission } from "@/lib/permissions";
import { getBuildingAdministrationData } from "@/lib/services/admin/building-service";

const inputClass = "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm";

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function BuildingsPage({ searchParams }: PageProps) {
  await requirePermission("MANAGE_USERS");
  const [params, data] = await Promise.all([searchParams, getBuildingAdministrationData()]);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-400">Gebäude</p>
      <h2 className="mt-3 text-3xl font-semibold">Gebäude-Verwaltung</h2>
      <p className="mt-3 text-slate-300">Standorte erfassen, aktivieren und einem Hauswart zuordnen.</p>
      <div className="mt-8">
        <AdminFeedback {...params} />
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="text-lg font-medium">Neues Gebäude</h3>
        <BuildingForm caretakers={data.caretakers} />
      </section>

      <section className="mt-8 space-y-4">
        {data.buildings.map((building) => (
          <details key={building.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium">{building.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {building.code} | {building.rooms.length} Räume |{" "}
                    {building.caretakers[0]?.caretaker.name ?? "Kein Hauswart"}
                  </p>
                </div>
                <span className={building.isActive ? "text-emerald-300" : "text-slate-400"}>
                  {building.isActive ? "Aktiv" : "Inaktiv"}
                </span>
              </div>
            </summary>
            <BuildingForm caretakers={data.caretakers} building={building} />
          </details>
        ))}
      </section>
    </>
  );
}

type BuildingFormProps = {
  caretakers: Awaited<ReturnType<typeof getBuildingAdministrationData>>["caretakers"];
  building?: Awaited<ReturnType<typeof getBuildingAdministrationData>>["buildings"][number];
};

function BuildingForm({ caretakers, building }: BuildingFormProps) {
  return (
    <form action={saveBuildingAction} className="mt-5 grid gap-4 lg:grid-cols-4">
      {building ? <input type="hidden" name="id" value={building.id} /> : null}
      <label className="text-sm text-slate-300">
        Code
        <input name="code" required defaultValue={building?.code} className={inputClass} placeholder="VS_HAUPTPLATZ" />
      </label>
      <label className="text-sm text-slate-300">
        Name
        <input name="name" required defaultValue={building?.name} className={inputClass} />
      </label>
      <label className="text-sm text-slate-300">
        Adresse
        <input name="address" defaultValue={building?.address ?? ""} className={inputClass} />
      </label>
      <label className="text-sm text-slate-300">
        Primärer Hauswart
        <select
          name="caretakerId"
          defaultValue={building?.caretakers[0]?.caretakerId ?? ""}
          className={inputClass}
        >
          <option value="">Keine Zuordnung</option>
          {caretakers.map((caretaker) => (
            <option key={caretaker.id} value={caretaker.id}>
              {caretaker.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" name="isActive" defaultChecked={building?.isActive ?? true} />
        Aktiv
      </label>
      <div className="lg:col-span-3">
        <FormActions
          submitLabel={building ? "Änderungen speichern" : "Gebäude anlegen"}
          cancelHref="/admin/buildings"
        />
      </div>
    </form>
  );
}
