import {
  createAccessMediumAction,
  deactivateAccessMediumAction,
  issueAccessMediumAction,
  returnAccessAssignmentAction,
} from "@/app/admin/access/actions";
import { getAccessMediumTypeLabel } from "@/lib/access-labels";
import { requirePermission } from "@/lib/permissions";
import { accessMediumTypes, getAdminAccessData } from "@/lib/services/access-service";

const inputClass = "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm";
const dateFormatter = new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" });

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function AdminAccessPage({ searchParams }: PageProps) {
  await requirePermission("MANAGE_ACCESS");
  const [params, data] = await Promise.all([searchParams, getAdminAccessData()]);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-400">Hallenwart</p>
      <h2 className="mt-3 text-3xl font-semibold">Zutrittsverwaltung</h2>
      <p className="mt-3 text-slate-300">
        Schluessel, RFID-Karten und elektronische Zutritte verwalten. Noch keine Kopplung an ein externes Tuer- oder
        Schliesssystem.
      </p>

      {params.error ? (
        <p className="mt-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">{params.error}</p>
      ) : null}
      {params.saved ? (
        <p className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          Zutrittsdaten wurden gespeichert.
        </p>
      ) : null}

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="text-lg font-medium">Zutrittsmedium anlegen</h3>
        <form action={createAccessMediumAction} className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="text-sm text-slate-300">
            Gebaeude
            <select name="buildingId" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                Bitte waehlen
              </option>
              {data.buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-300">
            Raum optional
            <select name="roomId" defaultValue="" className={inputClass}>
              <option value="">Gebaeudeweit</option>
              {data.rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.building.name} - {room.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-300">
            Typ
            <select name="type" required defaultValue="KEY" className={inputClass}>
              {accessMediumTypes.map((type) => (
                <option key={type} value={type}>
                  {getAccessMediumTypeLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-300">
            Kennung / Nummer
            <input name="identifier" required maxLength={100} className={inputClass} />
          </label>
          <div className="lg:col-span-2 lg:text-right">
            <button className="rounded-lg bg-sky-500 px-5 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400">
              Medium anlegen
            </button>
          </div>
        </form>
      </section>

      <section className="mt-8 space-y-3">
        {data.accessMedia.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
            Noch keine Zutrittsmedien vorhanden.
          </p>
        ) : (
          data.accessMedia.map((medium) => {
            const activeAssignment = medium.assignments.find((assignment) => !assignment.returnedAt);

            return (
              <article key={medium.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium">
                      {medium.identifier} | {getAccessMediumTypeLabel(medium.type)}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {medium.building.name}
                      {medium.room ? ` - ${medium.room.name}` : " | gebaeudeweit"}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm ${medium.isActive ? "bg-emerald-950 text-emerald-200" : "bg-slate-800 text-slate-300"}`}>
                    {medium.isActive ? "Aktiv" : "Inaktiv"}
                  </span>
                </div>

                {activeAssignment ? (
                  <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
                    <p>
                      Ausgegeben an {activeAssignment.issuedToName}
                      {activeAssignment.organization ? ` (${activeAssignment.organization.name})` : ""} seit{" "}
                      {dateFormatter.format(activeAssignment.issuedAt)}
                    </p>
                    <form action={returnAccessAssignmentAction} className="mt-3">
                      <input type="hidden" name="assignmentId" value={activeAssignment.id} />
                      <button className="rounded-lg border border-sky-700 px-4 py-2 text-sm text-sky-200 hover:bg-sky-950">
                        Rueckgabe erfassen
                      </button>
                    </form>
                  </div>
                ) : medium.isActive ? (
                  <form action={issueAccessMediumAction} className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                    <input type="hidden" name="accessMediumId" value={medium.id} />
                    <label className="text-sm text-slate-300">
                      Organisation optional
                      <select name="organizationId" defaultValue="" className={inputClass}>
                        <option value="">Keine Organisation</option>
                        {data.organizations.map((organization) => (
                          <option key={organization.id} value={organization.id}>
                            {organization.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm text-slate-300">
                      Empfaenger
                      <input name="issuedToName" required maxLength={150} className={inputClass} />
                    </label>
                    <div className="self-end">
                      <button className="rounded-lg bg-sky-500 px-5 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400">
                        Ausgeben
                      </button>
                    </div>
                  </form>
                ) : null}

                {!activeAssignment && medium.isActive ? (
                  <form action={deactivateAccessMediumAction} className="mt-4">
                    <input type="hidden" name="accessMediumId" value={medium.id} />
                    <button className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
                      Medium deaktivieren
                    </button>
                  </form>
                ) : null}
              </article>
            );
          })
        )}
      </section>
    </>
  );
}
