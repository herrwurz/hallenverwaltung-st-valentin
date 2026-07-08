"use client";

import { useState } from "react";

const endDateFormatter = new Intl.DateTimeFormat("de-AT", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

type SingleDayTimeRangeFieldsProps = {
  startName: string;
  endName: string;
  startLabel?: string;
  endLabel?: string;
  hint?: string;
  inputClassName: string;
};

/**
 * Beginn als Datum + Uhrzeit, Ende nur als Uhrzeit: Der Endtag ist immer der
 * Beginntag. Mehrtägige Termine laufen bewusst über den Serienantrag.
 */
export function SingleDayTimeRangeFields({
  startName,
  endName,
  startLabel = "Beginn",
  endLabel = "Ende",
  hint = "Einzeltermine enden am selben Tag. Für mehrtägige oder wiederkehrende Termine bitte einen Serienantrag stellen.",
  inputClassName,
}: SingleDayTimeRangeFieldsProps) {
  const [start, setStart] = useState("");
  const [endTime, setEndTime] = useState("");

  const startDate = start.slice(0, 10);
  const startTime = start.slice(11, 16);
  const endsAtValue = startDate && endTime ? `${startDate}T${endTime}` : "";
  const endDateLabel = startDate ? endDateFormatter.format(new Date(`${startDate}T00:00`)) : null;
  const endTimeError =
    startTime && endTime && endTime <= startTime ? "Die Endzeit muss nach der Beginnzeit liegen." : "";

  return (
    <>
      <input type="hidden" name={endName} value={endsAtValue} />
      <label className="text-sm font-medium">
        {startLabel}
        <input
          name={startName}
          type="datetime-local"
          required
          value={start}
          onChange={(event) => setStart(event.target.value)}
          className={inputClassName}
        />
      </label>
      <label className="text-sm font-medium">
        {endLabel}
        {endDateLabel ? <span className="ml-2 font-normal text-muted-foreground">am {endDateLabel}</span> : null}
        <input
          name={`${endName}Time`}
          type="time"
          required
          value={endTime}
          onChange={(event) => setEndTime(event.target.value)}
          ref={(element) => element?.setCustomValidity(endTimeError)}
          className={inputClassName}
        />
      </label>
      <p className="text-xs text-muted-foreground lg:col-span-2">{hint}</p>
    </>
  );
}
