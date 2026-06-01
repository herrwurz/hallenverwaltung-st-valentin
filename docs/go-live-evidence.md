# Go-Live-Nachweisprotokoll

Dieses Protokoll wird waehrend der echten Zielumgebungs-Abnahme ausgefuellt.
Es dokumentiert Nachweise zu den Hoch-Blockern aus
`docs/go-live-open-points.md` und zur Schrittfolge aus
`docs/go-live-runbook.md`.

Statuswerte:

- `offen`
- `bestanden`
- `fehlgeschlagen`
- `risikoakzeptiert`
- `nicht erforderlich`

## Rahmen

| Feld | Wert |
| --- | --- |
| Zielumgebung |  |
| Ziel-Domain |  |
| Zielserver |  |
| Abnahme-Datum |  |
| Technisch verantwortlich |  |
| Fachlich verantwortlich |  |
| Protokoll gefuehrt von |  |

## Hoch-Blocker

| Blocker | Status | Nachweis | Verantwortlich | Datum | Bemerkung |
| --- | --- | --- | --- | --- | --- |
| Zielserver und Domain festgelegt | offen |  |  |  |  |
| TLS-Zertifikate vorhanden und eingebunden | offen |  |  |  |  |
| `.env.production` ohne Platzhalterwerte | offen |  |  |  |  |
| Produktiver Admin-Initialbenutzer angelegt | offen |  |  |  |  |
| Demo-Zugaenge in Produktion ausgeschlossen | offen |  |  |  |  |
| SMTP gegen echten Server getestet | offen |  |  |  |  |
| Worker-Betrieb aktiv und protokolliert | offen |  |  |  |  |
| Backup-Routine eingerichtet | offen |  |  |  |  |
| Restore-Probe erfolgreich dokumentiert | offen |  |  |  |  |
| Monitoring/Alerting mindestens organisatorisch geregelt | offen |  |  |  |  |
| Finale Abnahme unterschrieben | offen |  |  |  |  |

## Technische Nachweise

### DNS und TLS

| Pruefung | Erwartung | Ergebnis | Nachweis |
| --- | --- | --- | --- |
| `nslookup <domain>` | Domain zeigt auf Zielserver | offen |  |
| `curl -I https://<domain>` | HTTPS antwortet mit gueltigem Zertifikat | offen |  |
| Zertifikatsdateien vorhanden | `fullchain.pem` und `privkey.pem` vorhanden | offen |  |
| Zertifikatsrechte geprueft | Private Key nicht breit lesbar | offen |  |

### Produktionskonfiguration

| Pruefung | Erwartung | Ergebnis | Nachweis |
| --- | --- | --- | --- |
| `.env.production` vorhanden | Datei existiert nur in Zielumgebung | offen |  |
| Platzhalter entfernt | Keine Werte wie `replace-with-*` oder `example.org` | offen |  |
| `AUTH_SECRET` geprueft | Lang, zufaellig, nicht dokumentiert | offen |  |
| Produktionscheck | `npm run production:check` ohne Fehler | offen |  |
| Compose-Konfiguration | `docker compose ... config` erfolgreich | offen |  |
| Git-Schutz | `.env.production` nicht vorgemerkt oder committet | offen |  |

### Dienste und Migration

| Pruefung | Erwartung | Ergebnis | Nachweis |
| --- | --- | --- | --- |
| Compose-Start | `up --build -d` erfolgreich | offen |  |
| Datenbank | `db` healthy | offen |  |
| Migration | `migrate` erfolgreich beendet | offen |  |
| Web | `web` laeuft | offen |  |
| Worker | `worker` laeuft | offen |  |
| Reverse Proxy | `reverse-proxy` laeuft | offen |  |

### Benutzer und Zugriff

| Pruefung | Erwartung | Ergebnis | Nachweis |
| --- | --- | --- | --- |
| Admin-Login | Produktiver Admin kann sich anmelden | offen |  |
| Admin-Bereich | `/admin` erreichbar | offen |  |
| Vereinszugriff | Vereinsbenutzer kann `/portal` nutzen | offen |  |
| Admin-Schutz | Vereinsbenutzer kann `/admin` nicht nutzen | offen |  |
| Demo-Zugaenge | Nicht vorhanden oder deaktiviert | offen |  |

### SMTP und Worker

| Pruefung | Erwartung | Ergebnis | Nachweis |
| --- | --- | --- | --- |
| SMTP-Konfiguration | Werte gesetzt, keine Secrets im Protokoll | offen |  |
| Testmail | Reale Mail empfangen | offen |  |
| Notification Queue | Eintrag wird verarbeitet | offen |  |
| Retry-Verhalten | Fehlversuch nachvollziehbar | offen |  |
| Worker-Protokoll | `/admin/system/jobs` zeigt erfolgreichen Lauf | offen |  |
| Keine Doppelverarbeitung | Worker/Cron-Konzept eindeutig | offen |  |

### Backup und Restore

| Pruefung | Erwartung | Ergebnis | Nachweis |
| --- | --- | --- | --- |
| Backup-Script | Backup-Datei wurde erzeugt | offen |  |
| Backup-Ablage | Speicherort dokumentiert | offen |  |
| Aufbewahrung | Frist organisatorisch entschieden | offen |  |
| Restore-Test | Restore-Probe erfolgreich | offen |  |
| Restore-Ausgabe | Wiederhergestellte Tabellen sichtbar | offen |  |
| Destruktiver Restore | Freigabeprozess dokumentiert | offen |  |

### Monitoring und Betrieb

| Pruefung | Erwartung | Ergebnis | Nachweis |
| --- | --- | --- | --- |
| Web-Monitoring | Erreichbarkeit wird geprueft | offen |  |
| Worker-Monitoring | Joblauf wird geprueft | offen |  |
| DB-Monitoring | Datenbankzustand wird geprueft | offen |  |
| Speicherplatz | Speicherplatz wird geprueft | offen |  |
| Backup-Monitoring | Backup-Erzeugung wird geprueft | offen |  |
| Eskalation | Verantwortliche Person und Kanal bekannt | offen |  |

## Fachliche Abnahme

| Bereich | Status | Nachweis | Bemerkung |
| --- | --- | --- | --- |
| Oeffentliche Ansicht | offen |  |  |
| Login/Rollen | offen |  |  |
| Stammdaten | offen |  |  |
| Buchungsantrag | offen |  |  |
| Genehmigung | offen |  |  |
| Warteliste | offen |  |  |
| Kalender | offen |  |  |
| Benachrichtigungen | offen |  |  |
| Abrechnung/Export | offen |  |  |
| Backup/Restore | offen |  |  |

## Mittlere Pilotentscheidungen

Diese Punkte blockieren den technischen Go-Live nicht zwingend, muessen aber
vor einem breiteren Vereins-Pilot bewusst entschieden werden.

| Punkt | Entscheidung | Verantwortlich | Datum | Bemerkung |
| --- | --- | --- | --- | --- |
| Stammdaten loeschen | offen |  |  |  |
| Rollen/Rechte bearbeiten | offen |  |  |  |
| Semester-Vorauswahl fuer Serien | offen |  |  |  |
| Oesterreichische Ferien je Bundesland vordefinieren | offen |  |  |  |

## Risikoakzeptanzen

Risikoakzeptanzen duerfen nur verwendet werden, wenn ein Hoch-Blocker bewusst
nicht vor Go-Live erledigt wird. Jede Risikoakzeptanz braucht Begruendung,
Auswirkung, Gegenmassnahme und Verantwortlichen.

| Punkt | Risiko | Auswirkung | Gegenmassnahme | Verantwortlich | Datum |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

## Freigabe

| Rolle | Name | Entscheidung | Datum | Unterschrift/Vermerk |
| --- | --- | --- | --- | --- |
| Technik |  | offen |  |  |
| Fachbereich |  | offen |  |  |
| Betrieb |  | offen |  |  |

Freigabeentscheidung:

- [ ] Go-Live freigegeben
- [ ] Go-Live mit Risikoakzeptanz freigegeben
- [ ] Go-Live nicht freigegeben
