import { createAdminDocumentAction } from "@/app/admin/documents/actions";
import { AppFeedback } from "@/components/app-feedback";
import { DocumentsDataTable, type DocumentTableRow } from "@/components/phase25-data-tables";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDocumentTypeLabel } from "@/lib/document-damage-labels";
import { requirePermission } from "@/lib/permissions";
import { documentTypes, getAdminDocumentData } from "@/lib/services/document-service";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";
const dateFormatter = new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" });

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

function documentTargetLabel(document: Awaited<ReturnType<typeof getAdminDocumentData>>["documents"][number]) {
  if (document.organization) {
    return document.organization.name;
  }

  if (document.building) {
    return document.building.name;
  }

  if (document.room) {
    return `${document.room.building.name} - ${document.room.name}`;
  }

  return "Ohne Zuordnung";
}

export default async function AdminDocumentsPage({ searchParams }: PageProps) {
  await requirePermission("MANAGE_DOCUMENTS");
  const [params, data] = await Promise.all([searchParams, getAdminDocumentData()]);
  const documentRows: DocumentTableRow[] = data.documents.map((document) => ({
    id: document.id,
    fileName: document.fileName,
    target: documentTargetLabel(document),
    type: getDocumentTypeLabel(document.type),
    uploadedAt: dateFormatter.format(document.uploadedAt),
    storageKey: document.storageKey,
  }));

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Dokumente</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Dokumentenverwaltung</h2>
      <p className="mt-3 text-muted-foreground">
        Verwaltung von Dokument-Metadaten für Organisationen, Gebäude und Räume. Dateiablage wird über Storage-Key
        vorbereitet.
      </p>
      <AppFeedback
        messages={[
          { tone: "error", text: params.error },
          { tone: "success", text: params.saved ? "Dokument wurde gespeichert." : undefined },
        ]}
      />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Dokument erfassen</CardTitle>
          <CardDescription>Genau eine Zielzuordnung auswählen: Organisation, Gebäude oder Raum.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createAdminDocumentAction} className="grid gap-4 lg:grid-cols-2">
            <label className="text-sm font-medium">
              Organisation
              <select name="organizationId" defaultValue="" className={inputClass}>
                <option value="">Keine Organisation</option>
                {data.organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Gebäude
              <select name="buildingId" defaultValue="" className={inputClass}>
                <option value="">Kein Gebäude</option>
                {data.buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
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
            <label className="text-sm font-medium">
              Dokumenttyp
              <select name="type" required defaultValue="OTHER" className={inputClass}>
                {documentTypes.map((type) => (
                  <option key={type} value={type}>
                    {getDocumentTypeLabel(type)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Dateiname
              <input name="fileName" required className={inputClass} />
            </label>
            <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground lg:col-span-2">
              Der interne Storage-Key wird serverseitig aus Zuordnung, Dokumenttyp, Zeitpunkt und Dateiname erzeugt.
            </p>
            <div className="lg:col-span-2 lg:text-right">
              <Button>Dokument speichern</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Dokumente</CardTitle>
          <CardDescription>Filterbare Ablage-Metadaten für Organisationen, Gebäude und Räume.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.documents.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted p-5 text-sm text-muted-foreground">
              Noch keine Dokumente vorhanden.
            </p>
          ) : (
            <DocumentsDataTable rows={documentRows} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
