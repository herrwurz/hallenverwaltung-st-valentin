"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/permissions";
import {
  deleteTariff,
  endTariff,
  saveTariff,
  saveTariffGroup,
  setTariffActive,
  TariffValidationError,
} from "@/lib/services/admin/tariff-service";

function getErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Die Eingaben sind nicht gültig.";
  }

  if (error instanceof TariffValidationError) {
    return error.message;
  }

  return "Die Tarifdaten konnten nicht gespeichert werden.";
}

async function executeTariffMutation(operation: () => Promise<void>) {
  await requirePermission("MANAGE_TARIFFS");

  let errorMessage: string | undefined;
  try {
    await operation();
  } catch (error) {
    errorMessage = getErrorMessage(error);
  }

  revalidatePath("/admin/tariffs");
  redirect(`/admin/tariffs?${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "saved=1"}`);
}

function optionalValue(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value || undefined;
}

export async function saveTariffGroupAction(formData: FormData) {
  await executeTariffMutation(() =>
    saveTariffGroup({
      id: optionalValue(formData, "id"),
      code: String(formData.get("code") ?? "").trim().toUpperCase(),
      name: formData.get("name"),
      description: optionalValue(formData, "description"),
    }),
  );
}

export async function saveTariffAction(formData: FormData) {
  await executeTariffMutation(() =>
    saveTariff({
      id: optionalValue(formData, "id"),
      tariffGroupId: formData.get("tariffGroupId"),
      roomId: formData.get("roomId"),
      usageTypeId: formData.get("usageTypeId"),
      organizationTypeId: formData.get("organizationTypeId"),
      name: formData.get("name"),
      hourlyRate: optionalValue(formData, "hourlyRate") ?? null,
      flatRate: optionalValue(formData, "flatRate") ?? null,
      dayType: formData.get("dayType"),
      validFrom: formData.get("validFrom"),
      validUntil: optionalValue(formData, "validUntil") ?? null,
    }),
  );
}

export async function endTariffAction(formData: FormData) {
  await executeTariffMutation(() =>
    endTariff({
      id: formData.get("id"),
      validUntil: formData.get("validUntil"),
    }),
  );
}

export async function deactivateTariffAction(formData: FormData) {
  await executeTariffMutation(() => setTariffActive({ id: formData.get("id") }, false));
}

export async function activateTariffAction(formData: FormData) {
  await executeTariffMutation(() => setTariffActive({ id: formData.get("id") }, true));
}

export async function deleteTariffAction(formData: FormData) {
  await executeTariffMutation(() => deleteTariff({ id: formData.get("id") }));
}
