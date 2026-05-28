import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { processPendingNotifications } from "@/lib/services/notification-service";
import { expireWaitlistOffers } from "@/lib/services/waitlist-service";

type WorkerClient = PrismaClient;

type WorkerDependencies = {
  now?: () => Date;
  processNotifications?: typeof processPendingNotifications;
  expireWaitlist?: typeof expireWaitlistOffers;
};

export type WorkerJobStatus = "SUCCESS" | "FAILED";

export type WorkerJobResult = {
  jobName: string;
  startedAt: Date;
  finishedAt: Date;
  status: WorkerJobStatus;
  processedCount: number;
  errorMessage?: string;
};

const workerJobEntityType = "WorkerJob";

async function writeJobAudit(result: WorkerJobResult, client: WorkerClient) {
  await client.auditEntry.create({
    data: {
      entityType: workerJobEntityType,
      entityId: result.jobName,
      action: result.status,
      payload: {
        jobName: result.jobName,
        startedAt: result.startedAt.toISOString(),
        finishedAt: result.finishedAt.toISOString(),
        status: result.status,
        processedCount: result.processedCount,
        errorMessage: result.errorMessage ?? null,
      },
    },
  });
}

async function runLoggedJob(
  jobName: string,
  client: WorkerClient,
  dependencies: WorkerDependencies,
  handler: (now: Date) => Promise<number>,
) {
  const startedAt = dependencies.now?.() ?? new Date();

  try {
    const processedCount = await handler(startedAt);
    const result: WorkerJobResult = {
      jobName,
      startedAt,
      finishedAt: dependencies.now?.() ?? new Date(),
      status: "SUCCESS",
      processedCount,
    };
    await writeJobAudit(result, client);
    return result;
  } catch (error) {
    const result: WorkerJobResult = {
      jobName,
      startedAt,
      finishedAt: dependencies.now?.() ?? new Date(),
      status: "FAILED",
      processedCount: 0,
      errorMessage: error instanceof Error ? error.message : "Der Job ist fehlgeschlagen.",
    };
    await writeJobAudit(result, client);
    throw error;
  }
}

export async function processNotificationQueue(
  input: { limit?: number } = {},
  client: WorkerClient = prisma,
  dependencies: WorkerDependencies = {},
) {
  return runLoggedJob("notificationQueue", client, dependencies, async () => {
    const processor = dependencies.processNotifications ?? processPendingNotifications;
    const results = await processor(input.limit ?? 25, client, {
      now: dependencies.now,
    });
    return results.length;
  });
}

export async function processExpiredWaitlistOffers(
  client: WorkerClient = prisma,
  dependencies: WorkerDependencies = {},
) {
  return runLoggedJob("expiredWaitlistOffers", client, dependencies, async (now) => {
    const expireOffers = dependencies.expireWaitlist ?? expireWaitlistOffers;
    const expiredIds = await expireOffers(now, client);
    return expiredIds.length;
  });
}

export async function runMaintenanceJobs(
  client: WorkerClient = prisma,
  dependencies: WorkerDependencies = {},
) {
  return runLoggedJob("maintenance", client, dependencies, async () => {
    const notificationResult = await processNotificationQueue({}, client, dependencies);
    const waitlistResult = await processExpiredWaitlistOffers(client, dependencies);
    return notificationResult.processedCount + waitlistResult.processedCount;
  });
}

export async function getWorkerJobRuns(limit = 10, client: WorkerClient = prisma) {
  return client.auditEntry.findMany({
    where: {
      entityType: workerJobEntityType,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    select: {
      id: true,
      entityId: true,
      action: true,
      payload: true,
      createdAt: true,
    },
  });
}
