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

Aktueller Hinweis:

- Der geplante eigene Testserver soll voraussichtlich auf all-inkl.com laufen.
- Das ist eine eigene technische Huerde, weil vorab geklaert werden muss, ob
  der konkrete Tarif dauerhaft Node.js, PostgreSQL, Worker/Cron, Umgebungs-
  variablen, Prozessbetrieb und optional Docker/Reverse Proxy unterstuetzt.
- Bis diese Hosting-Fragen geklaert sind, bleibt der lokale Teststand die
  verlaessliche Umgebung fuer Klicktests.

Empfohlene Variante:

- Docker Compose verwenden
- eigene Testdomain oder Subdomain verwenden
- `.env.production` mit Testwerten pflegen
- SMTP nur mit Testpostfach oder bewusst deaktiviert/markiert testen

Vorbereitung:

```bash
cp .env.production.example .env.production
npm run production:check
docker compose --env-file .env.production -f docker-compose.production.yml config
```

Start:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up --build -d
```

Pruefen:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml ps
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=100 web
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=100 worker
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
| Testserver | `.env.production` | produktionsnaher Testbetrieb |
| Gemeinde-Server | `.env.production` | finaler Produktivbetrieb |

Regeln:

- `.env` und `.env.production` werden nicht committet.
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
