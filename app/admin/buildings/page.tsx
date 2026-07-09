import { AdminBackLink } from "@/components/admin-back-link";
import { AdminFeedback } from "@/components/admin-feedback";
import { BuildingManager } from "@/components/building-manager";
import { requirePermission } from "@/lib/permissions";
import { getBuildingAdministrationData } from "@/lib/services/admin/building-service";
import { getHolidayOptions } from "@/lib/services/holiday-service";

type PageProps = {
  searchParams: Promise<{ saved?: string; closureSaved?: string; error?: string }>;
};

export default async function BuildingsPage({ searchParams }: PageProps) {
  await requirePermission("MANAGE_USERS");
  const [params, data, holidays] = await Promise.all([searchParams, getBuildingAdministrationData(), getHolidayOptions()]);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Gebäude</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Gebäude-Verwaltung</h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Standorte erfassen, aktivieren und einem Hauswart zuordnen. Auf einen Eintrag klicken, um ihn zu bearbeiten.
      </p>
      <AdminBackLink />
      <div className="mt-8">
        <AdminFeedback {...params} />
      </div>

      <BuildingManager buildings={data.buildings} caretakers={data.caretakers} holidays={holidays} />
    </>
  );
}
