"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveSession } from "@/lib/permissions";
import { createTestData, deleteTestData } from "@/lib/services/test-data-service";

function testDataRedirect(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      query.set(key, value);
    }
  }

  redirect(`/admin/system/test-data?${query.toString()}`);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Die Testdaten-Aktion konnte nicht ausgeführt werden.";
}

async function requireTestDataAdmin() {
  const user = await requireActiveSession();
  if (!user.roles.includes("SUPER_ADMIN") && !user.roles.includes("SYSTEM_ADMIN")) {
    redirect("/unauthorized");
  }
  return user;
}

export async function createTestDataAction() {
  await requireTestDataAdmin();

  try {
    const result = await createTestData();
    revalidatePath("/admin/system/test-data");
    testDataRedirect({ success: result.message });
  } catch (error) {
    testDataRedirect({ error: getErrorMessage(error) });
  }
}

export async function deleteTestDataAction() {
  await requireTestDataAdmin();

  try {
    const result = await deleteTestData();
    revalidatePath("/admin/system/test-data");
    testDataRedirect({ success: result.message });
  } catch (error) {
    testDataRedirect({ error: getErrorMessage(error) });
  }
}
