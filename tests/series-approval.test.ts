import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// ── Serienantragsseite ─────────────────────────────────────────────────────────

test("series page: enthält Genehmigungsformulare für offene Serien", () => {
  const source = readFileSync("app/admin/series/page.tsx", "utf8");
  assert.match(source, /approveSeriesFromSeriesPageAction/, "Seite muss Genehmigungs-Action einbinden");
  assert.match(source, /rejectSeriesFromSeriesPageAction/, "Seite muss Ablehnungs-Action einbinden");
  assert.match(source, /markSeriesInReviewFromSeriesPageAction/, "Seite muss In-Prüfung-Action einbinden");
});

test("series page: Genehmigung erfordert APPROVE_BOOKING-Berechtigung", () => {
  const source = readFileSync("app/admin/series/page.tsx", "utf8");
  assert.match(source, /hasPermission.*APPROVE_BOOKING/, "Seite muss APPROVE_BOOKING-Berechtigung prüfen");
  assert.match(source, /hasPermission.*REJECT_BOOKING/, "Seite muss REJECT_BOOKING-Berechtigung prüfen");
  assert.match(source, /canApprove/, "Genehmigungsformular muss an canApprove gebunden sein");
  assert.match(source, /canReject/, "Ablehnungsformular muss an canReject gebunden sein");
});

test("series page: zeigt nur Serien mit offenen Terminen im Aktionsbereich", () => {
  const source = readFileSync("app/admin/series/page.tsx", "utf8");
  assert.match(source, /openSeries/, "Seite muss offene Serien filtern");
  assert.match(
    source,
    /REQUESTED.*IN_REVIEW|IN_REVIEW.*REQUESTED/,
    "Filter muss REQUESTED und IN_REVIEW-Status berücksichtigen",
  );
});

test("series page: Ablehnen-Formular hat required-Begründung", () => {
  const source = readFileSync("app/admin/series/page.tsx", "utf8");
  // Ablehnen-Textarea muss required sein
  assert.match(source, /rejectSeriesFromSeriesPageAction[\s\S]{0,500}required/, "Ablehnungsformular muss required-Begründung erzwingen");
});

test("series page: gibt AppFeedback für Ergebnis-Meldungen aus", () => {
  const source = readFileSync("app/admin/series/page.tsx", "utf8");
  assert.match(source, /AppFeedback/, "Seite muss AppFeedback-Komponente verwenden");
  assert.match(source, /seriesApproved/, "Seite muss seriesApproved-Param als Erfolgsmeldung anzeigen");
  assert.match(source, /seriesRejected/, "Seite muss seriesRejected-Param als Erfolgsmeldung anzeigen");
  assert.match(source, /seriesReviewed/, "Seite muss seriesReviewed-Param als Info-Meldung anzeigen");
});

test("series page: hebt zuletzt bearbeitete Serie mit seriesId-Param hervor", () => {
  const source = readFileSync("app/admin/series/page.tsx", "utf8");
  assert.match(source, /params\.seriesId.*item\.id|item\.id.*params\.seriesId/, "Seite muss seriesId für Highlight vergleichen");
});

// ── Series Actions ─────────────────────────────────────────────────────────────

test("series actions: verwenden requireActiveSession für Authentifizierung", () => {
  const source = readFileSync("app/admin/series/actions.ts", "utf8");
  assert.match(source, /requireActiveSession/, "Actions müssen requireActiveSession verwenden");
});

test("series actions: rufen die zentralen booking-approval-service-Funktionen auf", () => {
  const source = readFileSync("app/admin/series/actions.ts", "utf8");
  assert.match(source, /approveSeriesForAdmin/, "Genehmigungs-Action muss approveSeriesForAdmin aufrufen");
  assert.match(source, /rejectSeriesForAdmin/, "Ablehnungs-Action muss rejectSeriesForAdmin aufrufen");
  assert.match(source, /markSeriesInReviewForAdmin/, "In-Prüfung-Action muss markSeriesInReviewForAdmin aufrufen");
});

test("series actions: redirect nach /admin/series (nicht /admin/bookings)", () => {
  const source = readFileSync("app/admin/series/actions.ts", "utf8");
  assert.match(source, /redirect\(`\/admin\/series/, "Actions müssen auf /admin/series zurückleiten");
  assert.doesNotMatch(source, /redirect\(`\/admin\/bookings/, "Actions dürfen nicht auf /admin/bookings weiterleiten");
});

test("series actions: revalidieren /admin/series nach jeder Aktion", () => {
  const source = readFileSync("app/admin/series/actions.ts", "utf8");
  assert.match(source, /revalidatePath.*\/admin\/series/, "Actions müssen /admin/series revalidieren");
});

test("series actions: redirect außerhalb des catch-Blocks (Next.js-Anforderung)", () => {
  const source = readFileSync("app/admin/series/actions.ts", "utf8");
  // redirect() darf nicht innerhalb eines catch-Blocks sein
  // Einfache Prüfung: der Pattern `catch` gefolgt von `redirect` (ohne zwischenliegendes `}`) darf nicht vorkommen
  assert.doesNotMatch(
    source,
    /catch\s*\([^)]*\)\s*\{[^}]*redirect\(/,
    "redirect() darf nicht innerhalb eines catch-Blocks aufgerufen werden",
  );
});
