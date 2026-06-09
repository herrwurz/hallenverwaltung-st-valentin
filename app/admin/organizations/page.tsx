import { saveOrganizationAction } from "@/app/admin/actions";
import { AdminBackLink } from "@/components/admin-back-link";
import { AdminFeedback } from "@/components/admin-feedback";
import { OrganizationsTable, type OrganizationTableRow } from "@/components/admin-master-data-tables";
import { FormActions } from "@/components/form-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";
import { getOrganizationAdministrationData } from "@/lib/services/admin/organization-service";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function OrganizationsPage({ searchParams }: PageProps) {
  await requirePermission("MANAGE_USERS");
  const [params, data] = await Promise.all([searchParams, getOrganizationAdministrationData()]);
  const tableRows: OrganizationTableRow[] = data.organizations.map((organization) => ({
    id: organization.id,
    name: organization.name,
    organizationTypeName: organization.organizationType.name,
    memberCount: organization.members.length,
    status: organization.status,
    blockedReason: organization.blockedReason ?? "-",
  }));

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Organisationen</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Organisationen-Verwaltung</h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Organisationstyp, Aktivität und verwaltungsseitige Sperre pflegen.
      </p>
      <AdminBackLink />
      <div className="mt-8">
        <AdminFeedback {...params} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Neue Organisation</CardTitle>
          <CardDescription>Organisationen können aktiv, inaktiv oder für Buchungsanträge gesperrt sein.</CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationForm organizationTypes={data.organizationTypes} />
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Organisationsübersicht</CardTitle>
          <CardDescription>Filterbare Tabelle aller Organisationen und Mitgliederzahlen.</CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationsTable rows={tableRows} />
        </CardContent>
      </Card>

      <section className="mt-8 space-y-4">
        <h3 className="text-xl font-semibold tracking-tight">Organisationen bearbeiten</h3>
        {data.organizations.map((organization) => (
          <Card key={organization.id}>
            <CardHeader>
              <div className="flex justify-between gap-4">
                <div>
                  <CardTitle>{organization.name}</CardTitle>
                  <CardDescription>
                    {organization.organizationType.name} | {organization.members.length} Mitglieder
                  </CardDescription>
                </div>
                <Badge variant={organization.status === "ACTIVE" ? "success" : organization.status === "BLOCKED" ? "destructive" : "secondary"}>
                  {organization.status === "ACTIVE" ? "Aktiv" : organization.status === "BLOCKED" ? "Gesperrt" : "Inaktiv"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <OrganizationForm organizationTypes={data.organizationTypes} organization={organization} />
            </CardContent>
          </Card>
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
    <form action={saveOrganizationAction} className="grid gap-4 lg:grid-cols-4">
      {organization ? <input type="hidden" name="id" value={organization.id} /> : null}
      <label className="text-sm font-medium">
        Name
        <input name="name" required defaultValue={organization?.name} className={inputClass} />
      </label>
      <label className="text-sm font-medium">
        Organisationstyp
        <select name="organizationTypeId" required defaultValue={organization?.organizationTypeId ?? ""} className={inputClass}>
          <option value="" disabled>
            Bitte wählen
          </option>
          {organizationTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        Status
        <select name="status" defaultValue={organization?.status ?? "ACTIVE"} className={inputClass}>
          <option value="ACTIVE">Aktiv / entsperrt</option>
          <option value="BLOCKED">Gesperrt</option>
          <option value="INACTIVE">Inaktiv</option>
        </select>
      </label>
      <label className="text-sm font-medium">
        Sperr-/Stilllegungsgrund
        <input name="blockedReason" defaultValue={organization?.blockedReason ?? ""} className={inputClass} />
      </label>
      <div className="lg:col-span-4">
        <FormActions submitLabel={organization ? "Änderungen speichern" : "Organisation anlegen"} cancelHref="/admin/organizations" />
      </div>
    </form>
  );
}
