import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { endTariff, saveTariff, saveTariffGroup } from "../lib/services/admin/tariff-service";

function createTariffHarness({
  tariffs = [] as Array<Record<string, unknown>>,
  groups = [] as Array<Record<string, unknown>>,
} = {}) {
  const createdTariffs: Array<Record<string, unknown>> = [];
  const updatedTariffs: Array<Record<string, unknown>> = [];
  const createdGroups: Array<Record<string, unknown>> = [];

  const client = {
    tariff: {
      async findMany(args: { where: Record<string, unknown> }) {
        return tariffs.filter((tariff) => {
          const where = args.where;
          return (
            (!where.roomId || tariff.roomId === where.roomId) &&
            (!where.tariffGroupId || tariff.tariffGroupId === where.tariffGroupId) &&
            (!where.dayType || tariff.dayType === where.dayType) &&
            (where.usageTypeId === undefined || tariff.usageTypeId === where.usageTypeId) &&
            (where.organizationTypeId === undefined || tariff.organizationTypeId === where.organizationTypeId)
          );
        });
      },
      async findUnique(args: { where: { id: string } }) {
        return tariffs.find((tariff) => tariff.id === args.where.id) ?? null;
      },
      async create(args: { data: Record<string, unknown> }) {
        createdTariffs.push(args.data);
        return { id: "tariff-created", ...args.data };
      },
      async update(args: { where: { id: string }; data: Record<string, unknown> }) {
        updatedTariffs.push({ id: args.where.id, ...args.data });
        return { id: args.where.id, ...args.data };
      },
    },
    tariffGroup: {
      async findUnique(args: { where: { code?: string; id?: string } }) {
        return (
          groups.find((group) => group.code === args.where.code || group.id === args.where.id) ?? null
        );
      },
      async findMany() {
        return groups;
      },
      async create(args: { data: Record<string, unknown> }) {
        createdGroups.push(args.data);
        return { id: "group-created", ...args.data };
      },
      async update(args: { where: { id: string }; data: Record<string, unknown> }) {
        return { id: args.where.id, ...args.data };
      },
    },
  };

  return { client, createdTariffs, updatedTariffs, createdGroups };
}

const baseTariffInput = {
  tariffGroupId: "group-1",
  roomId: "room-1",
  usageTypeId: "",
  organizationTypeId: "",
  name: "Ortsverein Mo–Fr",
  hourlyRate: "0,73",
  flatRate: "",
  dayType: "WEEKDAY",
  validFrom: "2026-01-01",
  validUntil: "",
};

test("saveTariff stores wildcard tariffs with normalized comma amounts", async () => {
  const harness = createTariffHarness();

  await saveTariff(baseTariffInput, harness.client as never);

  assert.equal(harness.createdTariffs.length, 1);
  const created = harness.createdTariffs[0]!;
  assert.equal(created.hourlyRate, 0.73);
  assert.equal(created.flatRate, null);
  assert.equal(created.usageTypeId, null);
  assert.equal(created.organizationTypeId, null);
});

test("saveTariff rejects hourly rate and flat rate at the same time", async () => {
  const harness = createTariffHarness();

  await assert.rejects(
    saveTariff({ ...baseTariffInput, flatRate: "10" }, harness.client as never),
    /entweder Stundensatz oder Pauschale/,
  );
});

test("saveTariff rejects overlapping tariffs for the same combination", async () => {
  const harness = createTariffHarness({
    tariffs: [
      {
        id: "tariff-existing",
        roomId: "room-1",
        tariffGroupId: "group-1",
        dayType: "WEEKDAY",
        usageTypeId: null,
        organizationTypeId: null,
        validFrom: new Date("2026-01-01T00:00:00Z"),
        validUntil: null,
      },
    ],
  });

  await assert.rejects(saveTariff(baseTariffInput, harness.client as never), /zeitlich überlappender Tarif/);
});

test("saveTariff allows the same period for a different day type", async () => {
  const harness = createTariffHarness({
    tariffs: [
      {
        id: "tariff-existing",
        roomId: "room-1",
        tariffGroupId: "group-1",
        dayType: "WEEKEND",
        usageTypeId: null,
        organizationTypeId: null,
        validFrom: new Date("2026-01-01T00:00:00Z"),
        validUntil: null,
      },
    ],
  });

  await assert.doesNotReject(saveTariff(baseTariffInput, harness.client as never));
});

test("saveTariff rejects an end date before the start date", async () => {
  const harness = createTariffHarness();

  await assert.rejects(
    saveTariff({ ...baseTariffInput, validUntil: "2025-12-01" }, harness.client as never),
    /nach dem Gültig-ab-Datum/,
  );
});

test("endTariff sets the end date", async () => {
  const harness = createTariffHarness({
    tariffs: [{ id: "tariff-1", validFrom: new Date("2026-01-01T00:00:00Z") }],
  });

  await endTariff({ id: "tariff-1", validUntil: "2026-12-31" }, harness.client as never);

  assert.equal(harness.updatedTariffs.length, 1);
  assert.ok(harness.updatedTariffs[0]!.validUntil instanceof Date);
});

test("saveTariffGroup rejects duplicate codes", async () => {
  const harness = createTariffHarness({
    groups: [{ id: "group-1", code: "ORTSVEREIN", name: "Ortsverein" }],
  });

  await assert.rejects(
    saveTariffGroup({ code: "ORTSVEREIN", name: "Doppelt" }, harness.client as never),
    /existiert bereits/,
  );
});

test("tariff admin page guards MANAGE_TARIFFS and is linked in both navigations", () => {
  const page = readFileSync("app/admin/tariffs/page.tsx", "utf8");
  const actions = readFileSync("app/admin/tariffs/actions.ts", "utf8");
  const layout = readFileSync("app/admin/layout.tsx", "utf8");
  const navigation = readFileSync("components/admin-navigation.tsx", "utf8");

  assert.match(page, /requirePermission\("MANAGE_TARIFFS"\)/);
  assert.match(actions, /requirePermission\("MANAGE_TARIFFS"\)/);
  assert.match(layout, /\/admin\/tariffs/);
  assert.match(navigation, /\/admin\/tariffs/);
});
