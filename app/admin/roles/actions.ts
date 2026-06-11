"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import { BookingValidationError } from "@/lib/services/booking-rules";
import { updateRolePermissions } from "@/lib/services/admin/role-service";

function rolePermissionErrorMessage(error: unknown) {
  if (error instanceof BookingValidationError) {
    return error.message;
  }

  return "Die Rolle-Rechte-Zuordnung konnte nicht gespeichert werden.";
}

export async function updateRolePermissionsAction(formData: FormData) {
  const user = await requirePermission("MANAGE_USERS");
  let errorMessage: string | undefined;

  try {
    await updateRolePermissions(
      {
        roleId: String(formData.get("roleId") ?? ""),
        permissionIds: formData.getAll("permissionIds"),
      },
      user.id,
    );
  } catch (error) {
    errorMessage = rolePermissionErrorMessage(error);
  }

  revalidatePath("/admin/roles");
  redirect(`/admin/roles?${errorMessage ? `error=${encodeURIComponent(errorMessage)}` : "saved=1"}`);
}
