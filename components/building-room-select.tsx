"use client";

import { useMemo, useState } from "react";

type RoomOption = {
  id: string;
  name: string;
};

type BuildingOption = {
  id: string;
  name: string;
  rooms: RoomOption[];
};

type BuildingRoomSelectProps = {
  buildings: BuildingOption[];
  roomName?: string;
  defaultRoomId?: string;
  buildingLabel?: string;
  roomLabel?: string;
  inputClassName: string;
};

function findInitialBuildingId(buildings: BuildingOption[], defaultRoomId: string | undefined) {
  const defaultBuilding = defaultRoomId
    ? buildings.find((building) => building.rooms.some((room) => room.id === defaultRoomId))
    : undefined;

  return defaultBuilding?.id ?? buildings.find((building) => building.rooms.length > 0)?.id ?? "";
}

export function BuildingRoomSelect({
  buildings,
  roomName = "roomId",
  defaultRoomId,
  buildingLabel = "Gebäude",
  roomLabel = "Raum",
  inputClassName,
}: BuildingRoomSelectProps) {
  const [selectedBuildingId, setSelectedBuildingId] = useState(() =>
    findInitialBuildingId(buildings, defaultRoomId),
  );

  const availableRooms = useMemo(
    () => buildings.find((building) => building.id === selectedBuildingId)?.rooms ?? [],
    [buildings, selectedBuildingId],
  );
  const hasDefaultInSelectedBuilding = availableRooms.some((room) => room.id === defaultRoomId);

  return (
    <>
      <label className="text-sm text-slate-300">
        {buildingLabel}
        <select
          name={`${roomName}BuildingFilter`}
          value={selectedBuildingId}
          onChange={(event) => setSelectedBuildingId(event.target.value)}
          className={inputClassName}
        >
          {buildings.length === 0 ? (
            <option value="">Keine aktiven Gebäude vorhanden</option>
          ) : null}
          {buildings.map((building) => (
            <option key={building.id} value={building.id} disabled={building.rooms.length === 0}>
              {building.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm text-slate-300">
        {roomLabel}
        <select
          name={roomName}
          required
          defaultValue={hasDefaultInSelectedBuilding ? defaultRoomId : ""}
          key={selectedBuildingId}
          className={inputClassName}
        >
          <option value="" disabled>
            Bitte wählen
          </option>
          {availableRooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
