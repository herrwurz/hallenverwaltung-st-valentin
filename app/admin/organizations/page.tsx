import { AdminBackLink } from "@/components/admin-back-link";
import { AdminFeedback } from "@/components/admin-feedback";
import { OrganizationManager } from "@/components/organization-manager";
import { requirePermission } from "@/lib/permissions";
import { getOrganizationAdministrationData } from "@/lib/services/admin/organization-service";

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function OrganizationsPage({ searchParams }: PageProps) {
  await requirePermission("MANAGE_USERS");
  const [params, data] = await Promise.all([searchParams, getOrganizationAdministrationData()]);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Organisationen</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Organisationen-Verwaltung</h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Organisationstyp, Aktivität und verwaltungsseitige Sperre pflegen. Auf einen Eintrag klicken, um ihn zu
        bearbeiten.
      </p>
      <AdminBackLink />
      <div className="mt-8">
        <AdminFeedback {...params} />
      </div>

      <OrganizationManager
        organizations={data.organizations}
        organizationTypes={data.organizationTypes}
        tariffGroups={data.tariffGroups}
      />
    </>
  );
}
