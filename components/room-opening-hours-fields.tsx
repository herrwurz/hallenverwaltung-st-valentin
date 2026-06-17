"use client";

import { useState } from "react";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";

type RoomOpeningHoursFieldsProps = {
  openingTime?: string | null;
  closingTime?: string | null;
};

export function RoomOpeningHoursFields({ openingTime, closingTime }: RoomOpeningHoursFieldsProps) {
  const initialAllDay = !openingTime || !closingTime || (openingTime === "00:00" && closingTime === "23:59");
  const [isAllDay, setIsAllDay] = useState(initialAllDay);
  const [opening, setOpening] = useState(initialAllDay ? "00:00" : openingTime);
  const [closing, setClosing] = useState(initialAllDay ? "23:59" : closingTime);

  function toggleAllDay(checked: boolean) {
    setIsAllDay(checked);
    if (checked) {
      setOpening("00:00");
      setClosing("23:59");
    }
  }

  return (
    <>
      <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={isAllDay}
          onChange={(event) => toggleAllDay(event.target.checked)}
          className="rounded border-input bg-background"
        />
        Ganztags geöffnet
      </label>
      <div className="hidden lg:block" aria-hidden="true" />
      <label className="text-sm font-medium">
        Geöffnet ab
        <input
          name="openingTime"
          required
          value={opening ?? "00:00"}
          readOnly={isAllDay}
          onChange={(event) => setOpening(event.target.value)}
          className={inputClass}
        />
      </label>
      <label className="text-sm font-medium">
        Geöffnet bis
        <input
          name="closingTime"
          required
          value={closing ?? "23:59"}
          readOnly={isAllDay}
          onChange={(event) => setClosing(event.target.value)}
          className={inputClass}
        />
      </label>
    </>
  );
}
