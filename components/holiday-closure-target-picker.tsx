"use client";

import { useState } from "react";

type Building = {
  id: string;
  name: string;
  rooms: { id: string; name: string }[];
};

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";

export function HolidayClosureTargetPicker({ buildings }: { buildings: Building[] }) {
  const [filterBuildingId, setFilterBuildingId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");

  // If a room is selected, building is only used for filtering — don't submit it.
  const submitBuildingId = selectedRoomId ? "" : filterBuildingId;

  const selectedBuilding = buildings.find((b) => b.id === filterBuildingId) ?? null;
  const roomOptions = selectedBuilding
    ? selectedBuilding.rooms.map((r) => ({ id: r.id, label: r.name }))
    : buildings.flatMap((b) => b.rooms.map((r) => ({ id: r.id, label: `${b.name} – ${r.name}` })));

  return (
    <>
      <input type="hidden" name="buildingId" value={submitBuildingId} />
      <input type="hidden" name="roomId" value={selectedRoomId} />

      <label className="text-sm font-medium">
        Gebäude
        <select
          value={filterBuildingId}
          className={inputClass}
          onChange={(e) => {
            setFilterBuildingId(e.target.value);
            setSelectedRoomId("");
          }}
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
        <select
          value={selectedRoomId}
          className={inputClass}
          onChange={(e) => setSelectedRoomId(e.target.value)}
        >
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
