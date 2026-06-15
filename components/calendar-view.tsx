import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CalendarEventDialog } from "@/components/calendar-event-dialog";
import { CalendarFilterForm } from "@/components/calendar-filter-form";
import { FullCalendarBoard, type FullCalendarBoardEvent } from "@/components/full-calendar-board";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCalendarEventStatusBadgeClass,
  getCalendarEventStatusLabel,
} from "@/lib/calendar-status";
import type { CalendarEvent, CalendarResult, FreeSlotResult } from "@/lib/services/calendar-service";

const dateTimeFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

const timeFormatter = new Intl.DateTimeFormat("de-AT", {
  hour: "2-digit",
  minute: "2-digit",
});

const listTitleByView: Record<CalendarResult["view"], string> = {
  day: "Terminliste Tag",
  week: "Terminliste Woche",
  month: "Terminliste Monat",
  year: "Terminliste Jahr",
};

type CalendarViewProps = {
  basePath: string;
  calendar: CalendarResult;
  freeSlots: FreeSlotResult | null;
  detailHint: string;
  backHref: string;
  backLabel: string;
};

function toFullCalendarEvent(event: CalendarEvent): FullCalendarBoardEvent {
  return {
    id: event.id,
    title: event.title,
    subtitle: event.subtitle,
    status: event.status,
    sourceType: event.sourceType,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    blockedFrom: event.blockedFrom.toISOString(),
    blockedUntil: event.blockedUntil.toISOString(),
    buildingName: event.buildingName,
    roomName: event.roomName,
    organizationName: event.organizationName,
  };
}

export function CalendarView({ basePath, calendar, freeSlots, detailHint, backHref, backLabel }: CalendarViewProps) {
  const sortedEvents = [...calendar.events].sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());

  return (
    <>
      <div className="mt-8 flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {backLabel}
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">{detailHint}</p>
      </div>

      <Card className="mt-8">
        <CardHeader className="border-b border-border">
          <CardTitle>Kalenderfilter</CardTitle>
          <CardDescription>
            Der Kalender nutzt FullCalendar Community mit normalen Tag-, Wochen-, Monats- und Jahresansichten.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <CalendarFilterForm
            buildings={calendar.buildings}
            organizations={calendar.organizations}
            filters={calendar.filters}
            selectedDate={calendar.selectedDate}
            view={calendar.view}
          />
        </CardContent>
      </Card>

      <section className="mt-8">
        <FullCalendarBoard
          basePath={basePath}
          initialDate={calendar.selectedDate}
          view={calendar.view}
          filters={calendar.filters}
          events={calendar.events.map(toFullCalendarEvent)}
        />
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold tracking-tight">{listTitleByView[calendar.view]}</h3>
          <Badge variant="outline">{sortedEvents.length} Termine</Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sortedEvents.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Keine Einträge für diesen Zeitraum.</p>
              </CardContent>
            </Card>
          ) : (
            sortedEvents.map((event) => <EventCard key={`${event.sourceType}-${event.id}`} event={event} />)
          )}
        </div>
      </section>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Freie Zeitfenster für Buchungsanträge</CardTitle>
          <CardDescription>
            Diese Liste zeigt mögliche freie Zeitfenster für den ausgewählten Raum und das ausgewählte Datum.
            Öffnungszeiten, Sperren, genehmigte Buchungen und Pufferzeiten werden berücksichtigt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!calendar.filters.roomId ? (
            <p className="text-sm text-muted-foreground">Bitte einen Raum auswählen, um freie Zeitfenster anzuzeigen.</p>
          ) : !freeSlots ? (
            <p className="text-sm text-muted-foreground">Für den gewählten Raum konnten keine freien Zeiten geladen werden.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {freeSlots.room.buildingName} - {freeSlots.room.name} | Öffnungszeit{" "}
                {timeFormatter.format(freeSlots.openingStartsAt)} bis {timeFormatter.format(freeSlots.openingEndsAt)}
              </p>
              <div className="mt-4 space-y-2">
                {freeSlots.freeSlots.length === 0 ? (
                  <p className="rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
                    Keine freien Zeitfenster für das gewählte Datum.
                  </p>
                ) : (
                  freeSlots.freeSlots.map((slot, index) => (
                    <p
                      key={`${slot.startsAt.toISOString()}-${index}`}
                      className="rounded-lg border border-emerald-500/20 bg-success/10 p-3 text-sm text-emerald-700"
                    >
                      {timeFormatter.format(slot.startsAt)} bis {timeFormatter.format(slot.endsAt)}
                    </p>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  return (
    <article className="rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h5 className="font-medium tracking-tight">{event.title}</h5>
          <p className="mt-1 text-sm text-muted-foreground">
            {dateTimeFormatter.format(event.startsAt)} bis {dateTimeFormatter.format(event.endsAt)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {event.buildingName} - {event.roomName ?? "Gesamtes Gebäude"}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs ${getCalendarEventStatusBadgeClass(event.status)}`}>
          {getCalendarEventStatusLabel(event.status)}
        </span>
      </div>
      <CalendarEventDialog
        event={event}
        className="mt-3 inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-sm font-medium shadow-sm transition hover:bg-accent"
        triggerLabel={`Details zu ${event.title} anzeigen`}
      >
        Details anzeigen
      </CalendarEventDialog>
    </article>
  );
}
