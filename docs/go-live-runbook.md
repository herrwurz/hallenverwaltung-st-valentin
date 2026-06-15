# Go-Live-Runbook

Dieses Runbook beschreibt die konkrete Ausfuehrung der Hoch-Blocker aus
`docs/go-live-open-points.md`. Es ersetzt keine Serveradministration, sorgt
aber dafuer, dass Go-Live-Schritte, Nachweise und Stop-Kriterien einheitlich
dokumentiert werden.

Flexible Installationswege fuer lokalen Teststand, eigenen Testserver und
spaeteren Gemeinde-Server stehen in `docs/installation-options.md`.

IT-Sicherheits- und Datenschutzvorbereitung steht in
`docs/security-privacy-readiness.md`. Ausfuellbare Vorlagen liegen in
`docs/privacy-processing-record-template.md`,
`docs/security-tom-checklist.md` und `docs/testdata-release-template.md`.

Die Ergebnisse der echten Zielumgebungs-Abnahme werden in
`docs/go-live-evidence.md` protokolliert. Dort duerfen keine Secrets, privaten
Schluessel oder echten Passwoerter eingetragen werden.

## Grundregel

Ein Produktivstart ist erst freigabefaehig, wenn jeder Hoch-Blocker entweder
erledigt und nachgewiesen oder ausdruecklich mit Risikoakzeptanz freigegeben
wurde.

Keine echten Passwoerter, Secrets, SMTP-Zugangsdaten oder privaten
Zertifikatsschluessel in Tickets, Chatverlaeufe, Commits oder Protokolle
kopieren.

## Vorbereitende Angaben

| Feld | Wert |
| --- | --- |
| Ziel-Domain |  |
| Zielserver |  |
| Verantwortliche Person Technik |  |
| Verantwortliche Person Fachabnahme |  |
| Geplantes Go-Live-Datum |  |
| Rollback-Entscheider |  |

## 1. Zielserver und Domain

Aktion:

- Zielserver bereitstellen.
- DNS-Eintrag der Ziel-Domain auf den Server zeigen lassen.
- Firewall nur fuer benoetigte Ports oeffnen.

Nachweis:

```bash
nslookup hallenverwaltung.example.org
```

Stop-Kriterium:

- Domain zeigt nicht auf den Zielserver.
- SSH/Adminzugang ist nicht geregelt.
- Ports 80/443 sind nicht erreichbar oder unsicher offen.

## 2. TLS-Zertifikate

Aktion:

- Zertifikate bereitstellen.
- Erwartete Dateien:

```text
deploy/certs/fullchain.pem
deploy/certs/privkey.pem
```

Nachweis:

```bash
ls -l deploy/certs
```

Nach dem Start:

```bash
curl -I https://hallenverwaltung.example.org
```

Stop-Kriterium:

- Zertifikat fehlt.
- Private-Key-Rechte sind zu offen.
- HTTPS liefert kein gueltiges Zertifikat fuer die Ziel-Domain.

## 3. Produktionskonfiguration

Aktion:

```bash
cp .env.production.example .env.production
```

Fuer einen vorgelagerten Testserver stattdessen:

```bash
cp .env.test.example .env.test
ENV_FILE=.env.test npm run production:check
docker compose --env-file .env.test -f docker-compose.production.yml config
```

Pflichtwerte in `.env.production` setzen:

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

Konfiguration pruefen:

```bash
npm run production:check
docker compose --env-file .env.production -f docker-compose.production.yml config
```

Stop-Kriterium:

- `.env.production` enthaelt Platzhalter wie `replace-with-*` oder
  `example.org`.
- `AUTH_SECRET` ist kurz, wiederverwendet oder in Logs/Tickets sichtbar.
- `.env.production` ist versehentlich fuer Git vorgemerkt.
- `.env.test` und `.env.production` teilen sich Secrets, Datenbank oder SMTP-
  Zugangsdaten.
- `MAIL_DELIVERY_MODE` ist in Produktion nicht `smtp`.

Optional koennen Zertifikatsdateien direkt mitgeprueft werden:

```bash
npm run production:check -- --check-files
```

## 4. Start, Migration und Dienste

Aktion:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up --build -d
```

Pruefung:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml ps
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=100 web
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=100 worker
```

Erwartung:

- `db` ist healthy.
- `migrate` ist erfolgreich beendet.
- `web` laeuft.
- `worker` laeuft.
- `reverse-proxy` laeuft.

Stop-Kriterium:

- Migration scheitert.
- Webdienst startet nicht.
- Worker startet nicht.
- Reverse Proxy ist nicht erreichbar.

## 5. Produktiver Initialbenutzer

Aktion:

- Mindestens einen Gemeinde-/Admin-Benutzer mit Systemrechten anlegen.
- Passwort individuell und sicher vergeben.
- Keine Demo-Passwoerter in Produktion verwenden.

Nachweis:

- Login mit produktivem Admin funktioniert.
- `/admin` ist erreichbar.
- Demo-Benutzer sind nicht vorhanden oder deaktiviert.

Stop-Kriterium:

- Produktivsystem enthaelt aktive Demo-Zugaenge.
- Admin-Passwort stammt aus README, Testplan oder Chat.
- Kein Admin kann sich anmelden.

## 6. SMTP und Benachrichtigungen

Aktion:

- SMTP-Werte in `.env.production` setzen.
- Admin-Seite `/admin/notifications` oeffnen.
- Benachrichtigungsereignis ausloesen.
- Queue durch Worker oder manuell verarbeiten.

Nachweis:

- Testmail wurde real empfangen.
- Gesendete Notification ist im System sichtbar.
- Fehlversuch und Retry sind bei absichtlichem SMTP-Fehler nachvollziehbar.

Stop-Kriterium:

- SMTP versendet nicht.
- Absenderdomain lehnt Versand ab.
- Benachrichtigung wird erzeugt, aber nie verarbeitet.

## 7. Worker-Betrieb

Aktion:

- Worker als eigenen Compose-Dienst aktiv lassen.
- Nicht parallel zusaetzlich Cron starten, wenn derselbe Job dadurch doppelt
  laufen kann.

Pruefung:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=100 worker
```

Nachweis:

- `/admin/system/jobs` zeigt erfolgreiche Joblaeufe.
- Notification Queue wird verarbeitet.
- Wartelistenangebote koennen ablaufen.

Stop-Kriterium:

- Kein erfolgreicher Worker-Lauf sichtbar.
- Wartelistenablauf oder Notification Queue bleiben liegen.
- Worker und Cron laufen parallel ohne klares Betriebskonzept.

## 8. Backup und Restore-Probe

Backup:

```bash
ENV_FILE=.env.production deploy/scripts/backup-postgres.sh
```

Restore-Probe:

```bash
BACKUP_FILE=backups/hallenverwaltung_YYYYMMDDTHHMMSSZ.dump \
ENV_FILE=.env.production \
deploy/scripts/restore-test-postgres.sh
```

Nachweis:

- Backup-Datei existiert.
- Restore-Test laeuft ohne Fehler.
- Restore-Test gibt wiederhergestellte Tabellen aus.
- Aufbewahrungsfrist und Ablageort sind entschieden.

Stop-Kriterium:

- Backup kann nicht erstellt werden.
- Restore-Probe scheitert.
- Niemand weiss, wo Backups liegen oder wie lange sie aufbewahrt werden.

## 9. Monitoring und Alarmierung

Version 1 verlangt mindestens eine organisatorische Regelung.

Mindestens ueberwachen:

- Webdienst erreichbar
- Worker laeuft
- Datenbank erreichbar
- Speicherplatz ausreichend
- Backup wurde erzeugt

Nachweis:

- Verantwortliche Person ist benannt.
- Pruefintervall ist festgelegt.
- Eskalationsweg bei Ausfall ist bekannt.

Stop-Kriterium:

- Niemand ist fuer Ausfaelle verantwortlich.
- Kein Pruefintervall definiert.
- Backup- oder Speicherplatzprobleme wuerden unbemerkt bleiben.

## 10. Smoke-Test und fachliche Abnahme

Smoke-Test:

- `/public`
- `/public/calendar`
- `/login`
- Admin-Login
- Portal-Login
- Buchungsantrag im Portal
- Admin-Buchungsuebersicht
- Kalenderansicht
- Benachrichtigungsqueue
- Worker-Jobs unter `/admin/system/jobs`
- Abrechnungsexport in Testperiode

Fachliche Abnahme:

- Testfaelle aus `docs/acceptance-testplan.md` ausfuehren.
- Ergebnis im Abnahmeprotokoll dokumentieren.
- Offene Mittel-Punkte aus `docs/go-live-open-points.md` bewusst einordnen.

Stop-Kriterium:

- Kritischer Abnahmetest scheitert.
- Hoch-Blocker bleibt offen.
- Fachliche Freigabe fehlt.

## 11. Datenschutz- und Sicherheitsfreigabe

Aktion:

- `docs/security-privacy-readiness.md` gemeinsam mit IT, Datenschutz und
  Fachverantwortung durchgehen.
- Verarbeitungstaetigkeit, TOM-Checkliste und Testdatenfreigabe bei Bedarf
  ausfuellen.
- Verantwortliche Personen benennen.
- Testdatenregelung, oeffentliche Sichtbarkeit, SMTP-Betrieb, Backup,
  Monitoring und Incident-Prozess dokumentieren.

Nachweis:

- Verarbeitungsverzeichnis oder lokale Datenschutzunterlage ist vorbereitet.
- TOMs oder Sicherheitsmassnahmen sind dokumentiert.
- Test- und Produktionsumgebung nutzen getrennte Secrets und getrennte
  Datenbanken.
- Oeffentliche Kalenderanzeige ist fachlich und datenschutzseitig freigegeben
  oder deaktiviert.

Stop-Kriterium:

- Niemand ist fuer Datenschutz-/IT-Sicherheitsfreigabe benannt.
- Echtdaten sollen auf einem Testsystem ohne Freigabe oder Schutzmassnahmen
  verwendet werden.
- Oeffentliche Sichtbarkeit ist unklar.
- Incident-/Datenpannenprozess ist nicht geregelt.

## Rollback-Entscheidung

Rollback pruefen, wenn nach dem Start eines der folgenden Ereignisse eintritt:

- Login fuer Admins nicht moeglich.
- Buchungs- oder Genehmigungsdaten werden falsch geschrieben.
- Migration hat Daten beschaedigt.
- E-Mail-Versand erzeugt Massenaussendungen oder falsche Empfaenger.
- Restore faellt aus, waehrend produktive Daten gefaehrdet sind.

Produktiver Restore ist destruktiv und darf nur nach ausdruecklicher Freigabe
ausgefuehrt werden:

```bash
BACKUP_FILE=backups/hallenverwaltung_YYYYMMDDTHHMMSSZ.dump \
ENV_FILE=.env.production \
deploy/scripts/restore-postgres.sh
```

## Abschluss

Die folgende Kurzliste dient als schneller Abschlussblick. Die ausfuehrlichen
Nachweise stehen in `docs/go-live-evidence.md`.

| Punkt | Ergebnis | Nachweis | Verantwortlich | Datum |
| --- | --- | --- | --- | --- |
| Zielserver/Domain | offen |  |  |  |
| TLS | offen |  |  |  |
| `.env.production` | offen |  |  |  |
| Dienste/Migration | offen |  |  |  |
| Initialbenutzer | offen |  |  |  |
| SMTP | offen |  |  |  |
| Worker | offen |  |  |  |
| Backup/Restore | offen |  |  |  |
| Monitoring | offen |  |  |  |
| Datenschutz/IT-Sicherheit | offen |  |  |  |
| Abnahme | offen |  |  |  |
