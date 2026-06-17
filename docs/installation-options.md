# Installations- und Betriebsoptionen

Dieses Dokument beschreibt flexible Wege, die Hallenverwaltung einzurichten.
Der finale Zielbetrieb soll auf einem Gemeinde-Server erfolgen. Bis dieser
bereitsteht, kann die Anwendung lokal oder testweise auf einem eigenen Server
betrieben werden.

## Zielbild

Version 1 bleibt fachlich fuer St. Valentin ausgelegt. Die Installation soll
aber nicht an genau einen Server gebunden sein.

Unterstuetzte Betriebsstufen:

1. Lokaler Teststand auf Entwicklungsrechner
2. Testbetrieb auf eigenem Server
3. Produktivbetrieb auf Gemeinde-Server

Der Gemeinde-Server bleibt ein offener Go-Live-Blocker, bis Server, Domain,
Zugriff, Backup, Monitoring und Abnahme real geklaert sind.

## 1. Lokaler Teststand

Geeignet fuer:

- UI-Tests
- fachliche Klicktests
- Demo- und Pilotfeedback
- Entwicklung und schnelle Korrekturen

Voraussetzungen:

- Node.js 22 oder neuer
- npm
- PostgreSQL lokal oder per Docker Compose

Start:

```bash
npm install
cp .env.example .env
docker compose up -d db
npm run db:generate
npm run db:deploy
npm run db:seed
npm run demo:seed
npm run dev
```

Unter Windows PowerShell statt `cp`:

```powershell
Copy-Item .env.example .env
```

Aufruf:

```text
http://localhost:3000
```

Hinweise:

- Demo-Zugaenge sind nur lokal erlaubt.
- Lokale Testdaten sind keine Produktionsdaten.
- Lokaler Betrieb ersetzt keine Backup-/Restore-Probe.

## 2. Eigener Testserver

Geeignet fuer:

- realistischere Tests ausserhalb des Entwicklungsrechners
- Abnahme durch mehrere Personen
- Vorfuehrung fuer Verwaltung oder Vereine
- technische Vorbereitung vor Gemeinde-Server

Aktueller Testserver:

| Feld | Wert |
| --- | --- |
| Anbieter | Hetzner |
| IP-Adresse | `116.203.141.156` |
| Subdomain | `hallenverwaltung.hofreither.at` |
| Zweck | eigener produktionsnaher Testserver vor Gemeinde-Server |
| Betriebsdatei | `.env.test` |

Der frueher angedachte all-inkl.com-Testbetrieb ist damit fuer den aktuellen
Teststand nicht mehr der bevorzugte Weg. Die Zielumgebung ist jetzt ein eigener
Hetzner-Server, der Docker, Reverse Proxy, PostgreSQL, Worker und Backups
realistischer abbilden kann.

Die konkrete Einrichtung steht in
`docs/hetzner-testserver-deployment.md`.

Empfohlene Variante:

- Docker Compose verwenden
- eigene Testdomain oder Subdomain verwenden
- `.env.test` aus `.env.test.example` mit Testwerten pflegen
- SMTP nur mit Testpostfach oder bewusst deaktiviert/markiert testen

Vorbereitung:

```bash
cp .env.test.example .env.test
ENV_FILE=.env.test npm run production:check
docker compose --env-file .env.test -f docker-compose.production.yml config
```

Empfohlene `.env.test`-Werte fuer diesen Testserver:

```env
APP_ENV=test
PUBLIC_BASE_URL=https://hallenverwaltung.hofreither.at
AUTH_URL=https://hallenverwaltung.hofreither.at
AUTH_TRUST_HOST=true
PUBLIC_AREA_ENABLED=false
SERVER_NAME=hallenverwaltung.hofreither.at
MAIL_DELIVERY_MODE=disabled
```

SMTP kann spaeter fuer echte Mailtests auf `MAIL_DELIVERY_MODE=smtp`
umgestellt werden. Bis dahin soll Mailversand deaktiviert bleiben oder nur ein
klar getrenntes Testpostfach verwenden.

Start:

```bash
docker compose --env-file .env.test -f docker-compose.production.yml up --build -d
```

Pruefen:

```bash
docker compose --env-file .env.test -f docker-compose.production.yml ps
docker compose --env-file .env.test -f docker-compose.production.yml logs --tail=100 web
docker compose --env-file .env.test -f docker-compose.production.yml logs --tail=100 worker
```

Wichtig:

- Ein eigener Testserver ist noch kein Produktiv-Go-Live.
- Produktive Demo-Zugaenge bleiben verboten.
- Testserver-Nachweise duerfen als Vorbereitung dokumentiert werden, ersetzen
  aber nicht die finale Gemeinde-Server-Abnahme.

## 3. Gemeinde-Server

Geeignet fuer:

- echten Produktivbetrieb
- finale Abnahme
- reale Benutzer, reale Buchungen und echte Benachrichtigungen

Vor Go-Live muessen mindestens geklaert sein:

- Server oder Hosting-Umgebung
- Domain/Subdomain
- technischer Zugriff
- Docker-Compose-Faehigkeit oder alternative Betriebsform
- TLS-Zertifikate
- echte SMTP-Konfiguration
- Backup- und Restore-Verfahren
- Monitoring/Alarmierung
- verantwortliche Personen
- finale fachliche Abnahme

Die verbindlichen Dokumente dafuer sind:

- `docs/go-live-open-points.md`
- `docs/go-live-runbook.md`
- `docs/go-live-evidence.md`
- `docs/production-readiness.md`

## Wechsel zwischen Umgebungen

Die Anwendung wird ueber Umgebungsdateien konfiguriert:

| Umgebung | Datei | Zweck |
| --- | --- | --- |
| Lokal | `.env` | Entwicklung und lokaler Test |
| Testserver | `.env.test` | produktionsnaher Testbetrieb ohne Produktivdaten |
| Gemeinde-Server | `.env.production` | finaler Produktivbetrieb |

Regeln:

- `.env`, `.env.test` und `.env.production` werden nicht committet.
- `.env.test.example` und `.env.production.example` sind nur Vorlagen ohne echte Secrets.
- `APP_ENV` muss je Umgebung eindeutig gesetzt sein: `local`, `test` oder
  `production`.
- `PUBLIC_BASE_URL`, `AUTH_URL` und `SERVER_NAME` muessen zur jeweiligen
  Test- oder Produktivdomain passen.
- `MAIL_DELIVERY_MODE=disabled` ist fuer Testumgebungen erlaubt, wenn noch
  kein Testpostfach bereitsteht. In Produktion muss `MAIL_DELIVERY_MODE=smtp`
  gesetzt sein.
- Secrets duerfen nicht in Logs, Tickets, Chat oder Dokumentation stehen.
- `AUTH_SECRET`, Datenbankpasswoerter und SMTP-Passwoerter je Umgebung
  getrennt vergeben.
- Demo-Seed nur lokal oder in klar markierten Testumgebungen verwenden.

## Empfehlung fuer jetzt

Aktueller sinnvoller Weg:

1. Lokalen Stand erneut starten und testen.
2. Feedback aus der Bedienung sammeln.
3. Danach eigenen Testserver vorbereiten.
4. Erst danach Gemeinde-Server finalisieren.

Damit bleibt der Go-Live-Blocker "Gemeinde-Server" offen, blockiert aber nicht
weitere lokale Produktpruefungen.
