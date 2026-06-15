"use client";

import { useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import multiMonthPlugin from "@fullcalendar/multimonth";
import timeGridPlugin from "@fullcalendar/timegrid";
import deAtLocale from "@fullcalendar/core/locales/de-at";
import type { DateClickArg } from "@fullcalendar/interaction";
import type { EventClickArg, EventInput } from "@fullcalendar/core";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CalendarEventStatus } from "@/lib/calendar-status";
import { getCalendarEventStatusLabel } from "@/lib/calendar-status";

export type FullCalendarBoardEvent = {
  id: string;
  title: string;
  subtitle: string | null;
  status: CalendarEventStatus;
  sourceType: "booking" | "closure";
  startsAt: string;
  endsAt: string;
  blockedFrom: string;
  blockedUntil: string;
  buildingName: string;
  roomName: string | null;
  organizationName: string | null;
};

type FullCalendarBoardProps = {
  basePath: string;
  initialDate: string;
  view: "day" | "week" | "month" | "year";
  filters: {
    buildingId?: string;
    roomId?: string;
    organizationId?: string;
  };
  events: FullCalendarBoardEvent[];
};

const viewMap = {
  day: "timeGridDay",
  week: "timeGridWeek",
  month: "dayGridMonth",
  year: "multiMonthYear",
} as const;

const dateTimeFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getEventClassNames(status: CalendarEventStatus) {
  switch (status) {
    case "APPROVED":
      return ["calendar-event-approved"];
    case "IN_REVIEW":
      return ["calendar-event-review"];
    case "REQUESTED":
      return ["calendar-event-requested"];
    case "CANCELLED":
      return ["calendar-event-cancelled"];
    case "CLOSURE":
      return ["calendar-event-closure"];
    default:
      return ["calendar-event-muted"];
  }
}

function buildHref(basePath: string, date: string, view: FullCalendarBoardProps["view"], filters: FullCalendarBoardProps["filters"]) {
  const params = new URLSearchParams({ date, view });
  if (filters.buildingId) {
    params.set("buildingId", filters.buildingId);
  }
  if (filters.roomId) {
    params.set("roomId", filters.roomId);
  }
  if (filters.organizationId) {
    params.set("organizationId", filters.organizationId);
  }
  return `${basePath}?${params.toString()}`;
}

export function FullCalendarBoard({ basePath, initialDate, view, filters, events }: FullCalendarBoardProps) {
  const [selectedEvent, setSelectedEvent] = useState<FullCalendarBoardEvent | null>(null);
  const fullCalendarEvents = useMemo<EventInput[]>(
    () =>
      events.map((event) => ({
        id: `${event.sourceType}-${event.id}`,
        title: event.title,
        start: event.startsAt,
        end: event.endsAt,
        classNames: getEventClassNames(event.status),
        extendedProps: event,
      })),
    [events],
  );

  function handleDateClick(arg: DateClickArg) {
    const nextView = view === "year" ? "month" : "day";
    window.location.href = buildHref(basePath, formatDateInput(arg.date), nextView, filters);
  }

  function handleEventClick(arg: EventClickArg) {
    setSelectedEvent(arg.event.extendedProps as FullCalendarBoardEvent);
  }

  return (
    <>
      <div className="standard-calendar rounded-xl border border-border bg-card p-3 shadow-sm">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, multiMonthPlugin, listPlugin, interactionPlugin]}
          initialDate={initialDate}
          initialView={viewMap[view]}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
          buttonText={{
            today: "Heute",
            month: "Monat",
            week: "Woche",
            day: "Tag",
            year: "Jahr",
          }}
          locales={[deAtLocale]}
          locale={deAtLocale}
          firstDay={1}
          nowIndicator
          navLinks
          selectable={false}
          editable={false}
          dayMaxEvents
          allDaySlot={false}
          height="auto"
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
          slotDuration="00:30:00"
          events={fullCalendarEvents}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
        />
      </div>

      <Dialog open={Boolean(selectedEvent)} onOpenChange={(open) => (!open ? setSelectedEvent(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogDescription className="font-medium uppercase tracking-[0.2em] text-primary">
              Termin-Details
            </DialogDescription>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          {selectedEvent ? (
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Detail label="Status" value={getCalendarEventStatusLabel(selectedEvent.status)} />
              <Detail label="Art" value={selectedEvent.sourceType === "closure" ? "Sperre" : "Buchung"} />
              <Detail label="Gebäude" value={selectedEvent.buildingName} />
              <Detail label="Raum" value={selectedEvent.roomName ?? "Gesamtes Gebäude"} />
              <Detail label="Beginn" value={dateTimeFormatter.format(new Date(selectedEvent.startsAt))} />
              <Detail label="Ende" value={dateTimeFormatter.format(new Date(selectedEvent.endsAt))} />
              <Detail label="Blockiert ab" value={dateTimeFormatter.format(new Date(selectedEvent.blockedFrom))} />
              <Detail label="Blockiert bis" value={dateTimeFormatter.format(new Date(selectedEvent.blockedUntil))} />
              {selectedEvent.organizationName ? (
                <Detail className="sm:col-span-2" label="Organisation" value={selectedEvent.organizationName} />
              ) : null}
              {selectedEvent.subtitle ? <Detail className="sm:col-span-2" label="Hinweis" value={selectedEvent.subtitle} /> : null}
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>
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
