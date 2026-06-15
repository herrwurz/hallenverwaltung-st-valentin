# Hallenverwaltung St. Valentin

Technisches Grundgeruest fuer eine Hallenverwaltungssoftware auf Basis von
Next.js, TypeScript, Tailwind CSS, Prisma und PostgreSQL.

## Stand: Testbarer Echstand / Phase 32

Enthalten sind:

- Next.js mit App Router und TypeScript
- Tailwind CSS fuer das UI-Grundgeruest
- Prisma mit PostgreSQL-Anbindung
- Docker-Setup fuer Webanwendung, Migrationen und PostgreSQL
- Authentifizierung, Rollen/Rechte, Stammdaten, Buchungen, Genehmigung,
  Warteliste, Kalender, Benachrichtigungen, Exporte und öffentliche Ansicht
- Hintergrundjobs fuer Queue- und Wartelistenverarbeitung
- Produktionsnahe Docker-/Reverse-Proxy- und Backup-Vorbereitung
- Produktions-Readiness-Checkliste unter `docs/production-readiness.md`
- Flexible Installationsoptionen unter `docs/installation-options.md`
- Abnahmetestplan und Kurzanleitungen unter `docs/acceptance-testplan.md`,
  `docs/user-guide-admin.md` und `docs/user-guide-portal.md`
- Go-Live-Runbook, Nachweisprotokoll und Entscheidungsliste unter
  `docs/go-live-runbook.md`, `docs/go-live-evidence.md` und
  `docs/go-live-open-points.md`
- Demo-Seed und Pilot-Testplan fuer lokale Produkttests
- Teststand-Freeze unter `docs/teststand-freeze.md` als verbindlicher Umfang
  fuer den naechsten Durchklicktest

## Voraussetzungen

- Node.js 22 oder neuer und npm fuer die lokale Entwicklung
- Docker Desktop mit Docker Compose fuer den containerisierten Start

## Lokale Entwicklung

1. Umgebungsdatei erstellen:

   ```bash
   cp .env.example .env
   ```

   Unter Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   Vor gemeinsam genutzten oder bereitgestellten Umgebungen muss
   `AUTH_SECRET` durch ein langes zufaelliges Secret ersetzt werden.
   `AUTH_TRUST_HOST=true` erlaubt Auth.js den konfigurierten lokalen bzw.
   Docker-Host.

2. PostgreSQL starten:

   ```bash
   docker compose up -d db
   ```

3. Abhaengigkeiten installieren und Prisma vorbereiten:

   ```bash
   npm install
   npm run db:generate
   npm run db:deploy
   npm run db:seed
   ```

4. Optional Demo-Daten fuer einen lokalen Produkttest anlegen:

   ```bash
   npm run demo:seed
   ```

   Demo-Logins:

   | Rolle | E-Mail | Passwort |
   | --- | --- | --- |
   | Gemeinde/Admin | `demo.admin@example.test` | `DemoAdminPassword!2026` |
   | Verein | `demo.verein@example.test` | `DemoVereinPassword!2026` |
   | Hallenwart | `demo.hallenwart@example.test` | `DemoHallenwartPassword!2026` |

   Diese Demo-Zugaenge sind nur fuer lokale Tests gedacht.

   Fuer Benachrichtigungen per SMTP muessen zusaetzlich die
   `SMTP_*`-Variablen in der `.env` gepflegt werden. SMTP-Passwort,
   Datenbank-URL und andere technische Secrets werden nicht ueber die
   Weboberflaeche gespeichert. Der SMTP-Status und eine Testmail-Funktion
   stehen unter `/admin/settings/mail` bereit. Event-Schalter werden als
   `SystemSetting` gespeichert und unter `/admin/settings/notifications`
   gepflegt. Die Verarbeitung der Benachrichtigungsqueue kann ueber
   `/admin/notifications` manuell angestossen werden.
   Version 1 versendet ausschliesslich E-Mail ueber die persistente
   Benachrichtigungs-Queue. Newsletter, SMS und Push werden fachlich als spaetere
   Kanaele vorbereitet, aber nicht hardcodiert und nicht ohne gesonderte
   Anbieter-/Datenschutzentscheidung aktiviert.
   Automatisch vorbereitete Mailereignisse umfassen Buchungsantrag, in
   Pruefung, Genehmigung, Ablehnung, Storno, Serienzusammenfassungen,
   Verschiebungsantraege, Wartelistenangebote und Ablauf, Sperren,
   Benutzerkonto-Anlage/-Deaktivierung sowie Organisationssperren.
   Die Abrechnungsvorbereitung ist unter `/admin/billing` verfuegbar und
   erzeugt nur Exportgrundlagen, keine Rechnungen oder Zahlungen. CSV-, XLSX-
   und PDF-Exporte koennen dort fuer gefilterte Zeitraeume erstellt werden.
   Der Zugriff ist ueber das Recht `BILLING_EXPORT` geschuetzt.
   Die öffentliche Ansicht unter `/public` zeigt Standortuebersicht,
   datenschutzkonforme Kalenderdaten, freie Zeiten und einen iCal-Export unter
   `/public/calendar/ical`.
   Ferien und Feiertage koennen unter `/admin/holidays` manuell gepflegt oder
   ueber Vorlagen fuer Oesterreich/Niederoesterreich importiert werden. In der
   Serienanlage gibt es zusaetzlich eine Semester-/Saison-Vorauswahl fuer das
   Enddatum.
   Hintergrundjobs fuer Benachrichtigungen und Wartelistenablauf koennen unter
   `/admin/system/jobs` manuell gestartet oder per CLI ausgefuehrt werden:

   ```bash
   npm run worker:run
   ```

   Beispiel fuer Cron im Serverbetrieb:

   ```cron
   */5 * * * * cd /srv/hallenverwaltung && npm run worker:run
   ```

   Im Docker-Betrieb sollte derselbe Befehl in einem separaten Cron-/Worker-
   Container oder ueber den Host-Cron gegen das laufende App-Image gestartet
   werden. Es wird kein externer Scheduler-Dienst vorausgesetzt.

5. Entwicklungsserver starten:

   ```bash
   npm run dev
   ```

Die Anwendung ist unter [http://localhost:3000](http://localhost:3000)
erreichbar.

## Produkt Lokal Ansehen

Fuer einen ersten realen Durchstich ist der aktuelle Stand bereits lokal
nutzbar:

- Komfortstart fuer den lokalen Klicktest:

  ```cmd
  start-test-deployment.bat
  ```

  Der Batch prueft einen bereits laufenden Testserver, startet bei Bedarf die
  lokale PostgreSQL-Datenbank, spielt Migrationen und Demo-Daten ein, erstellt
  den Produktionsbuild und startet den Testserver ueber `npm run start`.

- Oeffentlich: [http://localhost:3000/public](http://localhost:3000/public)
- Login: [http://localhost:3000/login](http://localhost:3000/login)
- Admin nach Login: `/admin`
- Vereinsportal nach Login: `/portal`
- Hallenwart-Funktionen nach Login: `/admin/handovers`

Ein manueller Testleitfaden liegt in `docs/pilot-testplan.md`.
Der verbindliche Freeze-Umfang fuer den naechsten Echstand-Test liegt in
`docs/teststand-freeze.md`.
Flexible lokale und serverseitige Installationsoptionen stehen in
`docs/installation-options.md`.
Der finale Abnahmetestplan liegt in `docs/acceptance-testplan.md`.
Kurzanleitungen fuer Verwaltung und Vereine liegen in
`docs/user-guide-admin.md` und `docs/user-guide-portal.md`.
Die Go-Live-Ausfuehrung wird in `docs/go-live-runbook.md` gefuehrt.
Das zugehoerige Nachweisprotokoll liegt in `docs/go-live-evidence.md`.

### Hinweis zu Codex auf Windows

In einzelnen Codex-Windows-Sessions koennen `npm test`, `npm run lint`
oder `npm run build` mit einem allgemeinen `Zugriff verweigert`
scheitern, obwohl das Projekt selbst in Ordnung ist. In diesem Fall
koennen die direkten Node-CLI-Aufrufe verwendet werden:

```powershell
node ./node_modules/tsx/dist/cli.mjs --test tests/*.test.ts
node ./node_modules/eslint/bin/eslint.js .
node ./node_modules/next/dist/bin/next build --webpack
node ./node_modules/prisma/build/index.js validate
node ./node_modules/prisma/build/index.js generate
node ./node_modules/typescript/bin/tsc --noEmit
```

Der Webpack-Buildpfad ist fuer dieses Projekt bewusst als robuster
Produktionsbuild hinterlegt.

## E2E-Tests

Phase 14 fuehrt Playwright-Smoke-Tests fuer echte Browserflows ein. Die Tests
legen ueber `e2e/global-setup.ts` wiederholbare Testbenutzer und minimale
Katalogdaten an:

- Admin-Login und Weiterleitung ins Verwaltungsportal
- Portal-Login und Buchungsantrag
- öffentlicher Bereich und Kalender
- manuelle System-Job-Ausfuehrung im Adminbereich

Vor dem ersten Lauf muss der Chromium-Browser installiert werden:

```bash
npm run test:e2e:install
```

Danach kann die E2E-Suite gestartet werden:

```bash
npm run test:e2e
```

Ohne `E2E_BASE_URL` startet Playwright den lokalen Next.js-Devserver auf
`http://127.0.0.1:3000`. Fuer externe Umgebungen kann stattdessen gesetzt
werden:

```bash
E2E_BASE_URL=https://hallenverwaltung.example.org npm run test:e2e
```

Die Tests benoetigen eine erreichbare PostgreSQL-Datenbank ueber
`DATABASE_URL`. Ohne gesetzte Variable wird die lokale Entwicklungs-URL
`postgresql://postgres@localhost:55435/hallenverwaltung_phase35?schema=public`
verwendet.

Falls der automatische Playwright-Webserver in einer Windows-/Codex-Session
beim Beenden haengen bleibt, kann der Server manuell gestartet und die Suite
gegen die laufende Instanz ausgefuehrt werden:

```powershell
$env:DATABASE_URL="postgresql://postgres@localhost:55435/hallenverwaltung_phase35?schema=public"
$env:AUTH_SECRET="phase-14-e2e-local-secret-change-in-real-env"
$env:AUTH_TRUST_HOST="true"
npm run dev -- --hostname 127.0.0.1 --port 3000
```

In einem zweiten Terminal:

```powershell
$env:E2E_BASE_URL="http://127.0.0.1:3000"
$env:DATABASE_URL="postgresql://postgres@localhost:55435/hallenverwaltung_phase35?schema=public"
$env:AUTH_SECRET="phase-14-e2e-local-secret-change-in-real-env"
$env:AUTH_TRUST_HOST="true"
npm run test:e2e
```

## Start mit Docker Compose

Nach dem Anlegen einer `.env`-Datei kann die gesamte Anwendung gestartet
werden:

```bash
docker compose up --build
```

Der Dienst `migrate` fuehrt die vorhandenen Prisma-Migrationen aus, bevor
der Webcontainer startet. PostgreSQL-Daten werden im Volume `postgres_data`
gespeichert.

## Produktionsvorbereitung

Phase 22 stellt eine produktionsnahe, aber bewusst noch nicht
umgebungsspezifisch ausgerollte Grundlage bereit:

- `docs/installation-options.md` fuer lokalen Teststand, eigenen Testserver
  und spaeteren Gemeinde-Server
- `docs/teststand-freeze.md` fuer den fachlichen Umfang des testbaren
  Echstands
- `docker-compose.production.yml` fuer PostgreSQL, Migrationen, Web,
  Worker und Nginx Reverse Proxy
- `.env.production.example` als Vorlage fuer Produktionsvariablen
- `.env.test.example` als getrennte Vorlage fuer einen produktionsnahen
  Testserver ohne Produktivdaten
- `deploy/nginx/templates/hallenverwaltung.conf.template` fuer HTTPS-Terminierung
- Backup-, Restore- und Restore-Test-Scripts unter `deploy/scripts`
- `docs/production-readiness.md` als Checkliste fuer Zielumgebung,
  Initialbenutzer, SMTP, Worker, Backup/Restore und Smoke-Test
- `docs/go-live-runbook.md` als operative Go-Live-Schrittfolge mit
  Nachweisen und Stop-Kriterien
- `docs/go-live-evidence.md` als ausfuellbares Protokoll fuer echte
  Zielumgebungsnachweise

Produktionsumgebung vorbereiten:

```bash
cp .env.production.example .env.production
```

Danach muessen mindestens `POSTGRES_PASSWORD`, `AUTH_SECRET`, `AUTH_URL`,
`PUBLIC_BASE_URL`, `SERVER_NAME`, `APP_ENV=production`,
`MAIL_DELIVERY_MODE=smtp` und die SMTP-Werte fuer die Zielumgebung gesetzt
werden.
Zertifikate werden nicht generiert und nicht committed. Erwartet werden:

```text
deploy/certs/fullchain.pem
deploy/certs/privkey.pem
```

Produktionskonfiguration pruefen:

```bash
npm run production:check
docker compose --env-file .env.production -f docker-compose.production.yml config
```

Produktionsnahen Testserver vorbereiten:

```bash
cp .env.test.example .env.test
ENV_FILE=.env.test npm run production:check
docker compose --env-file .env.test -f docker-compose.production.yml config
```

Unter Windows PowerShell:

```powershell
Copy-Item .env.test.example .env.test
$env:ENV_FILE=".env.test"; npm run production:check
docker compose --env-file .env.test -f docker-compose.production.yml config
Remove-Item Env:\ENV_FILE
```

`.env.test` und `.env.production` bleiben strikt getrennt. Testserver duerfen
`MAIL_DELIVERY_MODE=disabled` verwenden, wenn noch kein Testpostfach bereit
steht. Der Gemeinde-Produktivserver muss `MAIL_DELIVERY_MODE=smtp` verwenden.

Optional prueft der Produktionscheck auch Zertifikatsdateien:

```bash
npm run production:check -- --check-files
```

Produktionsnahe Umgebung starten:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up --build -d
```

Der Worker wird in dieser Compose-Datei als eigener Dienst gestartet und fuehrt
`npm run worker:run` im Abstand von `WORKER_INTERVAL_SECONDS` aus. Alternativ
kann der Worker ueber Cron ausserhalb von Docker betrieben werden.

### Backup und Restore

Backup erstellen:

```bash
ENV_FILE=.env.production deploy/scripts/backup-postgres.sh
```

Restore-Test in einer temporaeren Datenbank ausfuehren:

```bash
BACKUP_FILE=backups/hallenverwaltung_YYYYMMDDTHHMMSSZ.dump \
ENV_FILE=.env.production \
deploy/scripts/restore-test-postgres.sh
```

Restore in die konfigurierte Datenbank ist destruktiv und nur fuer bewusst
geplante Wiederherstellungen gedacht:

```bash
BACKUP_FILE=backups/hallenverwaltung_YYYYMMDDTHHMMSSZ.dump \
ENV_FILE=.env.production \
deploy/scripts/restore-postgres.sh
```

Backups und TLS-Zertifikate sind in `.gitignore` ausgeschlossen.

## Datenbank

Das Prisma-Schema befindet sich in `prisma/schema.prisma`. In Phase 1
enthaelt es bewusst noch keine fachlichen Tabellen. Die Initialmigration
stellt nur den Migrationsstand des Projekts her.

Wichtige Befehle:

```bash
npm run db:generate
npm run db:migrate -- --name beschreibung
npm run db:deploy
npm run db:seed
```

## Projektstruktur

```text
app/                    Next.js App Router und globale Styles
prisma/                 Prisma-Schema, Migrationen und Seed-Script
prisma.config.ts        Prisma-CLI- und Seed-Konfiguration
public/                 Statische Dateien
Dockerfile              Produktions-Build der Webanwendung
docker-compose.yml      Web, Migrationen und PostgreSQL
docker-compose.production.yml  Produktionsnahe Compose-Konfiguration
deploy/                 Reverse-Proxy-Templates und Backup-Scripts
e2e/                    Playwright-Smoke-Tests
.env.example            Beispielkonfiguration
.env.test.example       Testserver-Konfiguration ohne Secrets
.env.production.example Produktionskonfiguration ohne Secrets
```
