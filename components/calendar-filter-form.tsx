"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  CalendarFilterOption,
  CalendarOrganizationFilterOption,
  CalendarResult,
} from "@/lib/services/calendar-service";

type CalendarFilterFormProps = {
  buildings: CalendarFilterOption[];
  organizations?: CalendarOrganizationFilterOption[];
  filters: CalendarResult["filters"];
  selectedDate: string;
  view: CalendarResult["view"];
};

export function CalendarFilterForm({
  buildings,
  organizations = [],
  filters,
  selectedDate,
  view,
}: CalendarFilterFormProps) {
  const [selectedBuildingId, setSelectedBuildingId] = useState(filters.buildingId ?? "");
  const [selectedRoomId, setSelectedRoomId] = useState(filters.roomId ?? "");
  const dateInputRef = useRef<HTMLInputElement>(null);
  const viewInputRef = useRef<HTMLInputElement>(null);

  const roomOptions = useMemo(
    () =>
      buildings
        .filter((building) => !selectedBuildingId || building.id === selectedBuildingId)
        .flatMap((building) =>
          building.rooms.map((room) => ({
            ...room,
            buildingName: building.name,
          })),
        ),
    [buildings, selectedBuildingId],
  );
  const viewOptions: Array<{ value: CalendarResult["view"]; label: string }> = [
    { value: "day", label: "Tag" },
    { value: "week", label: "Woche" },
    { value: "month", label: "Monat" },
    { value: "year", label: "Jahr" },
  ];
  const currentDate = parseDateInput(selectedDate);
  const previousDate = formatDateInput(shiftDate(currentDate, view, -1));
  const nextDate = formatDateInput(shiftDate(currentDate, view, 1));
  const today = formatDateInput(new Date());

  return (
    <form method="get" className="grid gap-4 lg:grid-cols-[1fr,1fr,1fr,220px,auto]">
      <input ref={viewInputRef} type="hidden" name="view" defaultValue={view} />

      {organizations.length > 0 ? (
        <label className="text-sm font-medium text-foreground">
          Organisation
          <select
            name="organizationId"
            defaultValue={filters.organizationId ?? ""}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
          >
            <option value="">Alle Organisationen</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="text-sm font-medium text-foreground">
        Gebäude
        <select
          name="buildingId"
          value={selectedBuildingId}
          onChange={(event) => {
            setSelectedBuildingId(event.target.value);
            setSelectedRoomId("");
          }}
          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
        >
          <option value="">Alle Gebäude</option>
          {buildings.map((building) => (
            <option key={building.id} value={building.id}>
              {building.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium text-foreground">
        Raum
        <select
          name="roomId"
          value={selectedRoomId}
          onChange={(event) => setSelectedRoomId(event.target.value)}
          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
        >
          <option value="">Alle Räume</option>
          {roomOptions.map((room) => (
            <option key={room.id} value={room.id}>
              {room.buildingName} - {room.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium text-foreground">
        Datum
        <input
          ref={dateInputRef}
          name="date"
          type="date"
          defaultValue={selectedDate}
          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
        />
      </label>

      <div className="flex items-end">
        <Button type="submit" className="w-full" onClick={() => prepareSubmit({ view })}>
          Aktualisieren
        </Button>
      </div>

      <fieldset className="lg:col-span-full">
        <legend className="text-sm font-medium text-foreground">Kalendernavigation</legend>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="outline" size="sm" onClick={() => prepareSubmit({ date: previousDate, view })}>
              Zurück
            </Button>
            <Button type="submit" variant="outline" size="sm" onClick={() => prepareSubmit({ date: today, view })}>
              Heute
            </Button>
            <Button type="submit" variant="outline" size="sm" onClick={() => prepareSubmit({ date: nextDate, view })}>
              Weiter
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {viewOptions.map((option) => (
              <Button
                key={option.value}
                type="submit"
                variant={view === option.value ? "default" : "outline"}
                size="sm"
                aria-pressed={view === option.value}
                onClick={() => prepareSubmit({ view: option.value })}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </fieldset>
    </form>
  );

  function prepareSubmit({ date, view: nextView }: { date?: string; view: CalendarResult["view"] }) {
    if (date && dateInputRef.current) {
      dateInputRef.current.value = date;
    }
    if (viewInputRef.current) {
      viewInputRef.current.value = nextView;
    }
  }
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return new Date();
  }
  return new Date(year, month - 1, day);
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(date: Date, view: CalendarResult["view"], direction: -1 | 1) {
  const next = new Date(date);
  if (view === "day") {
    next.setDate(next.getDate() + direction);
  } else if (view === "week") {
    next.setDate(next.getDate() + direction * 7);
  } else if (view === "month") {
    next.setMonth(next.getMonth() + direction);
  } else {
    next.setFullYear(next.getFullYear() + direction);
  }
  return next;
}
