import { AdminBackLink } from "@/components/admin-back-link";
import { AdminFeedback } from "@/components/admin-feedback";
import { RoomManager } from "@/components/room-manager";
import { requirePermission } from "@/lib/permissions";
import { getRoomAdministrationData } from "@/lib/services/admin/room-service";
import { getHolidayOptions } from "@/lib/services/holiday-service";

type PageProps = {
  searchParams: Promise<{ saved?: string; closureSaved?: string; error?: string }>;
};

export default async function RoomsPage({ searchParams }: PageProps) {
  await requirePermission("MANAGE_USERS");
  const [params, data, holidays] = await Promise.all([searchParams, getRoomAdministrationData(), getHolidayOptions()]);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Räume</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Raum-Verwaltung</h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Räume, Betriebsstatus und optionale Teilbereichsbeziehungen pflegen. Auf einen Eintrag klicken, um ihn zu
        bearbeiten.
      </p>
      <AdminBackLink />
      <div className="mt-8">
        <AdminFeedback {...params} />
      </div>

      <RoomManager rooms={data.rooms} buildings={data.buildings} holidays={holidays} />
    </>
  );
}
