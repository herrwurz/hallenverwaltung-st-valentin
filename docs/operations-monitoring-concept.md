# Betriebs- und Monitoringkonzept - Phase 40.3

Diese Unterlage beschreibt den minimal notwendigen Betrieb fuer Testserver und
Gemeinde-Produktivserver der Hallenverwaltung St. Valentin.

Sie ist bewusst einfach gehalten: Version 1 braucht kein grosses
Enterprise-Monitoring, aber klare Verantwortlichkeiten, regelmaessige
Pruefungen und nachvollziehbare Nachweise.

## Ziel

- Ausfaelle von Web, Datenbank, Worker, E-Mail und Speicherplatz sollen
  zeitnah erkannt werden.
- Backups sollen nicht nur erstellt, sondern auch wiederherstellbar sein.
- Testserver und Produktivserver sollen getrennt betrieben und beurteilt
  werden.
- Verantwortlichkeiten und Eskalationswege sollen vor Echtdatenbetrieb
  feststehen.

## Betriebsstufen

| Betriebsstufe | Zweck | Mindestanforderung |
| --- | --- | --- |
| Lokal | Entwicklung und Durchklicktest am Arbeitsplatz | kein produktives Monitoring |
| Eigener Testserver | externer Test mit Testdaten oder freigegebenen Echtdaten | taegliche Sichtpruefung, Backup optional je nach Daten |
| Gemeinde-Produktivserver | echter Betrieb mit produktiven Daten | definierter Betrieb, Backup, Monitoring, Eskalation |

## Verantwortlichkeiten

| Rolle | Aufgabe | Name / Kontakt |
| --- | --- | --- |
| Betrieb verantwortlich | Server, Dienste, Updates, Backup |  |
| Fachlich verantwortlich | fachliche Freigabe, Testkoordination |  |
| Datenschutz/IT-Sicherheit | Echtdatenfreigabe, Incident-Entscheidungen |  |
| Stellvertretung Betrieb | Vertretung bei Urlaub/Ausfall |  |
| Eskalationskontakt | Entscheidung bei Stoerung oder Datenrisiko |  |

## Zu ueberwachende Komponenten

| Komponente | Pruefung | Sollzustand | Prioritaet |
| --- | --- | --- | --- |
| Webdienst | HTTPS-Aufruf von `/login` | HTTP 200/3xx, Seite erreichbar | hoch |
| Admin-Login | manueller oder automatisierter Smoke-Test | Login moeglich | hoch |
| Datenbank | Container/Service healthy, Verbindung moeglich | erreichbar | hoch |
| Migrationen | keine ausstehenden fehlgeschlagenen Migrationen | sauber | hoch |
| Worker | letzter erfolgreicher Lauf sichtbar | nicht aelter als vereinbarter Zeitraum | hoch |
| Notification Queue | keine wachsende Fehlerflut | kontrolliert | mittel |
| SMTP | Testmail oder echte Ereignismail | Versand funktioniert | hoch bei Produktivmail |
| Speicherplatz | Datentraeger ausreichend frei | Schwelle festlegen | hoch |
| Backup | letzte Backup-Datei vorhanden | nach Plan erstellt | hoch |
| Restore-Probe | Test-Wiederherstellung | regelmaessig erfolgreich | hoch |
| TLS-Zertifikat | Ablaufdatum | rechtzeitig erneuern | hoch |
| Logs | keine dauerhaften Fehler | kontrolliert | mittel |

## Empfohlene Pruefintervalle

| Pruefung | Testserver | Produktivserver |
| --- | --- | --- |
| Web erreichbar | vor Testbeginn / taeglich im Testzeitraum | automatisch oder taeglich |
| Datenbank erreichbar | vor Testbeginn | automatisch oder taeglich |
| Worker-Lauf | bei Bedarf / taeglich im Testzeitraum | taeglich |
| Notification Queue | bei Mailtests | taeglich oder nach Ereignissen |
| Backup vorhanden | wenn Echtdaten genutzt werden | taeglich |
| Restore-Probe | vor Echtdaten-Test optional | vor Go-Live und danach regelmaessig |
| Speicherplatz | woechentlich | taeglich oder automatisch |
| TLS-Ablauf | monatlich | monatlich oder automatisch |
| Security-/Updatefenster | nach Bedarf | monatlich oder nach Sicherheitsmeldung |

## Manuelle Standardchecks

Die konkreten Befehle koennen je nach Zielserver angepasst werden.

### Dienste pruefen

```bash
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

Erwartung:

- `db` healthy
- `web` running
- `worker` running
- `reverse-proxy` running
- `migrate` erfolgreich beendet

### Web pruefen

```bash
curl -I https://hallenverwaltung.example.org/login
```

Erwartung:

- Antwort ueber HTTPS.
- Kein Zertifikatsfehler.
- Kein 5xx-Fehler.

### Logs pruefen

```bash
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=100 web
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=100 worker
```

Erwartung:

- keine dauerhaften Startschleifen
- keine wiederholten Datenbankfehler
- keine Secret-Werte in Logs

### Backup pruefen

```bash
ENV_FILE=.env.production deploy/scripts/backup-postgres.sh
```

Erwartung:

- Backup-Datei wird erzeugt.
- Dateigroesse ist plausibel.
- Ablageort ist nur fuer berechtigte Personen lesbar.

### Restore-Probe pruefen

```bash
BACKUP_FILE=backups/hallenverwaltung_YYYYMMDDTHHMMSSZ.dump \
ENV_FILE=.env.production \
deploy/scripts/restore-test-postgres.sh
```

Erwartung:

- Restore-Test laeuft ohne Fehler.
- Tabellen werden ausgegeben.
- Produktivdatenbank wird nicht ueberschrieben.

## Schwellen und Eskalation

| Ereignis | Reaktion | Eskalation |
| --- | --- | --- |
| Web nicht erreichbar | Dienststatus und Logs pruefen | Betrieb sofort informieren |
| Datenbank nicht erreichbar | DB-Container/Service pruefen | Betrieb sofort informieren |
| Migration fehlgeschlagen | keine weiteren Deployments | Entwickler/Betrieb |
| Worker laeuft nicht | Worker neu starten, Queue pruefen | Betrieb/Fachbereich |
| Backup fehlt | Backup manuell starten, Ursache pruefen | Betrieb |
| Restore-Probe scheitert | Go-Live stoppen | Betrieb/IT-Sicherheit |
| SMTP versendet nicht | Mailmodus, SMTP, Queue pruefen | Betrieb/Fachbereich |
| Speicherplatz kritisch | Logs/Backups pruefen, Platz schaffen | Betrieb sofort |
| Verdacht auf Datenpanne | Zugriff begrenzen, Logs sichern | Datenschutz/IT-Sicherheit |

## Dokumentationspflicht im Betrieb

Mindestens festhalten:

- Datum und Ergebnis der Go-Live-Checks.
- letzter erfolgreicher Backup- und Restore-Nachweis.
- verantwortliche Personen fuer Betrieb und Eskalation.
- bewusste Risikoakzeptanzen.
- groessere Stoerungen und deren Behebung.
- Aenderungen an SMTP, Public-Bereich, Worker oder Backup.

Vorlagen:

- `docs/go-live-evidence.md`
- `docs/security-tom-checklist.md`
- `docs/testdata-release-template.md`

## Testserver-Regeln

Fuer den eigenen Testserver:

- `.env.test` verwenden.
- `APP_ENV=test` setzen.
- fuer den aktuellen Hetzner-Testserver
  `https://hallenverwaltung.hofreither.at` als `PUBLIC_BASE_URL` und
  `AUTH_URL` verwenden.
- `PUBLIC_AREA_ENABLED=false`, ausser der Public-Bereich wird bewusst getestet.
- `MAIL_DELIVERY_MODE=disabled` oder Test-SMTP verwenden.
- Keine Produktivdaten ohne ausgefuellte Echtdatenfreigabe.
- Testzugang nur fuer benannte Tester.
- Nach Testende entscheiden: Daten loeschen, anonymisieren oder fuer Folgetests
  behalten.

## Produktivserver-Regeln

Fuer den Gemeinde-Produktivserver:

- `.env.production` verwenden.
- `APP_ENV=production` setzen.
- HTTPS muss funktionieren.
- `MAIL_DELIVERY_MODE=smtp` muss gesetzt und getestet sein.
- Demo-Zugaenge duerfen nicht aktiv sein.
- Backup und Restore-Probe muessen nachgewiesen sein.
- Monitoring und Eskalation muessen organisatorisch geregelt sein.
- Datenschutz-/IT-Sicherheitsfreigabe muss dokumentiert sein.

## Mindestfreigabe vor Echtdatenbetrieb

| Punkt | Status | Nachweis |
| --- | --- | --- |
| Verantwortliche benannt | offen |  |
| Zielserver und Domain festgelegt | offen |  |
| HTTPS geprueft | offen |  |
| `.env.test` oder `.env.production` geprueft | offen |  |
| Backup erfolgreich | offen |  |
| Restore-Probe erfolgreich | offen |  |
| Worker erfolgreich gelaufen | offen |  |
| SMTP geregelt | offen |  |
| Testdaten-/Echtdatenfreigabe geklaert | offen |  |
| Eskalationsweg dokumentiert | offen |  |
