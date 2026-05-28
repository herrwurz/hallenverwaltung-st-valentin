"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import {
  processExpiredWaitlistOffers,
  processNotificationQueue,
  runMaintenanceJobs,
} from "@/lib/services/worker-service";

function jobsRedirect(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value !== "undefined" && value !== "") {
      query.set(key, String(value));
    }
  }

  redirect(`/admin/system/jobs?${query.toString()}`);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Der Job konnte nicht ausgefuehrt werden.";
}

export async function processNotificationQueueJobAction() {
  await requirePermission("MANAGE_SYSTEM_JOBS");

  try {
    const result = await processNotificationQueue();
    revalidatePath("/admin/system/jobs");
    jobsRedirect({ job: result.jobName, processed: result.processedCount });
  } catch (error) {
    jobsRedirect({ error: getErrorMessage(error) });
  }
}

export async function processExpiredWaitlistOffersJobAction() {
  await requirePermission("MANAGE_SYSTEM_JOBS");

  try {
    const result = await processExpiredWaitlistOffers();
    revalidatePath("/admin/system/jobs");
    jobsRedirect({ job: result.jobName, processed: result.processedCount });
  } catch (error) {
    jobsRedirect({ error: getErrorMessage(error) });
  }
}

export async function runMaintenanceJobsAction() {
  await requirePermission("MANAGE_SYSTEM_JOBS");

  try {
    const result = await runMaintenanceJobs();
    revalidatePath("/admin/system/jobs");
    jobsRedirect({ job: result.jobName, processed: result.processedCount });
  } catch (error) {
    jobsRedirect({ error: getErrorMessage(error) });
  }
}
