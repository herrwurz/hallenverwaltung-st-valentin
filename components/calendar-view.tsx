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
      const dayStartsAt = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate(), 0, 0, 0, 0);
      const dayEndsAt = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate() + 1, 0, 0, 0, 0);
      return event.endsAt > dayStartsAt && event.startsAt < dayEndsAt;
    }),
  }));

  return (
    <>
      <div className="mt-8 flex items-center justify-between gap-4">
        <Link href={backHref} className="text-sm text-sky-300 hover:text-sky-200">
          {backLabel}
        </Link>
        <p className="text-sm text-slate-400">{detailHint}</p>
      </div>

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
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
          <h3 className="text-xl font-medium">
            {calendar.view === "day" ? "Tagesansicht" : "Wochenansicht"}
          </h3>
          <Link
            href={`${basePath}?${shareParams.toString()}`}
            className="text-sm text-sky-300 hover:text-sky-200"
          >
            Ansicht teilen
          </Link>
        </div>
        <div className="mt-4 space-y-4">
          {groupedEvents.map((day) => (
            <section key={day.key} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h4 className="font-medium">{day.label}</h4>
              {day.events.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">Keine Eintraege fuer diesen Zeitraum.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {day.events.map((event) => (
                    <article key={`${event.sourceType}-${event.id}`} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h5 className="font-medium">{event.title}</h5>
                          {event.subtitle ? <p className="mt-1 text-sm text-slate-400">{event.subtitle}</p> : null}
                          <p className="mt-1 text-sm text-slate-400">
                            {dateTimeFormatter.format(event.startsAt)} bis {dateTimeFormatter.format(event.endsAt)}
                          </p>
                          {(event.blockedFrom.getTime() !== event.startsAt.getTime() ||
                            event.blockedUntil.getTime() !== event.endsAt.getTime()) ? (
                            <p className="mt-1 text-xs text-slate-500">
                              Blockiert inkl. Puffer: {dateTimeFormatter.format(event.blockedFrom)} bis{" "}
                              {dateTimeFormatter.format(event.blockedUntil)}
                            </p>
                          ) : null}
                        </div>
                        <span className={`rounded-full px-3 py-1 text-sm ${getCalendarEventStatusBadgeClass(event.status)}`}>
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
