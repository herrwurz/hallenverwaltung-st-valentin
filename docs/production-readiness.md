# Produktions-Readiness Phase 22

Diese Checkliste beschreibt die produktionsnahe Inbetriebnahme der
Hallenverwaltung St. Valentin. Sie ersetzt kein echtes Server-Hardening, macht
aber die Schritte vor Abnahme und Go-Live nachvollziehbar.

Flexible Installationswege fuer lokalen Teststand, eigenen Testserver und den
spaeteren Gemeinde-Server sind in `docs/installation-options.md`
dokumentiert. Der Gemeinde-Server bleibt bis zur finalen Klaerung ein offener
Go-Live-Blocker.

IT-Sicherheits- und Datenschutzmassnahmen fuer Test- und Gemeinde-Server sind
in `docs/security-privacy-readiness.md` gesammelt. Diese Unterlage sollte vor
einem Echtdaten-Test gemeinsam mit IT, Datenschutz und Fachverantwortung
geprueft werden.

Das Betriebs- und Monitoringkonzept fuer Test- und Produktivserver liegt in
`docs/operations-monitoring-concept.md`.

## 1. Zielumgebung vorbereiten

- Server mit Docker und Docker Compose bereitstellen.
- DNS-Eintrag fuer die Ziel-Domain auf den Server zeigen lassen.
- TLS-Zertifikate bereitstellen:
  - `deploy/certs/fullchain.pem`
  - `deploy/certs/privkey.pem`
- Dateirechte fuer Zertifikate und Backups auf den Betriebsbenutzer begrenzen.
- Firewall nur fuer benoetigte Ports oeffnen:
  - 80/tcp fuer HTTP-Redirect und ACME-Challenge
  - 443/tcp fuer HTTPS
  - SSH nur fuer Administratoren

## 2. Produktionskonfiguration

Fuer den eigenen Testserver wird dieselbe Compose-Datei verwendet, aber eine
getrennte Umgebungsdatei:

```bash
cp .env.test.example .env.test
ENV_FILE=.env.test npm run production:check
```

Fuer den Gemeinde-Produktivserver:

Aus Vorlage erstellen:

```bash
cp .env.production.example .env.production
```

Pflichtwerte vor dem Start setzen:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `APP_ENV=production`
- `PUBLIC_BASE_URL`
- `AUTH_URL`
- `AUTH_SECRET`
- `AUTH_TRUST_HOST=true`
- `PUBLIC_AREA_ENABLED`
- `SERVER_NAME`
- `TLS_CERT_DIR`
- `MAIL_DELIVERY_MODE=smtp`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL`
- `SMTP_FROM_NAME`
- `WORKER_INTERVAL_SECONDS`

Regeln:

- `AUTH_SECRET` muss ein langes zufaelliges Secret sein.
- `.env.test` und `.env.production` duerfen nicht committet werden.
- Testserver und Gemeinde-Produktivserver verwenden getrennte Secrets,
  Datenbankpasswoerter, Domains und SMTP-Zugangsdaten.
- `MAIL_DELIVERY_MODE=disabled` ist nur fuer Testumgebungen erlaubt, wenn
  E-Mail bewusst noch nicht zugestellt werden soll.
- SMTP-Zugangsdaten duerfen nicht in Logs oder Tickets kopiert werden.
- Demo-Passwoerter aus README sind nur lokal erlaubt.

## 3. Konfiguration pruefen

```bash
npm run production:check
docker compose --env-file .env.production -f docker-compose.production.yml config
```

Erfolgskriterium:

- `npm run production:check` meldet keine Fehler.
- Compose rendert ohne Fehler.
- Keine Platzhalterwerte wie `replace-with-*` bleiben in der echten
  `.env.production`.

## 4. Start und Migration

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up --build -d
```

Erwartung:

- `db` wird healthy.
- `migrate` endet erfolgreich.
- `web` startet.
- `worker` startet.
- `reverse-proxy` startet.

Pruefen:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml ps
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=100 web
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=100 worker
```

## 5. Initialbenutzer

Version 1 benoetigt vor realem Betrieb mindestens:

- einen Gemeinde-/Admin-Benutzer mit Systemrechten
- einen Test-Vereinsbenutzer fuer Portal-Smoke-Tests
- optional einen Hallenwart-Benutzer fuer Handover/No-Show-Smoke-Tests

Vorgehen:

- In lokalen Testumgebungen kann `npm run demo:seed` verwendet werden.
- In Produktion keine Demo-Passwoerter verwenden.
- Produktive Initialbenutzer muessen sichere, individuell vergebene Passwoerter
  erhalten.
- Nach Go-Live pruefen, ob keine Demo-Zugaenge aktiv sind.

## 6. SMTP und Benachrichtigungen

Pruefen:

- SMTP-Werte in `.env.production` gesetzt.
- Absenderadresse ist fuer die Domain erlaubt.
- Admin-Seite `/admin/settings/mail` erreichbar und SMTP-Status plausibel.
- Event-Schalter unter `/admin/settings/notifications` fuer benoetigte
  Ereignisse aktiv.
- Benachrichtigungs-Queue unter `/admin/notifications` erreichbar.
- Testereignis erzeugt Queue-Eintrag.
- Worker oder manuelle Verarbeitung versendet die Benachrichtigung.
- Fehlgeschlagene Benachrichtigungen koennen erneut gesendet werden.

Wichtig:

- Es gibt keinen extern hartcodierten Maildienst.
- Kein SMS und kein Push in Version 1.

## 7. Worker-Betrieb

Die Production-Compose-Datei startet den Worker als eigenen Dienst.

Pruefen:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=100 worker
```

Erfolgskriterium:

- Benachrichtigungs-Queue wird verarbeitet.
- Wartelistenangebote laufen ab.
- Folgeplatz wird nach Ablauf aktiviert.
- Joblaeufe werden als Audit-/Job-Protokoll sichtbar.

Fallback ohne Worker-Dienst:

```cron
*/5 * * * * cd /srv/hallenverwaltung && npm run worker:run
```

Es darf nicht beides gleichzeitig produktiv laufen, wenn dadurch Jobs
unnoetig doppelt verarbeitet werden.

## 8. Backup und Restore-Probe

Backup erstellen:

```bash
ENV_FILE=.env.production deploy/scripts/backup-postgres.sh
```

Restore-Probe in temporaerer Datenbank:

```bash
BACKUP_FILE=backups/hallenverwaltung_YYYYMMDDTHHMMSSZ.dump \
ENV_FILE=.env.production \
deploy/scripts/restore-test-postgres.sh
```

Erfolgskriterium:

- Backup-Datei wird erzeugt.
- Restore-Test laeuft ohne Fehler.
- Restore-Test gibt wiederhergestellte Tabellen aus.

Produktiver Restore ist destruktiv und darf nur nach ausdruecklicher Freigabe
ausgefuehrt werden:

```bash
BACKUP_FILE=backups/hallenverwaltung_YYYYMMDDTHHMMSSZ.dump \
ENV_FILE=.env.production \
deploy/scripts/restore-postgres.sh
```

## 9. Smoke-Test nach Start

Manuell pruefen:

- `/public`
- `/public/calendar`
- `/login`
- Admin-Login und `/admin`
- Portal-Login und `/portal`
- Buchungsantrag im Portal
- Admin-Buchungsuebersicht
- Kalenderansicht
- Benachrichtigungsqueue
- Worker-Jobs unter `/admin/system/jobs`
- Abrechnungsexport in einer Testperiode

Details stehen in `docs/pilot-testplan.md`.

## 10. Offene Betriebsrisiken vor Go-Live

- Zertifikate muessen in der Zielumgebung real eingerichtet werden.
- SMTP muss gegen den echten Server getestet werden.
- Backup-Rotation und Aufbewahrungsfrist muessen organisatorisch festgelegt
  werden.
- Monitoring/Alerting fuer Web, Worker, Datenbank und Speicherplatz muss
  anhand von `docs/operations-monitoring-concept.md` organisatorisch geregelt
  werden.
- Restore-Probe muss nach Servereinrichtung dokumentiert werden.
- Datenschutz-/IT-Sicherheitsfreigabe und Verantwortlichkeiten muessen
  dokumentiert werden.
- Finaler Abnahmetest gehoert in Phase 23.

Die verbindliche Go-Live-Entscheidungsliste liegt in
`docs/go-live-open-points.md`. Punkte mit Prioritaet hoch blockieren den
Produktivstart, bis sie erledigt oder ausdruecklich mit Risikoakzeptanz
freigegeben wurden.

Die operative Schrittfolge fuer Zielserver, TLS, Produktionskonfiguration,
SMTP, Worker, Backup/Restore, Monitoring und Abnahme steht in
`docs/go-live-runbook.md`.

Die tatsaechlichen Nachweise aus der Zielumgebung werden in
`docs/go-live-evidence.md` dokumentiert.
