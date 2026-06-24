"use client";

import { useState } from "react";

type Building = {
  id: string;
  name: string;
  rooms: { id: string; name: string }[];
};

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";

export function HolidayClosureTargetPicker({ buildings }: { buildings: Building[] }) {
  const [selectedBuildingId, setSelectedBuildingId] = useState("");

  const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId) ?? null;
  const roomOptions = selectedBuilding
    ? selectedBuilding.rooms.map((r) => ({ id: r.id, label: r.name }))
    : buildings.flatMap((b) => b.rooms.map((r) => ({ id: r.id, label: `${b.name} – ${r.name}` })));

  return (
    <>
      <label className="text-sm font-medium">
        Gebäude
        <select
          name="buildingId"
          value={selectedBuildingId}
          className={inputClass}
          onChange={(e) => setSelectedBuildingId(e.target.value)}
        >
          <option value="">Keine Gebäudesperre</option>
          {buildings.map((building) => (
            <option key={building.id} value={building.id}>
              {building.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        Raum
        <select name="roomId" defaultValue="" className={inputClass}>
          <option value="">Keine Raumsperre</option>
          {roomOptions.map((room) => (
            <option key={room.id} value={room.id}>
              {room.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
