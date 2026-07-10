import { AppFeedback } from "@/components/app-feedback";
import { SeriesManager, type SeriesManagerItem } from "@/components/series-manager";
import { hasPermission, requirePermission } from "@/lib/permissions";
import { getBookingSeriesForAdmin } from "@/lib/services/booking-series-service";

const dateFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatRecurrenceRule(rule: string) {
  const parts = new URLSearchParams(rule.replaceAll(";", "&"));
  const frequency = parts.get("FREQ");
  const interval = Number(parts.get("INTERVAL") ?? "1");
  const excluded = parts.get("EXDATE")?.split(",").filter(Boolean).length ?? 0;
  const excludedLabel = excluded > 0 ? `, ${excluded} Ausnahmedaten` : "";

  if (frequency === "DAILY") {
    return `${Number.isFinite(interval) && interval > 1 ? `alle ${interval} Tage` : "täglich"}${excludedLabel}`;
  }

  if (frequency === "WEEKLY") {
    const intervalLabel = Number.isFinite(interval) && interval > 1 ? `alle ${interval} Wochen` : "wöchentlich";
    return `${intervalLabel}${excludedLabel}`;
  }

  if (frequency === "MONTHLY") {
    const intervalLabel = Number.isFinite(interval) && interval > 1 ? `alle ${interval} Monate` : "monatlich";
    return `${intervalLabel}${excludedLabel}`;
  }

  if (frequency === "YEARLY") {
    const intervalLabel = Number.isFinite(interval) && interval > 1 ? `alle ${interval} Jahre` : "jährlich";
    return `${intervalLabel}${excludedLabel}`;
  }

  return "Serienregel";
}

function getSeriesStatus(bookings: Array<{ status: string }>) {
  if (bookings.length === 0) {
    return { label: "Keine Termine", tone: "secondary" as const };
  }

  if (bookings.every((booking) => booking.status === "APPROVED")) {
    return { label: "Komplett genehmigt", tone: "success" as const };
  }

  if (bookings.every((booking) => booking.status === "CANCELLED" || booking.status === "REJECTED")) {
    return { label: "Komplett storniert/abgelehnt", tone: "destructive" as const };
  }

  return { label: "Teilweise offen", tone: "warning" as const };
}

type PageProps = {
  searchParams: Promise<{
    error?: string;
    seriesReviewed?: string;
    seriesApproved?: string;
    seriesRejected?: string;
    seriesId?: string;
  }>;
};

export default async function AdminSeriesPage({ searchParams }: PageProps) {
  const user = await requirePermission("VIEW_BOOKINGS");
  const params = await searchParams;
  const [canApprove, canReject, series] = await Promise.all([
    hasPermission(user.id, "APPROVE_BOOKING"),
    hasPermission(user.id, "REJECT_BOOKING"),
    getBookingSeriesForAdmin(),
  ]);

  const items: SeriesManagerItem[] = series.map((item) => {
    const status = getSeriesStatus(item.bookings);
    const requestedCount = item.bookings.filter((booking) => booking.status === "REQUESTED").length;
    const inReviewCount = item.bookings.filter((booking) => booking.status === "IN_REVIEW").length;

    return {
      id: item.id,
      title: item.title,
      organizationName: item.organization.name,
      roomLabel: `${item.room.building.name} - ${item.room.name} / ${item.usageType.name}`,
      recurrenceLabel: formatRecurrenceRule(item.recurrenceRule),
      periodLabel: `${dateFormatter.format(item.startsOn)} bis ${dateFormatter.format(item.endsOn)}`,
      statusLabel: status.label,
      statusTone: status.tone,
      highlighted: params.seriesId === item.id,
      requestedCount,
      inReviewCount,
      bookings: item.bookings.map((booking) => ({
        id: booking.id,
        status: booking.status,
        rangeLabel: `${dateFormatter.format(booking.startsAt)} bis ${dateFormatter.format(booking.endsAt)}`,
      })),
    };
  });

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Serienbuchungen</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Serienanträge</h2>
      <p className="mt-3 text-muted-foreground">
        Übersicht der Serien mit Genehmigungsworkflow. Ein Klick auf eine Zeile öffnet Termine und Entscheidungsaktionen.
      </p>

      <AppFeedback
        messages={[
          { tone: "error", text: params.error },
          { tone: "info", text: params.seriesReviewed },
          { tone: "success", text: params.seriesApproved },
          { tone: "success", text: params.seriesRejected },
        ]}
      />

      <SeriesManager items={items} canApprove={canApprove} canReject={canReject} errorText={params.error} />
    </>
  );
}
