import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("application shells use the documented Windows style foundation", () => {
  const globals = readFileSync("app/globals.css", "utf8");
  const adminShell = readFileSync("components/admin-shell.tsx", "utf8");
  const areaShell = readFileSync("components/area-shell.tsx", "utf8");
  const adminBackLink = readFileSync("components/admin-back-link.tsx", "utf8");
  const loginPage = readFileSync("app/login/page.tsx", "utf8");
  const styleGuide = readFileSync("docs/ui-style-guide.md", "utf8");

  assert.match(globals, /\.windows-shell/);
  assert.match(globals, /\.admin-desktop/);
  assert.match(adminShell, /windows-shell admin-desktop/);
  assert.match(areaShell, /windows-shell app-area-shell/);
  assert.match(adminBackLink, /border border-slate-300 bg-white/);
  assert.match(loginPage, /windows-shell/);
  assert.match(styleGuide, /Windows-\/Desktop-Anmutung/);
  assert.match(styleGuide, /Google-Kalender/);
});

test("shared form actions expose light Windows-style primary and secondary actions", () => {
  const formActions = readFileSync("components/form-actions.tsx", "utf8");

  assert.match(formActions, /bg-white/);
  assert.match(formActions, /border-blue-700 bg-blue-600/);
  assert.match(formActions, /Abbrechen/);
});
