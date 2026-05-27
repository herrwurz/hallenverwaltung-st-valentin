import { CalendarView } from "@/components/calendar-view";
import { AreaShell } from "@/components/area-shell";
import { getPublicCalendarVisibilityMode } from "@/lib/services/calendar-settings-service";
import { getFreeSlots, getPublicCalendarEvents, type CalendarQuery } from "@/lib/services/calendar-service";

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

export default async function PublicCalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = toCalendarQuery(params);
  const [calendar, freeSlots, visibilityMode] = await Promise.all([
    getPublicCalendarEvents(query),
    getFreeSlots({ roomId: query.roomId, date: query.date }),
    getPublicCalendarVisibilityMode(),
  ]);
  const detailHint =
    visibilityMode === "event"
      ? "Aktive Oeffentlichkeitsstufe: Veranstaltungsname, sofern der Raum dies erlaubt."
      : visibilityMode === "organization"
        ? "Aktive Oeffentlichkeitsstufe: Vereinsname, sofern der Raum dies erlaubt."
        : "Aktive Oeffentlichkeitsstufe: nur belegt oder frei.";

  return (
    <AreaShell
      eyebrow="Oeffentlich"
      title="Oeffentlicher Kalender"
      description="Lesende Kalenderansicht fuer Hallenbelegung und freie Zeiten. Die sichtbaren Details richten sich nach der Datenschutzkonfiguration."
      authenticated={false}
    >
      <CalendarView
        basePath="/public/calendar"
        calendar={calendar}
        freeSlots={freeSlots}
        detailHint={detailHint}
        backHref="/public"
        backLabel="Zurueck zur Oeffentlichkeit"
      />
    </AreaShell>
  );
}
