import assert from "node:assert/strict";
import test from "node:test";
import {
  getWorkerJobRuns,
  processExpiredWaitlistOffers,
  processNotificationQueue,
  runMaintenanceJobs,
} from "../lib/services/worker-service";

function createWorkerHarness() {
  const auditEntries: Array<Record<string, unknown>> = [];

  const client = {
    auditEntry: {
      async create(args: { data: Record<string, unknown> }) {
        const entry = {
          id: `audit-${auditEntries.length + 1}`,
          createdAt: new Date("2026-06-01T12:00:00Z"),
          ...args.data,
        };
        auditEntries.push(entry);
        return entry;
      },
      async findMany(args: { take: number }) {
        return auditEntries.slice(-args.take).reverse();
      },
    },
  };

  return { client, auditEntries };
}

test("notification queue worker logs processed notifications", async () => {
  const harness = createWorkerHarness();

  const result = await processNotificationQueue(
    { limit: 10 },
    harness.client as never,
    {
      now: () => new Date("2026-06-01T12:00:00Z"),
      processNotifications: async (limit) => {
        assert.equal(limit, 10);
        return [{ id: "notification-1" }, { id: "notification-2" }] as never;
      },
    },
  );

  assert.equal(result.jobName, "notificationQueue");
  assert.equal(result.status, "SUCCESS");
  assert.equal(result.processedCount, 2);
  assert.equal(harness.auditEntries.length, 1);
  assert.equal(harness.auditEntries[0]?.entityId, "notificationQueue");
});

test("expired waitlist worker logs expired offers", async () => {
  const harness = createWorkerHarness();

  const result = await processExpiredWaitlistOffers(harness.client as never, {
    now: () => new Date("2026-06-01T12:00:00Z"),
    expireWaitlist: async (now) => {
      assert.equal(now?.toISOString(), "2026-06-01T12:00:00.000Z");
      return ["waitlist-1", "waitlist-2"];
    },
  });

  assert.equal(result.jobName, "expiredWaitlistOffers");
  assert.equal(result.processedCount, 2);
  assert.equal(harness.auditEntries[0]?.action, "SUCCESS");
});

test("maintenance worker runs notification and waitlist jobs and logs summary", async () => {
  const harness = createWorkerHarness();

  const result = await runMaintenanceJobs(harness.client as never, {
    now: () => new Date("2026-06-01T12:00:00Z"),
    processNotifications: async () => [{ id: "notification-1" }] as never,
    expireWaitlist: async () => ["waitlist-1"],
  });

  assert.equal(result.jobName, "maintenance");
  assert.equal(result.processedCount, 2);
  assert.equal(harness.auditEntries.length, 3);
  assert.equal(harness.auditEntries.at(-1)?.entityId, "maintenance");
});

test("worker logs failed jobs before rethrowing", async () => {
  const harness = createWorkerHarness();

  await assert.rejects(
    processNotificationQueue({}, harness.client as never, {
      processNotifications: async () => {
        throw new Error("SMTP nicht erreichbar");
      },
    }),
    /SMTP nicht erreichbar/,
  );

  assert.equal(harness.auditEntries.length, 1);
  assert.equal(harness.auditEntries[0]?.action, "FAILED");
  assert.match(JSON.stringify(harness.auditEntries[0]?.payload), /SMTP nicht erreichbar/);
});

test("worker job runs can be listed from audit entries", async () => {
  const harness = createWorkerHarness();
  await processExpiredWaitlistOffers(harness.client as never, {
    expireWaitlist: async () => ["waitlist-1"],
  });

  const runs = await getWorkerJobRuns(10, harness.client as never);

  assert.equal(runs.length, 1);
  assert.equal(runs[0]?.entityId, "expiredWaitlistOffers");
});
