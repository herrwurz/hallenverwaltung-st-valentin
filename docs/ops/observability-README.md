**Observability — Kurzreferenz**

- **Healthcheck endpoint:** `/api/health` (GET) — liefert JSON `{ status: 'ok', version, time }`.
- **Test alert:** `GET /api/health?alert=true` löst einen Test‑Alert über die interne Alerts‑Bridge aus.

Wichtige Umgebungsvariablen (Testpilot / Staging):

- `SENTRY_DSN` — optional, Sentry DSN.
- `SENTRY_ENVIRONMENT` — optional, z.B. `staging`.
- `OBSERVABILITY_ALERT_EMAILS` — Komma‑getrennte Liste an E‑Mail‑Adressen für Alerts.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — SMTP Konfiguration für `lib/alerts.js`.

Kurzanleitung: Test‑Alert lokal

1. Optional: `npm install nodemailer`
2. Setze Umgebungsvariablen (z.B. in PowerShell):

```powershell
$env:OBSERVABILITY_ALERT_EMAILS = 'you@example.com'
$env:SMTP_HOST = 'smtp.example.com'
$env:SMTP_PORT = '587'
$env:SMTP_USER = 'user@example.com'
$env:SMTP_PASS = 'secret'
```

3. Starte die App (`npm run dev`) und rufe auf:

```bash
curl "http://localhost:3000/api/health?alert=true"
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
