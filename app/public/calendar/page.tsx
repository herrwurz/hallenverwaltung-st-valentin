import { redirect } from "next/navigation";
import { CalendarView } from "@/components/calendar-view";
import { AreaShell } from "@/components/area-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicAreaEnabled, getPublicCalendarVisibilityMode } from "@/lib/services/calendar-settings-service";
import { getFreeSlots, getPublicCalendarEvents, type CalendarQuery } from "@/lib/services/calendar-service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const dynamic = "force-dynamic";

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
  if (!(await getPublicAreaEnabled())) {
    redirect("/login");
  }

  const params = await searchParams;
  const query = toCalendarQuery(params);
  const [calendar, freeSlots, visibilityMode] = await Promise.all([
    getPublicCalendarEvents(query),
    getFreeSlots({ roomId: query.roomId, date: query.date }),
    getPublicCalendarVisibilityMode(),
  ]);
  const detailHint =
    visibilityMode === "event"
      ? "Aktive Öffentlichkeitsstufe: Veranstaltungsname, sofern der Raum dies erlaubt."
      : visibilityMode === "organization"
        ? "Aktive Öffentlichkeitsstufe: Vereinsname, sofern der Raum dies erlaubt."
        : "Aktive Öffentlichkeitsstufe: nur belegt oder frei.";

  return (
    <AreaShell
      eyebrow="Öffentlich"
      title="Öffentlicher Kalender"
      description="Lesende Tages-, Wochen-, Monats- und Jahresansicht für Hallenbelegung und freie Zeiten. Die sichtbaren Details richten sich nach der Datenschutzkonfiguration."
      authenticated={false}
    >
      <Card className="mt-8">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Öffentlicher Export</CardTitle>
            <CardDescription className="mt-2">
              iCal enthält nur die Details, die laut Datenschutzkonfiguration öffentlich sichtbar sind.
            </CardDescription>
          </div>
          <Button asChild variant="outline">
            <a href={buildIcalHref(query)}>iCal herunterladen</a>
          </Button>
        </CardHeader>
      </Card>
      <CalendarView
        basePath="/public/calendar"
        calendar={calendar}
        freeSlots={freeSlots}
        detailHint={detailHint}
        backHref="/login"
        backLabel="Anmelden"
      />
    </AreaShell>
  );
}
