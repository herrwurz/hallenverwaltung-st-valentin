import assert from "node:assert/strict";
import test from "node:test";
import { ZodError } from "zod";
import {
  getPublicCalendarVisibilityMode,
  updatePublicCalendarVisibilityMode,
} from "../lib/services/calendar-settings-service";

function createSettingsClient(initialValue: unknown = null) {
  let currentValue = initialValue;

  return {
    systemSetting: {
      async findUnique() {
        if (currentValue === null) {
          return null;
        }

        return {
          value: currentValue,
        };
      },
      async upsert(args: {
        update: { value: unknown };
        create: { key: string; value: unknown };
      }) {
        currentValue = args.update.value ?? args.create.value;
        return {
          key: args.create.key,
          value: currentValue,
        };
      },
    },
    getValue() {
      return currentValue;
    },
  };
}

test("uses the secure default when no public calendar setting exists", async () => {
  const client = createSettingsClient();

  const mode = await getPublicCalendarVisibilityMode(client as never);

  assert.equal(mode, "occupied_only");
});

test("falls back to the secure default when the stored setting is invalid", async () => {
  const client = createSettingsClient({ mode: "not-allowed" });

  const mode = await getPublicCalendarVisibilityMode(client as never);

  assert.equal(mode, "occupied_only");
});

test("stores a valid public calendar visibility setting", async () => {
  const client = createSettingsClient();

  await updatePublicCalendarVisibilityMode({ mode: "organization" }, client as never);

  assert.deepEqual(client.getValue(), { mode: "organization" });
});

test("rejects an invalid public calendar visibility setting", async () => {
  const client = createSettingsClient();

  await assert.rejects(
    () => updatePublicCalendarVisibilityMode({ mode: "invalid-value" }, client as never),
    ZodError,
  );
});
