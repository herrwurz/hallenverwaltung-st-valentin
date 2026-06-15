"use client";

import { useMemo, useState } from "react";
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

  return (
    <form method="get" className="grid gap-4 lg:grid-cols-[1fr,1fr,1fr,220px,auto]">
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
          name="date"
          type="date"
          defaultValue={selectedDate}
          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
        />
      </label>

      <div className="flex items-end">
        <Button type="submit" name="view" value={view} className="w-full">
          Aktualisieren
        </Button>
      </div>

      <fieldset className="lg:col-span-full">
        <legend className="text-sm font-medium text-foreground">Ansicht</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {viewOptions.map((option) => (
            <Button
              key={option.value}
              type="submit"
              name="view"
              value={option.value}
              variant={view === option.value ? "default" : "outline"}
              size="sm"
              aria-pressed={view === option.value}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </fieldset>
    </form>
  );
}
