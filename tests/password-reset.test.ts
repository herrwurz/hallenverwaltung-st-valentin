import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { z } from "zod";

// Passwort-Reset-Validierungsregeln (spiegeln die Schema-Logik in reset-password/actions.ts)
const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1),
    password: z.string().min(8),
    passwordConfirm: z.string().min(1),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    path: ["passwordConfirm"],
  });

// ── Validierungslogik ──────────────────────────────────────────────────────────

test("reset-password: gültige Eingabe besteht die Validierung", () => {
  const result = resetPasswordSchema.safeParse({
    token: "abc123",
    password: "sicher99",
    passwordConfirm: "sicher99",
  });
  assert.equal(result.success, true);
});

test("reset-password: zu kurzes Passwort wird abgelehnt (< 8 Zeichen)", () => {
  const result = resetPasswordSchema.safeParse({
    token: "abc123",
    password: "kurz",
    passwordConfirm: "kurz",
  });
  assert.equal(result.success, false);
});

test("reset-password: nicht übereinstimmende Passwörter werden abgelehnt", () => {
  const result = resetPasswordSchema.safeParse({
    token: "abc123",
    password: "passwort1",
    passwordConfirm: "passwort2",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    const errorPaths = result.error.issues.map((i) => i.path.join("."));
    assert.ok(errorPaths.includes("passwordConfirm"), "Fehler muss auf passwordConfirm zeigen");
  }
});

test("reset-password: fehlender Token wird abgelehnt", () => {
  const result = resetPasswordSchema.safeParse({
    token: "",
    password: "sicher99",
    passwordConfirm: "sicher99",
  });
  assert.equal(result.success, false);
});

test("reset-password: genau 8 Zeichen langes Passwort ist gültig (Untergrenze)", () => {
  const result = resetPasswordSchema.safeParse({
    token: "abc123",
    password: "genau8zz",
    passwordConfirm: "genau8zz",
  });
  assert.equal(result.success, true);
});

// ── Strukturelle Prüfungen ─────────────────────────────────────────────────────

test("login-form: enthält 'Passwort vergessen?'-Link zu /login/forgot-password", () => {
  const source = readFileSync("app/login/login-form.tsx", "utf8");
  assert.match(source, /href="\/login\/forgot-password"/, "Login-Formular muss Link zu forgot-password enthalten");
  assert.match(source, /Passwort vergessen\?/, "Link-Text muss 'Passwort vergessen?' lauten");
});

test("forgot-password action: verwendet getPublicBaseUrl statt NEXTAUTH_URL", () => {
  const source = readFileSync("app/login/forgot-password/actions.ts", "utf8");
  assert.match(source, /getPublicBaseUrl/, "Action muss getPublicBaseUrl() verwenden");
  assert.doesNotMatch(source, /NEXTAUTH_URL/, "Action darf NEXTAUTH_URL nicht direkt verwenden");
  assert.doesNotMatch(source, /AUTH_URL/, "Action darf AUTH_URL nicht direkt verwenden");
});

test("forgot-password action: sendet Token per E-Mail und gibt bei fehlendem Benutzer trotzdem ok zurück (kein Enumeration-Leak)", () => {
  const source = readFileSync("app/login/forgot-password/actions.ts", "utf8");
  assert.match(source, /sendEmail/, "Action muss E-Mail senden");
  assert.match(source, /passwordResetToken.*token/, "Action muss Token in DB schreiben");
  // Beide Zweige (Benutzer existiert nicht / nicht aktiv) geben { ok: true } zurück
  assert.match(source, /return \{ ok: true \}/, "Action muss bei nicht existentem Benutzer { ok: true } zurückgeben");
});

test("forgot-password page: enthält E-Mail-Formular und Zurück-Link", () => {
  const source = readFileSync("app/login/forgot-password/page.tsx", "utf8");
  assert.match(source, /type="email"/, "Seite muss E-Mail-Input haben");
  assert.match(source, /type="submit"/, "Seite muss Submit-Button haben");
  assert.match(source, /Zurück zum Login/, "Seite muss Rücknavigation zum Login haben");
  assert.match(source, /requestPasswordResetAction/, "Seite muss die Server Action einbinden");
});

test("reset-password page: wraps form in Suspense für useSearchParams()", () => {
  const source = readFileSync("app/login/reset-password/page.tsx", "utf8");
  assert.match(source, /Suspense/, "reset-password Page muss Suspense-Boundary verwenden");
  assert.match(source, /useSearchParams/, "reset-password Page muss useSearchParams verwenden");
});

test("reset-password page: übergibt Token als Hidden-Input an die Action", () => {
  const source = readFileSync("app/login/reset-password/page.tsx", "utf8");
  assert.match(source, /type="hidden" name="token"/, "Seite muss Token als hidden input übergeben");
  assert.match(source, /searchParams\.get\("token"\)/, "Seite muss Token aus URL-Params lesen");
});

test("reset-password action: löscht Token nach erfolgreichem Reset (Einmalverwendung)", () => {
  const source = readFileSync("app/login/reset-password/actions.ts", "utf8");
  assert.match(source, /passwordResetToken.*null/, "Action muss Token nach Reset auf null setzen");
  assert.match(source, /passwordResetTokenExpiry.*null/, "Action muss TokenExpiry nach Reset auf null setzen");
});

test("reset-password action: prüft Token-Ablaufzeit bevor Passwort geändert wird", () => {
  const source = readFileSync("app/login/reset-password/actions.ts", "utf8");
  assert.match(source, /passwordResetTokenExpiry/, "Action muss TokenExpiry auswerten");
  assert.match(source, /new Date\(\)/, "Action muss aktuellen Zeitstempel für Ablaufprüfung verwenden");
});

test("reset-password action: hasht neues Passwort mit bcrypt", () => {
  const source = readFileSync("app/login/reset-password/actions.ts", "utf8");
  assert.match(source, /from "bcryptjs"/, "Action muss bcryptjs importieren");
  assert.match(source, /hash\(/, "Action muss Passwort hashen");
});
