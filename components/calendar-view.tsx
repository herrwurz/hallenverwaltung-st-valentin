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

function getEventDialogId(sourceType: string, id: string) {
  return `termin-${sourceType}-${id}`.replace(/[^a-zA-Z0-9_-]/g, "-");
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
        <Link href={backHref} className="text-sm font-medium text-blue-700 hover:text-blue-900">
          {backLabel}
        </Link>
        <p className="text-sm text-slate-600">{detailHint}</p>
      </div>

      <section className="mt-8 rounded-sm border border-slate-300 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-sm border border-slate-300 bg-slate-100 p-1">
            {viewLinks.map((item) => (
              <Link
                key={item.view}
                href={item.href}
                className={`rounded-sm px-4 py-2 text-sm transition ${
                  calendar.view === item.view
                    ? "bg-blue-600 text-white"
                    : "text-slate-700 hover:bg-white hover:text-slate-950"
                }`}
              >
                {viewLabels[item.view]}
              </Link>
            ))}
          </div>
          <p className="text-sm text-slate-600">
            Zeitraum: {dateTimeFormatter.format(calendar.rangeStart)} bis {dateTimeFormatter.format(calendar.rangeEnd)}
          </p>
        </div>

        <form method="get" className="grid gap-4 lg:grid-cols-[1fr,1fr,220px,200px,auto]">
          <label className="text-sm text-slate-700">
            Gebäude
            <select name="buildingId" defaultValue={calendar.filters.buildingId ?? ""} className="mt-1 w-full rounded-sm border border-slate-400 bg-white px-3 py-2 text-sm">
              <option value="">Alle Gebäude</option>
              {calendar.buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-700">
            Raum
            <select name="roomId" defaultValue={calendar.filters.roomId ?? ""} className="mt-1 w-full rounded-sm border border-slate-400 bg-white px-3 py-2 text-sm">
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

          <label className="text-sm text-slate-700">
            Datum
            <input
              name="date"
              type="date"
              defaultValue={calendar.selectedDate}
              className="mt-1 w-full rounded-sm border border-slate-400 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            Ansicht
            <select name="view" defaultValue={calendar.view} className="mt-1 w-full rounded-sm border border-slate-400 bg-white px-3 py-2 text-sm">
              <option value="day">Tag</option>
              <option value="week">Woche</option>
              <option value="month">Monat</option>
              <option value="year">Jahr</option>
            </select>
          </label>

          <div className="flex items-end">
            <button className="w-full rounded-sm bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
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
            className="text-sm font-medium text-blue-700 hover:text-blue-900"
          >
            Ansicht teilen
          </Link>
        </div>
        <div className={`mt-4 grid gap-3 ${gridClass}`}>
          {groupedEvents.map((day) => (
            <section key={day.key} className="min-h-40 rounded-sm border border-slate-300 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <h4 className="font-medium">{day.label}</h4>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                  {day.events.length}
                </span>
              </div>
              {day.events.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">Keine Einträge für diesen Zeitraum.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {day.events.map((event) => {
                    const dialogId = getEventDialogId(event.sourceType, event.id);

                    return (
                      <article
                        key={`${event.sourceType}-${event.id}`}
                        className="rounded-sm border-l-4 border-l-blue-600 border-y-slate-300 border-r-slate-300 bg-blue-50 p-3 shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h5 className="font-medium text-slate-950">{event.title}</h5>
                            {event.subtitle ? <p className="mt-1 text-sm text-slate-600">{event.subtitle}</p> : null}
                            <p className="mt-1 text-sm text-slate-600">
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
                        <a
                          href={`#${dialogId}`}
                          className="mt-3 inline-flex rounded-sm border border-blue-700 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100"
                        >
                          Details anzeigen
                        </a>
                        <div
                          id={dialogId}
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby={`${dialogId}-title`}
                          className="fixed inset-0 z-50 hidden place-items-center bg-slate-950/70 p-6 target:grid"
                        >
                          <div className="w-full max-w-xl rounded-sm border border-slate-300 bg-white p-6 text-slate-950 shadow-2xl">
                            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                              <div>
                                <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-700">
                                  Termin-Details
                                </p>
                                <h3 id={`${dialogId}-title`} className="mt-2 text-2xl font-semibold">
                                  {event.title}
                                </h3>
                              </div>
                              <a href="#" className="rounded-sm border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">
                                Schließen
                              </a>
                            </div>

                            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                              <div>
                                <dt className="font-medium text-slate-500">Status</dt>
                                <dd className="mt-1">{getCalendarEventStatusLabel(event.status)}</dd>
                              </div>
                              <div>
                                <dt className="font-medium text-slate-500">Art</dt>
                                <dd className="mt-1">{event.sourceType === "closure" ? "Sperre" : "Buchung"}</dd>
                              </div>
                              <div>
                                <dt className="font-medium text-slate-500">Gebäude</dt>
                                <dd className="mt-1">{event.buildingName}</dd>
                              </div>
                              <div>
                                <dt className="font-medium text-slate-500">Raum</dt>
                                <dd className="mt-1">{event.roomName ?? "Gesamtes Gebäude"}</dd>
                              </div>
                              <div>
                                <dt className="font-medium text-slate-500">Beginn</dt>
                                <dd className="mt-1">{dateTimeFormatter.format(event.startsAt)}</dd>
                              </div>
                              <div>
                                <dt className="font-medium text-slate-500">Ende</dt>
                                <dd className="mt-1">{dateTimeFormatter.format(event.endsAt)}</dd>
                              </div>
                              <div>
                                <dt className="font-medium text-slate-500">Blockiert ab</dt>
                                <dd className="mt-1">{dateTimeFormatter.format(event.blockedFrom)}</dd>
                              </div>
                              <div>
                                <dt className="font-medium text-slate-500">Blockiert bis</dt>
                                <dd className="mt-1">{dateTimeFormatter.format(event.blockedUntil)}</dd>
                              </div>
                              {event.organizationName ? (
                                <div className="sm:col-span-2">
                                  <dt className="font-medium text-slate-500">Organisation</dt>
                                  <dd className="mt-1">{event.organizationName}</dd>
                                </div>
                              ) : null}
                              {event.subtitle ? (
                                <div className="sm:col-span-2">
                                  <dt className="font-medium text-slate-500">Hinweis</dt>
                                  <dd className="mt-1">{event.subtitle}</dd>
                                </div>
                              ) : null}
                            </dl>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-sm border border-slate-300 bg-white p-5 shadow-sm">
        <h3 className="text-xl font-medium">Freie Zeiten</h3>
        {!calendar.filters.roomId ? (
          <p className="mt-3 text-sm text-slate-500">Bitte einen Raum auswählen, um freie Zeitfenster anzuzeigen.</p>
        ) : !freeSlots ? (
          <p className="mt-3 text-sm text-slate-500">Für den gewählten Raum konnten keine freien Zeiten geladen werden.</p>
        ) : (
          <>
            <p className="mt-3 text-sm text-slate-700">
              {freeSlots.room.buildingName} - {freeSlots.room.name} | Öffnungszeit {timeFormatter.format(freeSlots.openingStartsAt)} bis{" "}
              {timeFormatter.format(freeSlots.openingEndsAt)}
            </p>
            <div className="mt-4 space-y-2">
              {freeSlots.freeSlots.length === 0 ? (
                <p className="rounded-sm border border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                  Keine freien Zeitfenster für das gewählte Datum.
                </p>
              ) : (
                freeSlots.freeSlots.map((slot, index) => (
                  <p key={`${slot.startsAt.toISOString()}-${index}`} className="rounded-sm border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
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
