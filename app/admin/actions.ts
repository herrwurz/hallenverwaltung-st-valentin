"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/permissions";
import { saveBuilding } from "@/lib/services/admin/building-service";
import { createClosure } from "@/lib/services/admin/closure-admin-service";
import { saveOrganization } from "@/lib/services/admin/organization-service";
import { saveRoom } from "@/lib/services/admin/room-service";
import { saveUser } from "@/lib/services/admin/user-service";
import { BookingValidationError } from "@/lib/services/booking-rules";

function optionalValue(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value || undefined;
}

function getErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Die Eingaben sind nicht gültig.";
  }

  if (error instanceof BookingValidationError) {
    return error.message;
  }

  const expectedMessages = new Set([
    "Ein Raum kann nicht sein eigener Teilbereich sein.",
    "Parent-Room und Teilbereich müssen demselben Gebäude zugeordnet sein.",
    "Die Parent-Room-Zuordnung darf keinen Zyklus bilden.",
    "Neue Benutzer benötigen ein Passwort.",
    "Das Passwort muss mindestens 12 Zeichen enthalten.",
    "Die primäre Organisation muss dem Benutzer zugewiesen sein.",
    "Nur Super-Admins dürfen Super-Admin-Benutzer verwalten.",
  ]);

  if (error instanceof Error && expectedMessages.has(error.message)) {
    return error.message;
  }

  return "Die Stammdaten konnten nicht gespeichert werden.";
}

async function executeAdminMutation(path: string, operation: (actorUserId: string) => Promise<void>) {
  const actor = await requirePermission("MANAGE_USERS");

  let errorMessage: string | undefined;
  try {
    await operation(actor.id);
  } catch (error) {
    errorMessage = getErrorMessage(error);
  }

  revalidatePath(path);
  redirect(`${path}?${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "saved=1"}`);
}

async function executeClosureMutation(path: string, operation: (actorUserId: string) => Promise<void>) {
  const actor = await requirePermission("BLOCK_ROOM");

  let errorMessage: string | undefined;
  try {
    await operation(actor.id);
  } catch (error) {
    errorMessage = getErrorMessage(error);
  }

  revalidatePath(path);
  redirect(`${path}?${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "closureSaved=1"}`);
}

export async function saveBuildingAction(formData: FormData) {
  await executeAdminMutation("/admin/buildings", () =>
    saveBuilding({
      id: optionalValue(formData, "id"),
      code: String(formData.get("code") ?? "").trim().toUpperCase(),
      name: formData.get("name"),
      address: optionalValue(formData, "address"),
      postalCode: optionalValue(formData, "postalCode"),
      city: optionalValue(formData, "city"),
      email: optionalValue(formData, "email"),
      phone: optionalValue(formData, "phone"),
      isActive: formData.get("isActive") === "on",
      caretakerId: optionalValue(formData, "caretakerId"),
    }),
  );
}

export async function saveRoomAction(formData: FormData) {
  await executeAdminMutation("/admin/rooms", () =>
    saveRoom({
      id: optionalValue(formData, "id"),
      buildingId: formData.get("buildingId"),
      parentRoomId: optionalValue(formData, "parentRoomId"),
      code: String(formData.get("code") ?? "").trim().toUpperCase(),
      name: formData.get("name"),
      description: optionalValue(formData, "description"),
      status: formData.get("status"),
      isCombinable: formData.get("isCombinable") === "on",
      openingTime: formData.get("openingTime"),
      closingTime: formData.get("closingTime"),
      setupBufferMinutes: formData.get("setupBufferMinutes"),
      teardownBufferMinutes: formData.get("teardownBufferMinutes"),
    }),
  );
}

export async function createBuildingClosureAction(formData: FormData) {
  await executeClosureMutation("/admin/buildings", async (actorUserId) => {
    await createClosure(
      {
        buildingId: formData.get("buildingId"),
        status: formData.get("status"),
        reason: formData.get("reason"),
        startsAt: formData.get("startsAt"),
        endsAt: formData.get("endsAt"),
        isPublic: formData.get("isPublic") === "on",
      },
      actorUserId,
    );
  });
}

export async function createRoomClosureAction(formData: FormData) {
  await executeClosureMutation("/admin/rooms", async (actorUserId) => {
    await createClosure(
      {
        roomId: formData.get("roomId"),
        status: formData.get("status"),
        reason: formData.get("reason"),
        startsAt: formData.get("startsAt"),
        endsAt: formData.get("endsAt"),
        isPublic: formData.get("isPublic") === "on",
      },
      actorUserId,
    );
  });
}

export async function saveOrganizationAction(formData: FormData) {
  await executeAdminMutation("/admin/organizations", () =>
    saveOrganization({
      id: optionalValue(formData, "id"),
      name: formData.get("name"),
      organizationTypeId: formData.get("organizationTypeId"),
      status: formData.get("status"),
      blockedReason: optionalValue(formData, "blockedReason"),
    }),
  );
}

export async function saveUserAction(formData: FormData) {
  await executeAdminMutation("/admin/users", (actorUserId) =>
    saveUser({
      id: optionalValue(formData, "id"),
      displayName: formData.get("displayName"),
      email: formData.get("email"),
      password: optionalValue(formData, "password"),
      isActive: formData.get("isActive") === "on",
      roleIds: formData.getAll("roleIds").map(String),
      organizationIds: formData.getAll("organizationIds").map(String),
      membershipFunction: optionalValue(formData, "membershipFunction") ?? "Mitglied",
      primaryOrganizationId: optionalValue(formData, "primaryOrganizationId"),
    }, actorUserId),
  );
}
