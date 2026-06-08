"use client";

import { useMemo, useState } from "react";
import { BuildingRoomSelect } from "@/components/building-room-select";
import { FormActions } from "@/components/form-actions";
import { PortalOrganizationField } from "@/components/portal-organization-field";

type PortalOrganization = {
  id: string;
  name: string;
};

type RoomOption = {
  id: string;
  name: string;
};

type BuildingOption = {
  id: string;
  name: string;
  rooms: RoomOption[];
};

type UsageTypeOption = {
  id: string;
  name: string;
};

type SeriesRequestFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  organizations: PortalOrganization[];
  buildings: BuildingOption[];
  usageTypes: UsageTypeOption[];
  inputClassName: string;
};

const weekdays = [
  { value: 1, label: "Montag" },
  { value: 2, label: "Dienstag" },
  { value: 3, label: "Mittwoch" },
  { value: 4, label: "Donnerstag" },
  { value: 5, label: "Freitag" },
  { value: 6, label: "Samstag" },
  { value: 0, label: "Sonntag" },
] as const;

const ordinalOptions = [
  { value: "FIRST", label: "ersten" },
  { value: "SECOND", label: "zweiten" },
  { value: "THIRD", label: "dritten" },
  { value: "FOURTH", label: "vierten" },
  { value: "LAST", label: "letzten" },
] as const;

const monthOptions = [
  "Jänner",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
].map((label, index) => ({ value: index + 1, label }));

const previewFormatter = new Intl.DateTimeFormat("de-AT", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function parseDateTime(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function withTime(date: Date, source: Date) {
  const candidate = new Date(date);
  candidate.setHours(source.getHours(), source.getMinutes(), 0, 0);
  return candidate;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function startOfWeek(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  normalized.setDate(normalized.getDate() - ((normalized.getDay() + 6) % 7));
  return normalized;
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function nthWeekday(year: number, monthIndex: number, weekday: number, ordinal: string) {
  if (ordinal === "LAST") {
    const date = new Date(year, monthIndex + 1, 0);
    while (date.getDay() !== weekday) date.setDate(date.getDate() - 1);
    return date;
  }

  const ordinalIndex = Math.max(1, ordinalOptions.findIndex((option) => option.value === ordinal) + 1);
  const date = new Date(year, monthIndex, 1);
  while (date.getDay() !== weekday) date.setDate(date.getDate() + 1);
  date.setDate(date.getDate() + (ordinalIndex - 1) * 7);
  return date.getMonth() === monthIndex ? date : null;
}

function monthDistance(first: Date, candidate: Date) {
  return (candidate.getFullYear() - first.getFullYear()) * 12 + candidate.getMonth() - first.getMonth();
}

function buildPreview({
  recurrenceType,
  interval,
  firstStartsAt,
  repeatUntil,
  selectedWeekdays,
  monthlyMode,
  dayOfMonth,
  ordinal,
  weekday,
  month,
}: {
  recurrenceType: string;
  interval: number;
  firstStartsAt: Date | null;
  repeatUntil: Date | null;
  selectedWeekdays: number[];
  monthlyMode: string;
  dayOfMonth: number;
  ordinal: string;
  weekday: number;
  month: number;
}) {
  if (!firstStartsAt || !repeatUntil || repeatUntil < firstStartsAt) {
    return [];
  }

  const dates: Date[] = [];
  const push = (date: Date | null) => {
    if (date && date >= firstStartsAt && date <= repeatUntil && dates.length < 50) {
      dates.push(date);
    }
  };

  if (recurrenceType === "DAILY") {
    for (let date = new Date(firstStartsAt); date <= repeatUntil && dates.length < 50; date = addDays(date, interval)) {
      push(new Date(date));
    }
  }

  if (recurrenceType === "WEEKLY") {
    const selected = selectedWeekdays.length > 0 ? selectedWeekdays : [firstStartsAt.getDay()];
    const firstWeek = startOfWeek(firstStartsAt);
    for (let date = new Date(firstStartsAt); date <= repeatUntil && dates.length < 50; date = addDays(date, 1)) {
      const weekDistance = Math.floor((startOfWeek(date).getTime() - firstWeek.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (weekDistance % interval === 0 && selected.includes(date.getDay())) {
        push(withTime(date, firstStartsAt));
      }
    }
  }

  if (recurrenceType === "MONTHLY") {
    for (let cursor = new Date(firstStartsAt.getFullYear(), firstStartsAt.getMonth(), 1); cursor <= repeatUntil && dates.length < 50; cursor = addMonths(cursor, 1)) {
      if (monthDistance(firstStartsAt, cursor) % interval !== 0) continue;
      if (monthlyMode === "NTH_WEEKDAY") {
        push(nthWeekday(cursor.getFullYear(), cursor.getMonth(), weekday, ordinal));
      } else {
        push(new Date(cursor.getFullYear(), cursor.getMonth(), Math.min(dayOfMonth, daysInMonth(cursor.getFullYear(), cursor.getMonth())), firstStartsAt.getHours(), firstStartsAt.getMinutes()));
      }
    }
  }

  if (recurrenceType === "YEARLY") {
    for (let year = firstStartsAt.getFullYear(); year <= repeatUntil.getFullYear() && dates.length < 50; year += 1) {
      if ((year - firstStartsAt.getFullYear()) % interval !== 0) continue;
      const monthIndex = month - 1;
      if (monthlyMode === "NTH_WEEKDAY") {
        const candidate = nthWeekday(year, monthIndex, weekday, ordinal);
        push(candidate ? withTime(candidate, firstStartsAt) : null);
      } else {
        push(new Date(year, monthIndex, Math.min(dayOfMonth, daysInMonth(year, monthIndex)), firstStartsAt.getHours(), firstStartsAt.getMinutes()));
      }
    }
  }

  return dates.sort((a, b) => a.getTime() - b.getTime());
}

export function SeriesRequestForm({
  action,
  organizations,
  buildings,
  usageTypes,
  inputClassName,
}: SeriesRequestFormProps) {
  const [recurrenceType, setRecurrenceType] = useState("WEEKLY");
  const [interval, setInterval] = useState(1);
  const [firstStartsAt, setFirstStartsAt] = useState("");
  const [repeatUntil, setRepeatUntil] = useState("");
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [monthlyMode, setMonthlyMode] = useState("DAY_OF_MONTH");
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [ordinal, setOrdinal] = useState("FIRST");
  const [weekday, setWeekday] = useState(3);
  const [month, setMonth] = useState(1);

  const preview = useMemo(
    () =>
      buildPreview({
        recurrenceType,
        interval,
        firstStartsAt: parseDateTime(firstStartsAt),
        repeatUntil: parseDateTime(repeatUntil ? `${repeatUntil}T23:59:59` : ""),
        selectedWeekdays,
        monthlyMode,
        dayOfMonth,
        ordinal,
        weekday,
        month,
      }),
    [dayOfMonth, firstStartsAt, interval, month, monthlyMode, ordinal, recurrenceType, repeatUntil, selectedWeekdays, weekday],
  );

  const toggleWeekday = (value: number) => {
    setSelectedWeekdays((current) =>
      current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value].sort((a, b) => a - b),
    );
  };

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <PortalOrganizationField organizations={organizations} inputClassName={inputClassName} />
        <BuildingRoomSelect buildings={buildings} inputClassName={inputClassName} />
        <label className="text-sm font-medium">
          Titel
          <input name="title" required maxLength={160} className={inputClassName} />
        </label>
        <label className="text-sm font-medium">
          Nutzungstyp
          <select name="usageTypeId" required defaultValue="" className={inputClassName}>
            <option value="" disabled>
              Bitte wählen
            </option>
            {usageTypes.map((usageType) => (
              <option key={usageType.id} value={usageType.id}>
                {usageType.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="rounded-xl border border-border bg-card p-4">
        <legend className="px-2 text-sm font-semibold text-emerald-700">Serienmuster</legend>
        <div className="grid gap-4 lg:grid-cols-[12rem,1fr]">
          <label className="text-sm font-semibold text-primary">
            Intervall
            <select
              name="recurrenceType"
              value={recurrenceType}
              onChange={(event) => setRecurrenceType(event.target.value)}
              className={inputClassName}
            >
              <option value="DAILY">Täglich</option>
              <option value="WEEKLY">Wöchentlich</option>
              <option value="MONTHLY">Monatlich</option>
              <option value="YEARLY">Jährlich</option>
            </select>
          </label>

          <div className="space-y-4 pt-6 text-sm">
            <label className="inline-flex items-center gap-2">
              Jeden
              <input
                name="interval"
                type="number"
                min={1}
                max={99}
                value={interval}
                onChange={(event) => setInterval(Number(event.target.value) || 1)}
                className="w-20 rounded-lg border border-input bg-background px-3 py-2"
              />
              {recurrenceType === "DAILY" ? "Tag" : recurrenceType === "WEEKLY" ? "Woche" : recurrenceType === "MONTHLY" ? "Monat" : "Jahr"}
            </label>

            {recurrenceType === "WEEKLY" ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {weekdays.map((day) => (
                  <label key={day.value} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="weekdays"
                      value={day.value}
                      checked={selectedWeekdays.includes(day.value)}
                      onChange={() => toggleWeekday(day.value)}
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            ) : null}

            {recurrenceType === "MONTHLY" || recurrenceType === "YEARLY" ? (
              <div className="space-y-3">
                {recurrenceType === "YEARLY" ? (
                  <label className="inline-flex items-center gap-2">
                    im
                    <select name="month" value={month} onChange={(event) => setMonth(Number(event.target.value))} className="rounded-lg border border-input bg-background px-3 py-2">
                      {monthOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className="flex flex-wrap items-center gap-2">
                  <input
                    type="radio"
                    name="monthlyMode"
                    value="DAY_OF_MONTH"
                    checked={monthlyMode === "DAY_OF_MONTH"}
                    onChange={() => setMonthlyMode("DAY_OF_MONTH")}
                  />
                  Am
                  <input
                    name="dayOfMonth"
                    type="number"
                    min={1}
                    max={31}
                    value={dayOfMonth}
                    onChange={(event) => setDayOfMonth(Number(event.target.value) || 1)}
                    className="w-20 rounded-lg border border-input bg-background px-3 py-2"
                  />
                  . Tag
                </label>
                <label className="flex flex-wrap items-center gap-2">
                  <input
                    type="radio"
                    name="monthlyMode"
                    value="NTH_WEEKDAY"
                    checked={monthlyMode === "NTH_WEEKDAY"}
                    onChange={() => setMonthlyMode("NTH_WEEKDAY")}
                  />
                  Am
                  <select name="ordinal" value={ordinal} onChange={(event) => setOrdinal(event.target.value)} className="rounded-lg border border-input bg-background px-3 py-2">
                    {ordinalOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select name="weekday" value={weekday} onChange={(event) => setWeekday(Number(event.target.value))} className="rounded-lg border border-input bg-background px-3 py-2">
                    {weekdays.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-border bg-card p-4">
        <legend className="px-2 text-sm font-semibold text-emerald-700">Seriendauer</legend>
        <div className="grid gap-4 lg:grid-cols-3">
          <label className="text-sm font-medium">
            Beginn
            <input
              name="firstStartsAt"
              type="datetime-local"
              required
              value={firstStartsAt}
              onChange={(event) => setFirstStartsAt(event.target.value)}
              className={inputClassName}
            />
          </label>
          <label className="text-sm font-medium">
            Erstes Ende
            <input name="firstEndsAt" type="datetime-local" required className={inputClassName} />
          </label>
          <label className="text-sm font-medium">
            Endet am
            <input
              name="repeatUntil"
              type="date"
              required
              value={repeatUntil}
              onChange={(event) => setRepeatUntil(event.target.value)}
              className={inputClassName}
            />
          </label>
        </div>
      </fieldset>

      <div className="grid gap-4 lg:grid-cols-[1fr,18rem]">
        <label className="text-sm font-medium">
          Beschreibung (optional)
          <textarea name="description" rows={3} maxLength={1000} className={inputClassName} />
        </label>
        <label className="text-sm font-medium">
          Ausnahmedaten (optional, ein Datum pro Zeile)
          <textarea name="excludedDates" rows={3} placeholder="2026-10-26" className={inputClassName} />
        </label>
      </div>

      <section className="rounded-xl border border-border bg-muted/40 p-4">
        <h4 className="text-sm font-semibold">Vorschau (max. 50 Einträge)</h4>
        {preview.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Beginn und Ende ausfüllen, um eine Vorschau zu sehen.</p>
        ) : (
          <ol className="mt-3 grid max-h-48 gap-1 overflow-auto rounded-lg bg-card p-3 text-sm sm:grid-cols-2">
            {preview.map((date) => (
              <li key={date.toISOString()}>{previewFormatter.format(date)}</li>
            ))}
          </ol>
        )}
      </section>

      <FormActions submitLabel="Serienantrag absenden" cancelHref="/portal" />
    </form>
  );
}
