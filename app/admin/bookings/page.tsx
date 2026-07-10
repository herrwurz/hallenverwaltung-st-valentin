import { AppFeedback } from "@/components/app-feedback";
import {
  BookingManager,
  type BookingManagerItem,
  type BookingView,
} from "@/components/booking-manager";
import { Button } from "@/components/ui/button";
import { getBookingStatusLabel, type AdminBookingFilterKey } from "@/lib/booking-status";
import { hasPermission, requirePermission } from "@/lib/permissions";
import {
  getAdminBookingFilterOptions,
  getBookingsForAdmin,
} from "@/lib/services/booking-approval-service";

const dateFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

const statusLabels: Record<AdminBookingFilterKey, string> = {
  OPEN: "Offen (beantragt + in Prüfung)",
  ALL: "Alle",
  REQUESTED: "Beantragt",
  IN_REVIEW: "In Prüfung",
  APPROVED: "Genehmigt",
  REJECTED: "Abgelehnt",
  CANCELLED: "Storniert",
};

const filterSelectClass = "mt-1 min-w-56 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";

type PageProps = {
  searchParams: Promise<{
    status?: string;
    reviewed?: string;
    approved?: string;
    rejected?: string;
    seriesReviewed?: string;
    seriesApproved?: string;
    seriesRejected?: string;
    organizationId?: string;
    buildingId?: string;
    roomId?: string;
    error?: string;
  }>;
};

export default async function AdminBookingsPage({ searchParams }: PageProps) {
  const user = await requirePermission("VIEW_BOOKINGS");
  const params = await searchParams;
  const requestedFilter = params.status as AdminBookingFilterKey | undefined;
  const selectedFilter =
    requestedFilter === "ALL" ||
    requestedFilter === "OPEN" ||
    requestedFilter === "REQUESTED" ||
    requestedFilter === "IN_REVIEW" ||
    requestedFilter === "APPROVED" ||
    requestedFilter === "REJECTED" ||
    requestedFilter === "CANCELLED"
      ? requestedFilter
      : "OPEN";
  const selectedOrganizationId = typeof params.organizationId === "string" && params.organizationId ? params.organizationId : "";
  const selectedBuildingId = typeof params.buildingId === "string" && params.buildingId ? params.buildingId : "";
  const selectedRoomId = typeof params.roomId === "string" && params.roomId ? params.roomId : "";
  const [canApprove, canReject, filterOptionsData, bookings] = await Promise.all([
    hasPermission(user.id, "APPROVE_BOOKING"),
    hasPermission(user.id, "REJECT_BOOKING"),
    getAdminBookingFilterOptions(user.id),
    getBookingsForAdmin(user.id, selectedFilter, {}, {
      organizationId: selectedOrganizationId || undefined,
      buildingId: selectedBuildingId || undefined,
      roomId: selectedRoomId || undefined,
    }),
  ]);
  const filterOptions: AdminBookingFilterKey[] = ["OPEN", "REQUESTED", "IN_REVIEW", "APPROVED", "REJECTED", "CANCELLED", "ALL"];
  const roomOptions = selectedBuildingId
    ? filterOptionsData.rooms.filter((room) => room.buildingId === selectedBuildingId)
    : filterOptionsData.rooms;

  type BookingRecord = (typeof bookings)[number];

  function toBookingView(booking: BookingRecord): BookingView {
    return {
      id: booking.id,
      title: booking.title,
      description: booking.description ?? null,
      usageTypeName: booking.usageType.name,
      organizationName: booking.organization.name,
      buildingName: booking.room.building.name,
      roomName: booking.room.name,
      startsAtLabel: dateFormatter.format(booking.startsAt),
      endsAtLabel: dateFormatter.format(booking.endsAt),
      status: booking.status,
      conflicts: booking.conflicts.map((conflict) => ({
        severity: conflict.severity,
        type: conflict.type,
        message: conflict.message,
      })),
      history: booking.statusHistory.map((entry) => ({
        id: entry.id,
        changeLabel: `${entry.oldStatus ? getBookingStatusLabel(entry.oldStatus) : "Neu"} -> ${getBookingStatusLabel(entry.newStatus)}`,
        metaLabel: `${dateFormatter.format(entry.createdAt)} | ${entry.actor?.displayName ?? "System"}`,
        reason: entry.reason ?? null,
      })),
    };
  }

  // Buchungen in Einzeltermine und Serienblöcke aufteilen (Reihenfolge des ersten Termins beibehalten)
  const seenSeries = new Set<string>();
  const items: BookingManagerItem[] = [];
  for (const booking of bookings) {
    if (!booking.series) {
      items.push({ kind: "single", booking: toBookingView(booking) });
    } else if (!seenSeries.has(booking.series.id)) {
      seenSeries.add(booking.series.id);
      const grouped = bookings
        .filter((candidate) => candidate.series?.id === booking.series!.id)
        .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
      items.push({
        kind: "series",
        seriesId: booking.series.id,
        seriesTitle: booking.series.title,
        organizationName: booking.organization.name,
        buildingName: booking.room.building.name,
        roomName: booking.room.name,
        usageTypeName: booking.usageType.name,
        bookings: grouped.map(toBookingView),
      });
    }
  }

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Buchungen</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Buchungsanträge</h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Offene und bearbeitete Buchungsanträge. Ein Klick auf eine Zeile öffnet Details, Konflikthinweise, Historie und
        die Entscheidungsaktionen.
      </p>
      <AppFeedback
        messages={[
          { tone: "error", text: params.error },
          { tone: "info", text: params.reviewed ? "Der Antrag wurde in Prüfung übernommen." : undefined },
          { tone: "success", text: params.approved ? "Die Buchung wurde genehmigt." : undefined },
          { tone: "success", text: params.rejected ? "Die Buchung wurde abgelehnt." : undefined },
          { tone: "info", text: params.seriesReviewed },
          { tone: "success", text: params.seriesApproved },
          { tone: "success", text: params.seriesRejected },
        ]}
      />

      <form className="mt-8 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm" aria-label="Buchungsfilter">
        <label className="text-sm font-medium text-foreground">
          Status filtern
          <select name="status" defaultValue={selectedFilter} className={filterSelectClass}>
            {filterOptions.map((filterKey) => (
              <option key={filterKey} value={filterKey}>
                {statusLabels[filterKey]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-foreground">
          Organisation filtern
          <select name="organizationId" defaultValue={selectedOrganizationId} className={filterSelectClass}>
            <option value="">Alle Organisationen</option>
            {filterOptionsData.organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-foreground">
          Gebäude filtern
          <select name="buildingId" defaultValue={selectedBuildingId} className={filterSelectClass}>
            <option value="">Alle Gebäude</option>
            {filterOptionsData.buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-foreground">
          Raum filtern
          <select name="roomId" defaultValue={selectedRoomId} className={filterSelectClass}>
            <option value="">Alle Räume</option>
            {roomOptions.map((room) => (
              <option key={room.id} value={room.id}>
                {room.building.name} - {room.name}
              </option>
            ))}
          </select>
        </label>
        <Button>Anwenden</Button>
      </form>

      <BookingManager
        items={items}
        filters={{
          status: selectedFilter,
          organizationId: selectedOrganizationId,
          buildingId: selectedBuildingId,
          roomId: selectedRoomId,
        }}
        canApprove={canApprove}
        canReject={canReject}
        errorText={params.error}
      />
    </>
  );
}
