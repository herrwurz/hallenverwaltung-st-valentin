"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/permissions";
import { BookingValidationError } from "@/lib/services/booking-rules";
import { importHolidayPreset, saveHolidayPeriod } from "@/lib/services/holiday-service";

function holidayErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Die Eingaben sind nicht gültig.";
  }

  if (error instanceof BookingValidationError) {
    return error.message;
  }

  return "Der Ferienzeitraum konnte nicht gespeichert werden.";
}

export async function createHolidayPeriodAction(formData: FormData) {
  const user = await requirePermission("BLOCK_ROOM");
  let errorMessage: string | undefined;

  try {
    await saveHolidayPeriod(
      {
        name: formData.get("name"),
        countryCode: formData.get("countryCode"),
        regionCode: formData.get("regionCode"),
        startsOn: formData.get("startsOn"),
        endsOn: formData.get("endsOn"),
        defaultStatus: formData.get("defaultStatus"),
        reason: formData.get("reason"),
        isPublic: formData.get("isPublic") === "on",
      },
      user.id,
    );
  } catch (error) {
    errorMessage = holidayErrorMessage(error);
  }

  revalidatePath("/admin/holidays");
  redirect(`/admin/holidays?${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "saved=1"}`);
}

export async function importHolidayPresetAction(formData: FormData) {
  const user = await requirePermission("BLOCK_ROOM");
  let errorMessage: string | undefined;
  let result: { createdCount: number; skippedCount: number } | undefined;

  try {
    result = await importHolidayPreset(
      {
        presetKey: formData.get("presetKey"),
        year: formData.get("year"),
        defaultStatus: formData.get("defaultStatus"),
        isPublic: formData.get("isPublic") === "on",
      },
      user.id,
    );
  } catch (error) {
    errorMessage = holidayErrorMessage(error);
  }

  revalidatePath("/admin/holidays");
  redirect(
    `/admin/holidays?${
      errorMessage
        ? `error=${encodeURIComponent(errorMessage)}`
        : `presetImported=1&created=${result?.createdCount ?? 0}&skipped=${result?.skippedCount ?? 0}`
    }`,
  );
}
