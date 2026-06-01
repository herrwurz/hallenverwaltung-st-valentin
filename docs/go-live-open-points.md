# Go-Live-Entscheidungsliste

Diese Liste sammelt Punkte, die vor dem Go-Live bewusst entschieden werden
muessen. Sie basiert auf Pilotfeedback, Produktions-Readiness und dem aktuellen
Version-1-Umfang.

## Muss vor Go-Live entschieden sein

| Punkt | Status | Entscheidung |
| --- | --- | --- |
| Zielserver und Domain | offen |  |
| TLS-Zertifikate vorhanden | offen |  |
| `.env.production` ohne Platzhalter | offen |  |
| Produktiver Admin-Initialbenutzer | offen |  |
| Demo-Zugaenge in Produktion ausgeschlossen | offen |  |
| SMTP gegen echten Server getestet | offen |  |
| Worker-Betrieb aktiv | offen |  |
| Backup-Routine eingerichtet | offen |  |
| Restore-Probe erfolgreich dokumentiert | offen |  |
| Monitoring/Alerting geregelt | offen |  |
| Finale Abnahme unterschrieben | offen |  |

## Offene Pilotpunkte mit fachlicher Entscheidung

| Punkt | Prioritaet | Empfehlung |
| --- | --- | --- |
| Stammdaten loeschen | mittel | Nicht vor Go-Live erzwingen; wegen Historie/Referenzen besser zuerst fachliches Loesch-/Archivkonzept definieren. |
| Raeume direkt in Gebaeudeverwaltung zuordnen | niedrig/mittel | Spaeter pruefen. Aktuell ist die eindeutige Raum-Gebaeude-Zuordnung in der Raumverwaltung klarer. |
| Rollen/Rechte bearbeiten | mittel | Vor Go-Live nur, wenn Verwaltung diese Pflege selbst machen soll. Sonst Seed-/Adminpflege beibehalten. |
| Semester-Vorauswahl fuer Serien | mittel | Sinnvoller Komfortpunkt, aber kein Go-Live-Blocker, solange Serien manuell anlegbar sind. |
| Oesterreichische Ferien je Bundesland vordefinieren | mittel | Fuer St. Valentin fachlich sinnvoll. Falls Serien stark genutzt werden, vor breitem Rollout priorisieren. |
| Google-Kalender-Feinschliff | niedrig/mittel | Aktuelle Kalenderansicht ist nutzbar; Feinschliff nach realem Pilotfeedback priorisieren. |
| PDF-Layout finalisieren | niedrig | Aktuelle PDFs sind funktional, Design kann nach Abnahme verbessert werden. |

## Nicht Teil von Version 1

- automatische Rechnungslegung
- Zahlungsabwicklung
- SMS oder Push
- externe Reporting-Server
- echte Dateiablage fuer Uploads
- Integration in Schliesssysteme
- automatische Sanktionen bei No-Shows
- Termin-Tauschlogik als vollstaendiger Endnutzerprozess

## Empfehlung fuer Go-Live

Go-Live erst freigeben, wenn:

- alle Muss-Punkte entschieden sind,
- keine offenen Punkte mit Prioritaet hoch verbleiben,
- die Abnahmetests aus `docs/acceptance-testplan.md` dokumentiert sind,
- die Produktions-Readiness-Checkliste aus `docs/production-readiness.md`
  in der Zielumgebung abgearbeitet wurde.
