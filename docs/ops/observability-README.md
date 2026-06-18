**Observability — Kurzreferenz**

- **Healthcheck endpoint:** `/api/health` (GET) — liefert JSON `{ status: 'ok', version, time }`.
- **Test alert:** `GET /api/health?alert=true` löst einen Test‑Alert über die interne Alerts‑Bridge aus.

Wichtige Umgebungsvariablen (Testpilot / Staging):

- `SENTRY_DSN` — optional, Sentry DSN.
- `SENTRY_ENVIRONMENT` — optional, z.B. `staging`.
- `OBSERVABILITY_ALERT_EMAILS` — Komma‑getrennte Liste an E‑Mail‑Adressen für Alerts.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — SMTP Konfiguration für `lib/alerts.js`.
 - `SENDGRID_API_KEY` — optional; wenn gesetzt, nutzt `lib/alerts.js` die SendGrid HTTP API (kein zusätzliches Paket nötig).
 - `SENDGRID_FROM` — optional, Absenderadresse für SendGrid.
 - `MAILGUN_API_KEY` + `MAILGUN_DOMAIN` — optionale Mailgun HTTP API Konfiguration.
 - `POSTMARK_API_TOKEN` — optionale Postmark HTTP API Konfiguration.
 - `OBSERVABILITY_WEBHOOK_URL` — optional; Webhook für Alerts (Slack/Teams oder eigenes Receiver‑Endpoint).

Hinweis: Das Projekt vermeidet die Pflichtinstallation von `nodemailer` auf dem Gemeindeserver. Priorität der Versandwege:
1) SendGrid (wenn `SENDGRID_API_KEY` gesetzt)
2) Mailgun (wenn `MAILGUN_API_KEY` + `MAILGUN_DOMAIN` gesetzt)
3) Postmark (wenn `POSTMARK_API_TOKEN` gesetzt)
4) Webhook (`OBSERVABILITY_WEBHOOK_URL`)
5) Fallback: Konsolenlog (keine Installation nötig)

Kurzanleitung: Test‑Alert lokal

1. Optional: `npm install nodemailer`
2. Setze Umgebungsvariablen (z.B. in PowerShell):

```powershell
$env:OBSERVABILITY_ALERT_EMAILS = 'you@example.com'
$env:SENDGRID_API_KEY = '<your_sendgrid_api_key>'
$env:SENDGRID_FROM = 'no-reply@example.com'
## optional alternatives:
$env:MAILGUN_API_KEY = '<your_mailgun_key>'
$env:MAILGUN_DOMAIN = 'mg.example.com'
$env:POSTMARK_API_TOKEN = '<your_postmark_token>'
```

3. Starte die App (`npm run dev`) und rufe auf:

```bash
curl "http://localhost:3000/api/health?alert=true"
```

Beispiel: SendGrid Test per curl (wenn `SENDGRID_API_KEY` gesetzt):

```bash
curl -i --request POST \
  --url https://api.sendgrid.com/v3/mail/send \
  --header 'Authorization: Bearer $SENDGRID_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"personalizations":[{"to":[{"email":"you@example.com"}]}],"from":{"email":"no-reply@example.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test email"}]}'
```

Healthcheck Runner

- Skript: `scripts/health-check.js` — einfach per Cron/Service ausführen. Beispiel (Crontab):

```cron
# alle 5 Minuten
*/5 * * * * cd /srv/hv && HEALTHCHECK_URL="http://localhost:3000/api/health" /usr/bin/node scripts/health-check.js >> logs/health.log 2>&1
```

Docker‑/Compose‑Snippet (Beispiel):

```yaml
services:
  app:
    environment:
      - OBSERVABILITY_ALERT_EMAILS=ops@example.com
      - SMTP_HOST=smtp.example.com
      - SMTP_PORT=587
      - SMTP_USER=user@example.com
      - SMTP_PASS=${SMTP_PASS}
```

Hinweis: `lib/alerts.js` ist bewusst leichtgewichtig und setzt `nodemailer` optional voraus. Ohne SMTP konfiguriert die Bridge nur Konsolen‑Ausgaben.
