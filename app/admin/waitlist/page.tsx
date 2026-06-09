import { AppBackLink } from "@/components/app-back-link";
import { WaitlistTable, type WaitlistTableRow } from "@/components/admin-access-tables";
import { StatusFilterSelect } from "@/components/status-filter-select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";
import {
  adminWaitlistFilterStatuses,
  getWaitlistStatusLabel,
  type AdminWaitlistFilterKey,
} from "@/lib/waitlist-status";
import { getWaitlistForAdmin } from "@/lib/services/waitlist-service";

const dateFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

type PageProps = {
  searchParams: Promise<{ status?: AdminWaitlistFilterKey }>;
};

export default async function AdminWaitlistPage({ searchParams }: PageProps) {
  const user = await requirePermission("VIEW_BOOKINGS");
  const params = await searchParams;
  const entries = await getWaitlistForAdmin(user.id, params.status);
  const selectedStatus = params.status ?? "";
  const rows: WaitlistTableRow[] = entries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    organizationName: entry.organization.name,
    roomName: `${entry.room.building.name} - ${entry.room.name}`,
    startsAtLabel: dateFormatter.format(entry.startsAt),
    endsAtLabel: dateFormatter.format(entry.endsAt),
    usageTypeName: entry.usageType.name,
    placedAtLabel: dateFormatter.format(entry.placedAt),
    offerExpiresAtLabel: entry.offerExpiresAt ? dateFormatter.format(entry.offerExpiresAt) : "-",
    status: entry.status,
    statusLabel: getWaitlistStatusLabel(entry.status),
  }));

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Warteliste</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Wartelistenübersicht</h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Alle Wartelistenplätze mit Status, Frist und Organisationsbezug. Die Reihenfolge bleibt in dieser Phase
            unverändert und richtet sich nach dem Eingangszeitpunkt.
          </p>
        </div>
        <AppBackLink href="/admin" label="Zurück zum Dashboard" />
      </div>

      <StatusFilterSelect
        selectedValue={selectedStatus}
        options={[
          { value: "", label: "Aktiv + angeboten" },
          { value: "ALL", label: "Alle" },
          ...adminWaitlistFilterStatuses.map((status) => ({
            value: status,
            label: getWaitlistStatusLabel(status),
          })),
        ]}
      />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Wartelisteneinträge</CardTitle>
          <CardDescription>Filterbare Übersicht aller Wartelistenplätze.</CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted p-5 text-sm text-muted-foreground">
              Keine Wartelistenplätze für den ausgewählten Filter gefunden.
            </p>
          ) : (
            <WaitlistTable rows={rows} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
