import { CalendarView } from "@/components/calendar-view";
import { AreaShell } from "@/components/area-shell";
import { requirePermission } from "@/lib/permissions";
import { getFreeSlots, getPortalCalendarEvents, type CalendarQuery } from "@/lib/services/calendar-service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function normalizeSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toCalendarQuery(params: Awaited<SearchParams>): CalendarQuery {
  const date = normalizeSearchParam(params.date);
  const view = normalizeSearchParam(params.view);
  const buildingId = normalizeSearchParam(params.buildingId);
  const roomId = normalizeSearchParam(params.roomId);

  return {
    date,
    view: view === "week" || view === "month" || view === "year" ? view : "day",
    buildingId: buildingId || undefined,
    roomId: roomId || undefined,
  };
}

export default async function PortalCalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("REQUEST_BOOKING");
  const params = await searchParams;
  const query = toCalendarQuery(params);
  const [calendar, freeSlots] = await Promise.all([
    getPortalCalendarEvents(query, user.id),
    getFreeSlots({ roomId: query.roomId, date: query.date }),
  ]);

  return (
    <AreaShell
      eyebrow="Portal"
      title="Kalender"
      description="Lesende Tages-, Wochen-, Monats- und Jahresansicht mit eigenen Details sowie eingeschraenkter Sicht auf fremde Belegungen."
      userName={user.name}
    >
      <CalendarView
        basePath="/portal/calendar"
        calendar={calendar}
        freeSlots={freeSlots}
        detailHint="Eigene Buchungen voll sichtbar, fremde Buchungen eingeschraenkt."
        backHref="/portal"
        backLabel="Zurueck zum Portal"
      />
    </AreaShell>
  );
}
