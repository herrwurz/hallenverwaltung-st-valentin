import { runMaintenanceJobs } from "@/lib/services/worker-service";

async function main() {
  const result = await runMaintenanceJobs();
  console.log(
    JSON.stringify(
      {
        jobName: result.jobName,
        status: result.status,
        processedCount: result.processedCount,
        startedAt: result.startedAt.toISOString(),
        finishedAt: result.finishedAt.toISOString(),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
