import { CalendarView } from "@/components/calendar-view";
import { requirePermission } from "@/lib/permissions";
import { getAdminCalendarEvents, getFreeSlots, type CalendarQuery } from "@/lib/services/calendar-service";

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
    view: view === "week" ? "week" : "day",
    buildingId: buildingId || undefined,
    roomId: roomId || undefined,
  };
}

export default async function AdminCalendarPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("VIEW_BOOKINGS");
  const params = await searchParams;
  const query = toCalendarQuery(params);
  const [calendar, freeSlots] = await Promise.all([
    getAdminCalendarEvents(query),
    getFreeSlots({ roomId: query.roomId, date: query.date }),
  ]);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-400">Kalender</p>
      <h2 className="mt-3 text-3xl font-semibold">Verwaltungskalender</h2>
      <p className="mt-3 max-w-3xl text-slate-300">
        Lesende Tages- und Wochenansicht fuer Buchungsantraege, genehmigte Termine und Hallensperren inklusive
        Pufferzeiten.
      </p>

      <CalendarView
        basePath="/admin/calendar"
        calendar={calendar}
        freeSlots={freeSlots}
        detailHint="Verwaltung sieht alle Buchungsdetails."
        backHref="/admin"
        backLabel="Zurueck zur Verwaltung"
      />
    </>
  );
}
