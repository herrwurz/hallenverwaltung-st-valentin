import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarClock } from "lucide-react";
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

const viewLabels: Record<CalendarResult["view"], string> = {
  day: "Tag",
  week: "Woche",
  month: "Monat",
  year: "Jahr",
};

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftCalendarDate(selectedDate: string, view: CalendarResult["view"], direction: -1 | 1) {
  const date = new Date(`${selectedDate}T12:00:00`);

  if (view === "day") {
    date.setDate(date.getDate() + direction);
  } else if (view === "week") {
    date.setDate(date.getDate() + direction * 7);
  } else if (view === "month") {
    date.setMonth(date.getMonth() + direction);
  } else {
    date.setFullYear(date.getFullYear() + direction);
  }

  return formatDateInput(date);
}

function getEventDialogId(sourceType: string, id: string) {
  return `termin-${sourceType}-${id}`.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function getMinutesFromDayStart(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type CalendarViewProps = {
  basePath: string;
  calendar: CalendarResult;
  freeSlots: FreeSlotResult | null;
  detailHint: string;
  backHref: string;
  backLabel: string;
};

export function CalendarView({ basePath, calendar, freeSlots, detailHint, backHref, backLabel }: CalendarViewProps) {
  const shareParams = new URLSearchParams({
    date: calendar.selectedDate,
    view: calendar.view,
  });

  if (calendar.filters.buildingId) {
    shareParams.set("buildingId", calendar.filters.buildingId);
  }

  if (calendar.filters.roomId) {
    shareParams.set("roomId", calendar.filters.roomId);
  }

  const buildHref = (date: string, view = calendar.view) => {
    const params = new URLSearchParams(shareParams);
    params.set("date", date);
    params.set("view", view);
    return `${basePath}?${params.toString()}`;
  };

  const groupedEvents = calendar.days.map((day) => ({
    ...day,
    events: calendar.events.filter((event) => {
      const periodStartsAt = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate(), 0, 0, 0, 0);
      const periodEndsAt =
        calendar.view === "year"
          ? new Date(day.date.getFullYear(), day.date.getMonth() + 1, 1, 0, 0, 0, 0)
          : new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate() + 1, 0, 0, 0, 0);
      return event.endsAt > periodStartsAt && event.startsAt < periodEndsAt;
    }),
  }));
  const viewLinks = (["day", "week", "month", "year"] as const).map((view) => {
    const params = new URLSearchParams(shareParams);
    params.set("view", view);
    return {
      view,
      href: `${basePath}?${params.toString()}`,
    };
  });
  const previousHref = buildHref(shiftCalendarDate(calendar.selectedDate, calendar.view, -1));
  const nextHref = buildHref(shiftCalendarDate(calendar.selectedDate, calendar.view, 1));
  const todayHref = buildHref(formatDateInput(new Date()));
  const visibleRooms = calendar.buildings
    .filter((building) => !calendar.filters.buildingId || building.id === calendar.filters.buildingId)
    .flatMap((building) =>
      building.rooms
        .filter((room) => !calendar.filters.roomId || room.id === calendar.filters.roomId)
        .map((room) => ({ ...room, buildingId: building.id, buildingName: building.name })),
    );

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center rounded-lg border border-border bg-muted p-1">
              {viewLinks.map((item) => (
                <Link
                  key={item.view}
                  href={item.href}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                    calendar.view === item.view
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-card hover:text-foreground"
                  }`}
                >
                  {viewLabels[item.view]}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={previousHref}>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Zurück
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href={todayHref}>Heute</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={nextHref}>
                  Weiter
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <p className="mb-5 text-sm text-muted-foreground">
            Zeitraum: {dateTimeFormatter.format(calendar.rangeStart)} bis {dateTimeFormatter.format(calendar.rangeEnd)}
          </p>

          <form method="get" className="grid gap-4 lg:grid-cols-[1fr,1fr,220px,200px,auto]">
            <label className="text-sm font-medium text-foreground">
              Gebäude
              <select name="buildingId" defaultValue={calendar.filters.buildingId ?? ""} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm">
                <option value="">Alle Gebäude</option>
                {calendar.buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-foreground">
              Raum
              <select name="roomId" defaultValue={calendar.filters.roomId ?? ""} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm">
                <option value="">Alle Räume</option>
                {calendar.buildings
                  .filter((building) => !calendar.filters.buildingId || building.id === calendar.filters.buildingId)
                  .flatMap((building) =>
                    building.rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {building.name} - {room.name}
                      </option>
                    )),
                  )}
              </select>
            </label>

            <label className="text-sm font-medium text-foreground">
              Datum
              <input
                name="date"
                type="date"
                defaultValue={calendar.selectedDate}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <label className="text-sm font-medium text-foreground">
              Ansicht
              <select name="view" defaultValue={calendar.view} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm">
                <option value="day">Tag</option>
                <option value="week">Woche</option>
                <option value="month">Monat</option>
                <option value="year">Jahr</option>
              </select>
            </label>

            <div className="flex items-end">
              <Button className="w-full">Aktualisieren</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {calendar.view === "day" ? <ResourceDayGrid calendar={calendar} events={calendar.events} rooms={visibleRooms} /> : null}

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold tracking-tight">
            {calendar.view === "day"
              ? "Terminliste"
              : calendar.view === "week"
                ? "Wochenansicht"
                : calendar.view === "month"
                  ? "Monatsansicht"
                  : "Jahresansicht"}
          </h3>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`${basePath}?${shareParams.toString()}`}>Ansicht teilen</Link>
          </Button>
        </div>
        <div className={`mt-4 grid gap-3 ${calendar.view === "week" ? "lg:grid-cols-7" : calendar.view === "month" ? "sm:grid-cols-2 lg:grid-cols-7" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
          {groupedEvents.map((day) => (
            <Card key={day.key} className="min-h-40">
              <CardHeader className="border-b border-border pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">{day.label}</CardTitle>
                  <Badge variant="outline">{day.events.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {day.events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine Einträge für diesen Zeitraum.</p>
                ) : (
                  <div className="space-y-2">
                    {day.events.map((event) => (
                      <EventCard key={`${event.sourceType}-${event.id}`} event={event} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Freie Zeiten</CardTitle>
          <CardDescription>Öffnungszeiten, Sperren, genehmigte Buchungen und Pufferzeiten werden berücksichtigt.</CardDescription>
        </CardHeader>
        <CardContent>
          {!calendar.filters.roomId ? (
            <p className="text-sm text-muted-foreground">Bitte einen Raum auswählen, um freie Zeitfenster anzuzeigen.</p>
          ) : !freeSlots ? (
            <p className="text-sm text-muted-foreground">Für den gewählten Raum konnten keine freien Zeiten geladen werden.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {freeSlots.room.buildingName} - {freeSlots.room.name} | Öffnungszeit {timeFormatter.format(freeSlots.openingStartsAt)} bis{" "}
                {timeFormatter.format(freeSlots.openingEndsAt)}
              </p>
              <div className="mt-4 space-y-2">
                {freeSlots.freeSlots.length === 0 ? (
                  <p className="rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
                    Keine freien Zeitfenster für das gewählte Datum.
                  </p>
                ) : (
                  freeSlots.freeSlots.map((slot, index) => (
                    <p key={`${slot.startsAt.toISOString()}-${index}`} className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700">
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

function ResourceDayGrid({
  calendar,
  events,
  rooms,
}: {
  calendar: CalendarResult;
  events: CalendarEvent[];
  rooms: Array<{ id: string; name: string; buildingId: string; buildingName: string }>;
}) {
  const schedulerStartMinutes = 6 * 60;
  const schedulerEndMinutes = 23 * 60;
  const slotHeight = 34;
  const totalSchedulerMinutes = schedulerEndMinutes - schedulerStartMinutes;
  const timeSlots = Array.from({ length: totalSchedulerMinutes / 30 + 1 }, (_, index) => {
    const minutes = schedulerStartMinutes + index * 30;
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  });

  return (
    <Card className="mt-8 overflow-hidden">
      <CardHeader className="border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" aria-hidden="true" />
              Tagesplan nach Räumen
            </CardTitle>
            <CardDescription>Räume als Spalten, Zeitfenster in 30-Minuten-Schritten.</CardDescription>
          </div>
          <Badge variant="outline">{rooms.length} Räume</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div
            className="google-calendar-grid grid min-w-[900px]"
            style={{ gridTemplateColumns: `88px repeat(${Math.max(rooms.length, 1)}, minmax(220px, 1fr))` }}
          >
            <div className="sticky left-0 z-20 border-b border-r border-border bg-card p-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Zeit
            </div>
            {rooms.length === 0 ? (
              <div className="border-b border-border p-3 text-sm text-muted-foreground">Keine Räume im Filter.</div>
            ) : (
              rooms.map((room) => (
                <div key={room.id} className="border-b border-r border-border bg-card p-3">
                  <p className="text-sm font-semibold tracking-tight">{room.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{room.buildingName}</p>
                </div>
              ))
            )}

            <div className="sticky left-0 z-10 border-r border-border bg-card">
              {timeSlots.map((slot) => (
                <div key={slot} className="h-[34px] border-b border-border/70 px-3 py-1 text-xs text-muted-foreground">
                  {slot}
                </div>
              ))}
            </div>

            {rooms.map((room) => {
              const roomEvents = events.filter(
                (event) =>
                  event.roomId === room.id || (event.sourceType === "closure" && event.roomId === null && event.buildingId === room.buildingId),
              );

              return (
                <div key={room.id} className="relative border-r border-border" style={{ height: `${timeSlots.length * slotHeight}px` }}>
                  {timeSlots.map((slot) => (
                    <div key={`${room.id}-${slot}`} className="h-[34px] border-b border-border/70 bg-white" />
                  ))}
                  {roomEvents.map((event) => {
                    const blockedStart = clamp(getMinutesFromDayStart(event.blockedFrom) - schedulerStartMinutes, 0, totalSchedulerMinutes);
                    const blockedEnd = clamp(getMinutesFromDayStart(event.blockedUntil) - schedulerStartMinutes, blockedStart + 30, totalSchedulerMinutes);
                    const top = (blockedStart / 30) * slotHeight;
                    const height = Math.max(((blockedEnd - blockedStart) / 30) * slotHeight - 6, 28);

                    return (
                      <a
                        key={`${event.sourceType}-${event.id}-${room.id}`}
                        href={`#${getEventDialogId(event.sourceType, event.id)}`}
                        className="absolute left-2 right-2 overflow-hidden rounded-lg border-l-4 border-l-primary bg-primary/10 p-2 text-xs shadow-sm transition hover:bg-primary/15"
                        style={{ top: `${top + 3}px`, height: `${height}px` }}
                      >
                        <span className={`mb-1 inline-flex rounded-full px-2 py-0.5 text-[11px] ${getCalendarEventStatusBadgeClass(event.status)}`}>
                          {getCalendarEventStatusLabel(event.status)}
                        </span>
                        <span className="block truncate font-semibold text-foreground">{event.title}</span>
                        <span className="block truncate text-muted-foreground">
                          {timeFormatter.format(event.startsAt)} bis {timeFormatter.format(event.endsAt)}
                        </span>
                      </a>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
      <EventDialogs events={calendar.events} />
    </Card>
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  return (
    <article className="rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h5 className="font-medium tracking-tight">{event.title}</h5>
          <p className="mt-1 text-sm text-muted-foreground">
            {timeFormatter.format(event.startsAt)} bis {timeFormatter.format(event.endsAt)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {event.buildingName} - {event.roomName ?? "Gesamtes Gebäude"}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs ${getCalendarEventStatusBadgeClass(event.status)}`}>
          {getCalendarEventStatusLabel(event.status)}
        </span>
      </div>
      <Button className="mt-3" variant="outline" size="sm" asChild>
        <a href={`#${getEventDialogId(event.sourceType, event.id)}`}>Details anzeigen</a>
      </Button>
    </article>
  );
}

function EventDialogs({ events }: { events: CalendarEvent[] }) {
  return (
    <>
      {events.map((event) => {
        const dialogId = getEventDialogId(event.sourceType, event.id);

        return (
          <div
            key={`${event.sourceType}-${event.id}-dialog`}
            id={dialogId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${dialogId}-title`}
            className="fixed inset-0 z-50 hidden place-items-center bg-slate-950/70 p-6 target:grid"
          >
            <div className="w-full max-w-xl rounded-xl border border-border bg-card p-6 text-card-foreground shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Termin-Details</p>
                  <h3 id={`${dialogId}-title`} className="mt-2 text-2xl font-semibold tracking-tight">
                    {event.title}
                  </h3>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href="#">Schließen</a>
                </Button>
              </div>

              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <Detail label="Status" value={getCalendarEventStatusLabel(event.status)} />
                <Detail label="Art" value={event.sourceType === "closure" ? "Sperre" : "Buchung"} />
                <Detail label="Gebäude" value={event.buildingName} />
                <Detail label="Raum" value={event.roomName ?? "Gesamtes Gebäude"} />
                <Detail label="Beginn" value={dateTimeFormatter.format(event.startsAt)} />
                <Detail label="Ende" value={dateTimeFormatter.format(event.endsAt)} />
                <Detail label="Blockiert ab" value={dateTimeFormatter.format(event.blockedFrom)} />
                <Detail label="Blockiert bis" value={dateTimeFormatter.format(event.blockedUntil)} />
                {event.organizationName ? <Detail className="sm:col-span-2" label="Organisation" value={event.organizationName} /> : null}
                {event.subtitle ? <Detail className="sm:col-span-2" label="Hinweis" value={event.subtitle} /> : null}
              </dl>
            </div>
          </div>
        );
      })}
    </>
  );
}

function Detail({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}
