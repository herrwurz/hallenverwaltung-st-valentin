import Link from "next/link";
import {
  getCalendarEventStatusBadgeClass,
  getCalendarEventStatusLabel,
} from "@/lib/calendar-status";
import type { CalendarResult, FreeSlotResult } from "@/lib/services/calendar-service";

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
  const gridClass =
    calendar.view === "day"
      ? "grid-cols-1"
      : calendar.view === "week"
        ? "grid-cols-1 lg:grid-cols-7"
        : calendar.view === "month"
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-7"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  const calendarTitle =
    calendar.view === "day"
      ? "Tagesansicht"
      : calendar.view === "week"
        ? "Wochenansicht"
        : calendar.view === "month"
          ? "Monatsansicht"
          : "Jahresansicht";

  return (
    <>
      <div className="mt-8 flex items-center justify-between gap-4">
        <Link href={backHref} className="text-sm text-sky-300 hover:text-sky-200">
          {backLabel}
        </Link>
        <p className="text-sm text-slate-400">{detailHint}</p>
      </div>

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-slate-800 bg-slate-950 p-1">
            {viewLinks.map((item) => (
              <Link
                key={item.view}
                href={item.href}
                className={`rounded-lg px-4 py-2 text-sm transition ${
                  calendar.view === item.view
                    ? "bg-sky-500 text-slate-950"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {viewLabels[item.view]}
              </Link>
            ))}
          </div>
          <p className="text-sm text-slate-400">
            Zeitraum: {dateTimeFormatter.format(calendar.rangeStart)} bis {dateTimeFormatter.format(calendar.rangeEnd)}
          </p>
        </div>

        <form method="get" className="grid gap-4 lg:grid-cols-[1fr,1fr,220px,200px,auto]">
          <label className="text-sm text-slate-300">
            Gebaeude
            <select name="buildingId" defaultValue={calendar.filters.buildingId ?? ""} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="">Alle Gebaeude</option>
              {calendar.buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-300">
            Raum
            <select name="roomId" defaultValue={calendar.filters.roomId ?? ""} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="">Alle Raeume</option>
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

          <label className="text-sm text-slate-300">
            Datum
            <input
              name="date"
              type="date"
              defaultValue={calendar.selectedDate}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-300">
            Ansicht
            <select name="view" defaultValue={calendar.view} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="day">Tag</option>
              <option value="week">Woche</option>
              <option value="month">Monat</option>
              <option value="year">Jahr</option>
            </select>
          </label>

          <div className="flex items-end">
            <button className="w-full rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-medium text-slate-950 hover:bg-sky-400">
              Aktualisieren
            </button>
          </div>
        </form>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-medium">{calendarTitle}</h3>
          <Link
            href={`${basePath}?${shareParams.toString()}`}
            className="text-sm text-sky-300 hover:text-sky-200"
          >
            Ansicht teilen
          </Link>
        </div>
        <div className={`mt-4 grid gap-3 ${gridClass}`}>
          {groupedEvents.map((day) => (
            <section key={day.key} className="min-h-40 rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <h4 className="font-medium">{day.label}</h4>
                <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs text-slate-400">
                  {day.events.length}
                </span>
              </div>
              {day.events.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">Keine Eintraege fuer diesen Zeitraum.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {day.events.map((event) => (
                    <article
                      key={`${event.sourceType}-${event.id}`}
                      className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h5 className="font-medium">{event.title}</h5>
                          {event.subtitle ? <p className="mt-1 text-sm text-slate-400">{event.subtitle}</p> : null}
                          <p className="mt-1 text-sm text-slate-400">
                            {calendar.view === "year" ? dateTimeFormatter.format(event.startsAt) : timeFormatter.format(event.startsAt)} bis{" "}
                            {calendar.view === "year" ? dateTimeFormatter.format(event.endsAt) : timeFormatter.format(event.endsAt)}
                          </p>
                          {(event.blockedFrom.getTime() !== event.startsAt.getTime() ||
                            event.blockedUntil.getTime() !== event.endsAt.getTime()) ? (
                            <p className="mt-1 text-xs text-slate-500">
                              Puffer: {timeFormatter.format(event.blockedFrom)} bis {timeFormatter.format(event.blockedUntil)}
                            </p>
                          ) : null}
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs ${getCalendarEventStatusBadgeClass(event.status)}`}>
                          {getCalendarEventStatusLabel(event.status)}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="text-xl font-medium">Freie Zeiten</h3>
        {!calendar.filters.roomId ? (
          <p className="mt-3 text-sm text-slate-400">Bitte einen Raum auswaehlen, um freie Zeitfenster anzuzeigen.</p>
        ) : !freeSlots ? (
          <p className="mt-3 text-sm text-slate-400">Fuer den gewaehlten Raum konnten keine freien Zeiten geladen werden.</p>
        ) : (
          <>
            <p className="mt-3 text-sm text-slate-300">
              {freeSlots.room.buildingName} - {freeSlots.room.name} | Oeffnungszeit {timeFormatter.format(freeSlots.openingStartsAt)} bis{" "}
              {timeFormatter.format(freeSlots.openingEndsAt)}
            </p>
            <div className="mt-4 space-y-2">
              {freeSlots.freeSlots.length === 0 ? (
                <p className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-400">
                  Keine freien Zeitfenster fuer das gewaehlte Datum.
                </p>
              ) : (
                freeSlots.freeSlots.map((slot, index) => (
                  <p key={`${slot.startsAt.toISOString()}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-emerald-200">
                    {timeFormatter.format(slot.startsAt)} bis {timeFormatter.format(slot.endsAt)}
                  </p>
                ))
              )}
            </div>
          </>
        )}
      </section>
    </>
  );
}
