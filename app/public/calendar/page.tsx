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

function buildIcalHref(query: CalendarQuery) {
  const params = new URLSearchParams({
    view: query.view ?? "day",
  });

  if (query.date) {
    params.set("date", String(query.date));
  }

  if (query.buildingId) {
    params.set("buildingId", query.buildingId);
  }

  if (query.roomId) {
    params.set("roomId", query.roomId);
  }

  return `/public/calendar/ical?${params.toString()}`;
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
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium">Oeffentlicher Export</h2>
            <p className="mt-2 text-sm text-slate-400">
              iCal enthaelt nur die Details, die laut Datenschutzkonfiguration oeffentlich sichtbar sind.
            </p>
          </div>
          <a
            href={buildIcalHref(query)}
            className="rounded-lg border border-sky-700 px-4 py-2 text-sm font-medium text-sky-200 hover:bg-sky-950"
          >
            iCal herunterladen
          </a>
        </div>
      </div>
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
