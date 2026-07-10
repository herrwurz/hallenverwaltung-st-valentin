import { AdminBackLink } from "@/components/admin-back-link";
import { AdminFeedback } from "@/components/admin-feedback";
import { UsageTypeManager } from "@/components/usage-type-manager";
import { requirePermission } from "@/lib/permissions";
import { getUsageTypeAdministrationData } from "@/lib/services/admin/usage-type-service";

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function UsageTypesPage({ searchParams }: PageProps) {
  await requirePermission("MANAGE_USERS");
  const [params, usageTypes] = await Promise.all([searchParams, getUsageTypeAdministrationData()]);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Stammdaten</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Nutzungstypen</h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Nutzungstypen kategorisieren Buchungen und steuern Genehmigungspflicht und Verdrängungslogik.
        Niedrigere Prioritätszahl = höhere Priorität. Auf einen Eintrag klicken, um ihn zu bearbeiten.
      </p>
      <AdminBackLink />
      <div className="mt-8">
        <AdminFeedback {...params} />
      </div>

      <UsageTypeManager usageTypes={usageTypes} />
    </>
  );
}
