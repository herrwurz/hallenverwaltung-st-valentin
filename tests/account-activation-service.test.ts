import assert from "node:assert/strict";
import test from "node:test";
import { sendAccountActivationEmail } from "../lib/services/account-activation-service";

function createActivationHarness() {
  const updates: Array<Record<string, unknown>> = [];
  const client = {
    user: {
      async update(args: { where: { id: string }; data: Record<string, unknown> }) {
        updates.push({ id: args.where.id, ...args.data });
        return { email: "verein@test.local", displayName: "Testverein" };
      },
    },
  };

  return { client, updates };
}

test("sendAccountActivationEmail stores a reset token and mails an activation link", async () => {
  const harness = createActivationHarness();
  const sentPayloads: Array<{ to: string; subject: string; text: string; html: string }> = [];

  await sendAccountActivationEmail("user-1", harness.client as never, async (payload) => {
    sentPayloads.push(payload);
    return undefined;
  });

  assert.equal(harness.updates.length, 1);
  const update = harness.updates[0]!;
  assert.equal(update.id, "user-1");
  assert.match(String(update.passwordResetToken), /^[0-9a-f]{64}$/);
  assert.ok(update.passwordResetTokenExpiry instanceof Date);
  assert.ok((update.passwordResetTokenExpiry as Date).getTime() > Date.now());

  assert.equal(sentPayloads.length, 1);
  const mail = sentPayloads[0]!;
  assert.equal(mail.to, "verein@test.local");
  assert.match(mail.subject, /Konto aktivieren/);
  assert.match(mail.text, new RegExp(`login/reset-password\\?token=${update.passwordResetToken}`));
  assert.match(mail.html, new RegExp(`login/reset-password\\?token=${update.passwordResetToken}`));
});

test("sendAccountActivationEmail propagates delivery failures without swallowing them", async () => {
  const harness = createActivationHarness();

  await assert.rejects(
    sendAccountActivationEmail("user-1", harness.client as never, async () => {
      throw new Error("SMTP nicht erreichbar");
    }),
    /SMTP nicht erreichbar/,
  );
});
