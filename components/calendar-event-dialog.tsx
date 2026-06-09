"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getCalendarEventStatusLabel } from "@/lib/calendar-status";
import type { CalendarEvent } from "@/lib/services/calendar-service";
import { cn } from "@/lib/utils";

const dateTimeFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDateTime(value: Date | string) {
  return dateTimeFormatter.format(value instanceof Date ? value : new Date(value));
}

type CalendarEventDialogProps = {
  event: CalendarEvent;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  triggerLabel?: string;
};

export function CalendarEventDialog({
  event,
  children,
  className,
  style,
  triggerLabel = "Termin-Details öffnen",
}: CalendarEventDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={cn("text-left", className)} style={style} aria-label={triggerLabel}>
          {children}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogDescription className="font-medium uppercase tracking-[0.2em] text-primary">
            Termin-Details
          </DialogDescription>
          <DialogTitle>{event.title}</DialogTitle>
        </DialogHeader>

        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <Detail label="Status" value={getCalendarEventStatusLabel(event.status)} />
          <Detail label="Art" value={event.sourceType === "closure" ? "Sperre" : "Buchung"} />
          <Detail label="Gebäude" value={event.buildingName} />
          <Detail label="Raum" value={event.roomName ?? "Gesamtes Gebäude"} />
          <Detail label="Beginn" value={formatDateTime(event.startsAt)} />
          <Detail label="Ende" value={formatDateTime(event.endsAt)} />
          <Detail label="Blockiert ab" value={formatDateTime(event.blockedFrom)} />
          <Detail label="Blockiert bis" value={formatDateTime(event.blockedUntil)} />
          {event.organizationName ? <Detail className="sm:col-span-2" label="Organisation" value={event.organizationName} /> : null}
          {event.subtitle ? <Detail className="sm:col-span-2" label="Hinweis" value={event.subtitle} /> : null}
        </dl>
      </DialogContent>
    </Dialog>
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
