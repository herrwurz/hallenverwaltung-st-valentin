# Observability & Error Handling — Sentry + Structured Logging (Kurz‑Spec)

Zweck
-----
Diese Spezifikation beschreibt die minimale Implementierung von Fehlerbehandlung und Observability: Sentry als Error‑/Issue‑Store, strukturierte Logs (JSON) und E‑Mail‑basierte Alerts als primären Benachrichtigungskanal.

Ziele
-----
- Fehler automatisch erfassen und kontextreich speichern (Request, User, Release, Env).
- Kritische Fehler per E‑Mail an das Technikteam zustellen.
- Strukturierte Logs für Suche/Debugging verfügbar machen.
- Basis‑Healthchecks und minimalen Incident‑Workflow bereitstellen.

Environment / Config
--------------------
- `SENTRY_DSN` — DSN für Sentry project
- `SENTRY_ENVIRONMENT` — z.B. `development|staging|production`
- `SENTRY_RELEASE` — Commit/Version (z. B. `0.1.0`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — für direkte E‑Mail Alerts (nodemailer)
- `OBSERVABILITY_ALERT_EMAILS` — komma-separierte Adressen, die bei P0/P1 per Mail informiert werden
 - `OBSERVABILITY_ALERT_EMAILS` — komma-separierte Adressen, die bei P0/P1 per Mail informiert werden
 - `SENTRY_DSN` — (optional) DSN für Sentry project

Komponenten & Integration
-------------------------
1) Sentry (Server)
   - Paket: `@sentry/node` (Node), `@sentry/nextjs` für Next.js optional
   - Init in Server‑Entry (early): setzten von `environment`, `release`, `serverName`
   - Attach: Request context (path, headers, user id/email), breadcrumbs für DB/Job Aktionen
   - Usage: `Sentry.captureException(err)` bei nicht-handelbaren Fehlern

2) Structured Logging
   - JSON‑Logs via Pino/Winston oder simple wrapper
   - Standardfelder: `timestamp`, `level`, `msg`, `service`, `env`, `release`, `requestId`, `userId`, `meta`
   - Sentry events sollten Links / IDs auf Logs enthalten (traceId / requestId)

3) Email Alerts (Primärer Kanal)
   - Grund: User bevorzugt Mail als Alert-Channel
   - Implementationsoptionen:
     a) Sentry Alert Rules → Action: Send e‑mail to `OBSERVABILITY_ALERT_EMAILS` (Sentry verwaltet Versand)
     b) Zusätzlich: kritische Handler in App (onCritical) → nodemailer send an `OBSERVABILITY_ALERT_EMAILS` mit minimalem Stack + deep link zu Sentry
   - Empfehlung: Verwenden Sie Sentry Alert Rules als primäre Quelle; nodemailer-Fallback für sofortige P0 Mails

4) Healthchecks & Readiness
   - Endpoints: `/health/live` (process alive), `/health/ready` (DB, Redis, S3, SMTP connectivity optional)
   - Alerting: Healthcheck failures → create incident + email

5) Background Jobs
   - Jeder Worker loggt Fehler strukturiert und ruft `Sentry.captureException` auf
   - Retry‑Policy + Dead‑Letter-Queue (DLQ) implementieren (Redis/Bull)
   - DLQ alerts per E‑Mail für fehlerhafte Jobs

Akzeptanzkriterien / Tests
--------------------------
- Testfehler erzeugt einen Sentry‑Issue mit `environment` und `release` tags.
- Bei konfiguriertem `OBSERVABILITY_ALERT_EMAILS` wird für P0‑Regel eine E‑Mail versendet.
- Strukturierte Logeinträge enthalten `requestId` und sind in Log‑Store durchsuchbar.
- `/health/ready` gibt `200` wenn DB und Redis erreichbar sind.

Ablauf zur Implementierung (MVP)
--------------------------------
1. Add job: `Implement Sentry & structured logging` — init Sentry, set env/release
2. Add structured logging wrapper and replace critical `console.log` in services
3. Create `/health` endpoints and add check for DB & Redis
4. Configure Sentry Alert Rule to send emails to `OBSERVABILITY_ALERT_EMAILS`
5. Add nodemailer fallback for explicit P0 alerting (optional)
6. Add CI check: `SENTRY_DSN` present for staging/prod builds (or explicit opt-out)

Weitere Hinweise
----------------
- P0 Alerts: zusätzlich zu E‑Mail empfiehlt sich ein Pager/Telefon‑Fallback; Mail ist okay für Testbetrieb.
- Datenschutz: Logs dürfen keine sensiblen Daten enthalten (PII redaction). Entfernen/Maskieren vor Log/Send.

Datei: docs/ops/observability-sentry.md
