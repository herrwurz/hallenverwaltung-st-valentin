import { AppBackLink } from "@/components/app-back-link";
import { createOrganizationDocumentAction } from "@/app/portal/documents/actions";
import { AppFeedback } from "@/components/app-feedback";
import { FormActions } from "@/components/form-actions";
import { PortalOrganizationField } from "@/components/portal-organization-field";
import { getDocumentTypeLabel } from "@/lib/document-damage-labels";
import { requirePermission } from "@/lib/permissions";
import { documentTypes, getPortalDocumentData } from "@/lib/services/document-service";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const dateFormatter = new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" });

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function PortalDocumentsPage({ searchParams }: PageProps) {
  const user = await requirePermission("REQUEST_BOOKING");
  const [params, data] = await Promise.all([searchParams, getPortalDocumentData(user.id)]);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Portal</p>
      <h2 className="mt-3 text-3xl font-semibold">Dokumente</h2>
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

      <section className="mt-8 rounded-xl border border-border bg-card p-5">
        <h3 className="text-lg font-medium">Dokument erfassen</h3>
        {data.organizations.length === 0 ? (
          <p className="mt-4 text-sm text-amber-200">Keine aktive Organisation ist Ihrem Benutzer zugeordnet.</p>
        ) : (
          <form action={createOrganizationDocumentAction} className="mt-5 grid gap-4 lg:grid-cols-2">
            <PortalOrganizationField organizations={data.organizations} inputClassName={inputClass} />
            <label className="text-sm text-muted-foreground">
              Dokumenttyp
              <select name="type" required defaultValue="OTHER" className={inputClass}>
                {documentTypes.map((type) => (
                  <option key={type} value={type}>
                    {getDocumentTypeLabel(type)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-muted-foreground">
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
      </section>

      <section className="mt-8 space-y-4">
        {data.organizations.map((organization) => (
          <article key={organization.id} className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-medium">{organization.name}</h3>
            {organization.documents.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Noch keine Dokumente erfasst.</p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm">
                {organization.documents.map((document) => (
                  <li key={document.id} className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="font-medium text-slate-200">{document.fileName}</p>
                    <p className="mt-1 text-muted-foreground">
                      {getDocumentTypeLabel(document.type)} | {dateFormatter.format(document.uploadedAt)}
                    </p>
                    <p className="mt-1 text-slate-500">{document.storageKey}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </section>
    </>
  );
}
