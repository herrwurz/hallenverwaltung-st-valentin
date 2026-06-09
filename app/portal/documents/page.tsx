import { createOrganizationDocumentAction } from "@/app/portal/documents/actions";
import { AppBackLink } from "@/components/app-back-link";
import { AppFeedback } from "@/components/app-feedback";
import { FormActions } from "@/components/form-actions";
import { DocumentsDataTable, type DocumentTableRow } from "@/components/phase25-data-tables";
import { PortalOrganizationField } from "@/components/portal-organization-field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDocumentTypeLabel } from "@/lib/document-damage-labels";
import { requirePermission } from "@/lib/permissions";
import { documentTypes, getPortalDocumentData } from "@/lib/services/document-service";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";
const dateFormatter = new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" });

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function PortalDocumentsPage({ searchParams }: PageProps) {
  const user = await requirePermission("REQUEST_BOOKING");
  const [params, data] = await Promise.all([searchParams, getPortalDocumentData(user.id)]);
  const documents = data.organizations.flatMap((organization) =>
    organization.documents.map((document) => ({ ...document, organizationName: organization.name })),
  );
  const documentRows: DocumentTableRow[] = documents.map((document) => ({
    id: document.id,
    fileName: document.fileName,
    target: document.organizationName,
    type: getDocumentTypeLabel(document.type),
    uploadedAt: dateFormatter.format(document.uploadedAt),
    storageKey: document.storageKey,
  }));

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Portal</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Dokumente</h2>
      <p className="mt-3 text-muted-foreground">
        Dokumente werden in Phase 16 als sichere Metadaten erfasst. Ein echter Datei-Storage kann später angebunden
        werden.
      </p>
      <div className="mt-8 flex items-center justify-between">
        <AppBackLink href="/portal" label="Zurück zum Portal" />
      </div>
      <AppFeedback
        messages={[
          { tone: "error", text: params.error },
          { tone: "success", text: params.saved ? "Dokument wurde gespeichert." : undefined },
        ]}
      />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Dokument erfassen</CardTitle>
          <CardDescription>Metadaten speichern; der interne Storage-Key wird serverseitig erzeugt.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.organizations.length === 0 ? (
            <p className="text-sm text-warning-foreground">Keine aktive Organisation ist Ihrem Benutzer zugeordnet.</p>
          ) : (
            <form action={createOrganizationDocumentAction} className="grid gap-4 lg:grid-cols-2">
              <PortalOrganizationField organizations={data.organizations} inputClassName={inputClass} />
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
                <input name="fileName" required className={inputClass} placeholder="hallenordnung.pdf" />
              </label>
              <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                Der interne Storage-Key wird serverseitig erzeugt und nicht manuell eingegeben.
              </p>
              <div className="lg:col-span-2">
                <FormActions submitLabel="Dokument speichern" cancelHref="/portal" />
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Dokumente Ihrer Organisationen</CardTitle>
          <CardDescription>Alle gespeicherten Dokument-Metadaten in einer kompakten Tabellenansicht.</CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted p-5 text-sm text-muted-foreground">
              Noch keine Dokumente erfasst.
            </p>
          ) : (
            <DocumentsDataTable rows={documentRows} portal />
          )}
        </CardContent>
      </Card>
    </>
  );
}
