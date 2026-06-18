# Observability — Betriebsleitfaden (MVP)

Kurzer Leitfaden für den Testbetrieb: Ausrichtung, "sparsamer" Betriebsmodus und empfohlene Einstellungen.

## Ziel

Dieses Dokument beschreibt die minimale Observability‑Ausstattung (MVP): strukturierte Logs, Healthcheck, Alerts und optionale Sentry‑Integration. Der Fokus liegt auf einem sparsamen Betriebsmodus für kommunale Testinstallationen — möglichst ohne Pflichtinstallation schwerer Binaries oder persistenter Agenten.

## Prinzipien (Sparsamkeit)

- Vermeide große Binärinstallationen auf Gemeinde‑Servern (kein zwingendes `puppeteer`/Chromium, kein `nodemailer`‑SMTP‑Agent).\
- Bevorzuge HTTP‑APIs für E‑Mail/Alerts: SendGrid, Mailgun, Postmark oder Webhooks.\
- Healthchecks (z. B. Healthchecks.io) oder externes Uptime‑Monitoring statt eines selbst‑laufenden Watchers.\
- Fallbacks: lokale Konsolen‑/Dateilogs plus strukturierte JSON‑Logs, damit externe Sammler (Fluentd, Filebeat) die Daten einsammeln können.

## Empfohlene Umgebungsvariablen

- `SENTRY_DSN` — optional, Sentry nur aktivieren wenn gesetzt.\
- `OBSERVABILITY_ALERT_EMAILS` — CSV der Ziel‑E‑Mail‑Adressen für kritische Alerts.\
- `SENDGRID_API_KEY`, `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `POSTMARK_API_TOKEN` — Priorisierte HTTP‑Provider für Mail/Alerts.\
- `OBSERVABILITY_WEBHOOK_URL` — einfacher Webhook (z. B. Slack/Teams/Generic) als letzter Fallback.\
- `HEALTHCHECK_URL` — falls Host eine externe Healthcheck‑Probe erhalten soll.

## Healthcheck / Liveness

- Endpoint: `GET /api/health` — liefert `{ status: 'ok', version, time }`.\
- Test‑Alert: `GET /api/health?alert=true` sendet eine Probe‑Benachrichtigung an die konfigurierten Alert‑Ziele.

## Alerts — Prioritäten & Verhalten

1. Wenn `SENDGRID_API_KEY` gesetzt → benutze SendGrid HTTP API.\
2. Sonst `MAILGUN_API_KEY` + `MAILGUN_DOMAIN`.\
3. Sonst `POSTMARK_API_TOKEN`.\
4. Sonst `OBSERVABILITY_WEBHOOK_URL`.\
5. Sonst: Logge lokal und schreibe eine Datei `/var/log/hv-observability-alerts.log` (oder Windows‑äquivalent).

E‑Mails sind kurze, strukturierte Nachrichten mit Betreff, Text und (wo sinnvoll) Link zur Healthcheck/Statusseite.

## PDF / Export Hinweise (sparsamer Modus)

- Verwende `puppeteer-core` + systemweiten Chrome/Edge wenn vorhanden.\
- Falls kein Systembrowser, erzeugt die Pipeline ein HTML‑Fallback und dokumentiert die fehlende PDF‑Erzeugung; keine automatische Chromium‑Installation.
- Dateischreibende Aktionen atomar ausführen (tmp → rename), um Windows/OneDrive EBUSY‑Probleme zu vermeiden.

## Betriebsempfehlungen für Gemeinden

- Setze nur die benötigten HTTP‑Provider‑Keys. Keine weiteren systemweiten Agenten installieren.\
- Nutze externe Healthchecks (Healthchecks.io) und verknüpfe diese mit den im Unternehmen vorhandenen Alarmwegen (Telefon, SMS, Pager, E‑Mail).\
- Halte `SENTRY_DSN` in Staging/QA gesetzt, in der Pilot‑Installation optional. Sentry‑Alerts können nützliche Kontextdaten liefern, sind aber kein Ersatz für Liveness/uptime‑Monitoring.

## Runbook – einfache Alarmbehandlung (P0)

1. Healthcheck Alarm empfängt E‑Mail/Webhook.\
2. Technik‑Team prüft `SENTRY` (sofern aktiviert) auf Exception‑Traces.\
3. Falls Deployment/Server‑Fehler: Neustart von Prozess/Service, erneuter Healthcheck.\
4. Falls wiederholte Alarme: Eskaliere an Betreiber (Technikteam: Mag. Andreas Hofreither / +43 (664) 23 14 524 / andreas@hofreither.at).

## Hinweise & Designentscheidungen

- SMTP ist im Testpiloten nicht vorauskonfiguriert; die App unterstützt HTTP‑Provider.\
- Abrechnung (`Abrechnung`) ist noch nicht implementiert; Beobachtungs‑/Alerting‑Funktionen sind hiervon unabhängig.\
- Ziel: minimale, auditierbare Beobachtbarkeit ohne invasive Server‑Änderungen.

---

Bei Bedarf ergänze ich Beispiele für `curl`‑Aufrufe zum Testen der Healthcheck‑Route oder Vorlagen für `systemd`/Task‑Scheduler Einträge.
