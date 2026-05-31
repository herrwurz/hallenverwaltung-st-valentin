import { createAdminDocumentAction } from "@/app/admin/documents/actions";
import { getDocumentTypeLabel } from "@/lib/document-damage-labels";
import { requirePermission } from "@/lib/permissions";
import { documentTypes, getAdminDocumentData } from "@/lib/services/document-service";

const inputClass = "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm";
const dateFormatter = new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" });

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function AdminDocumentsPage({ searchParams }: PageProps) {
  await requirePermission("MANAGE_DOCUMENTS");
  const [params, data] = await Promise.all([searchParams, getAdminDocumentData()]);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-400">Dokumente</p>
      <h2 className="mt-3 text-3xl font-semibold">Dokumentenverwaltung</h2>
      <p className="mt-3 text-slate-300">
        Verwaltung von Dokument-Metadaten fuer Organisationen, Gebaeude und Raeume. Dateiablage wird ueber Storage-Key
        vorbereitet.
      </p>
      {params.error ? (
        <p className="mt-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">{params.error}</p>
      ) : null}
      {params.saved ? (
        <p className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          Dokument wurde gespeichert.
        </p>
      ) : null}

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="text-lg font-medium">Dokument erfassen</h3>
        <form action={createAdminDocumentAction} className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="text-sm text-slate-300">
            Organisation
            <select name="organizationId" defaultValue="" className={inputClass}>
              <option value="" disabled>
                Keine Organisation
              </option>
              <option value="">Keine Organisation</option>
              {data.organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-300">
            Gebaeude
            <select name="buildingId" defaultValue="" className={inputClass}>
              <option value="">Kein Gebaeude</option>
              {data.buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-300">
            Raum
            <select name="roomId" defaultValue="" className={inputClass}>
              <option value="">Kein Raum</option>
              {data.rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.building.name} - {room.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-300">
            Dokumenttyp
            <select name="type" required defaultValue="OTHER" className={inputClass}>
              {documentTypes.map((type) => (
                <option key={type} value={type}>
                  {getDocumentTypeLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-300">
            Dateiname
            <input name="fileName" required className={inputClass} />
          </label>
          <label className="text-sm text-slate-300 lg:col-span-2">
            Ablagepfad / Storage-Key
            <input name="storageKey" required className={inputClass} />
          </label>
          <div className="lg:col-span-2 lg:text-right">
            <button className="rounded-lg bg-sky-500 px-5 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400">
              Dokument speichern
            </button>
          </div>
        </form>
      </section>

      <section className="mt-8 space-y-3">
        {data.documents.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
            Noch keine Dokumente vorhanden.
          </p>
        ) : (
          data.documents.map((document) => (
            <article key={document.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <h3 className="font-medium">{document.fileName}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {getDocumentTypeLabel(document.type)} | {dateFormatter.format(document.uploadedAt)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{document.storageKey}</p>
                </div>
                <p className="text-sm text-slate-300">
                  {document.organization?.name ??
                    document.building?.name ??
                    (document.room ? `${document.room.building.name} - ${document.room.name}` : "Ohne Zuordnung")}
                </p>
              </div>
            </article>
          ))
        )}
      </section>
    </>
  );
}
