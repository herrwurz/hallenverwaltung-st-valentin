"use client";

import { useState } from "react";
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

type BookingRequestFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  organizations: PortalOrganization[];
  buildings: BuildingOption[];
  usageTypes: UsageTypeOption[];
  inputClassName: string;
};

export function BookingRequestForm({
  action,
  organizations,
  buildings,
  usageTypes,
  inputClassName,
}: BookingRequestFormProps) {
  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  function handleAllDayChange(checked: boolean) {
    setAllDay(checked);
    if (!checked) {
      setStartDate("");
      setEndDate("");
    }
  }

  function handleStartDateChange(value: string) {
    setStartDate(value);
    if (!endDate) setEndDate(value);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (allDay && (!startDate || !endDate)) {
      e.preventDefault();
      (e.currentTarget.querySelector('input[type="date"]') as HTMLInputElement | null)?.focus();
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
      {allDay && (
        <>
          <input type="hidden" name="startsAt" value={startDate ? `${startDate}T00:00` : ""} />
          <input type="hidden" name="endsAt" value={endDate ? `${endDate}T23:59` : ""} />
        </>
      )}

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

      <label className="inline-flex items-center gap-2 text-sm font-medium lg:col-span-2">
        <input
          type="checkbox"
          checked={allDay}
          onChange={(e) => handleAllDayChange(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        Ganztägig
      </label>

      {allDay ? (
        <>
          <label className="text-sm font-medium">
            Von Datum
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className={inputClassName}
            />
          </label>
          <label className="text-sm font-medium">
            Bis Datum
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClassName}
            />
          </label>
        </>
      ) : (
        <>
          <label className="text-sm font-medium">
            Beginn
            <input name="startsAt" type="datetime-local" required className={inputClassName} />
          </label>
          <label className="text-sm font-medium">
            Ende
            <input name="endsAt" type="datetime-local" required className={inputClassName} />
          </label>
        </>
      )}

      <label className="text-sm font-medium lg:col-span-2">
        Beschreibung (optional)
        <textarea name="description" rows={3} maxLength={1000} className={inputClassName} />
      </label>
      <div className="lg:col-span-2">
        <FormActions submitLabel="Antrag absenden" cancelHref="/portal" />
      </div>
    </form>
  );
}
