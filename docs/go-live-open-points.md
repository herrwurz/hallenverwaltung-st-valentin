# Go-Live-Entscheidungsliste

Diese Liste sammelt Punkte, die vor dem Go-Live bewusst entschieden werden
muessen. Sie basiert auf Pilotfeedback, Produktions-Readiness und dem aktuellen
Version-1-Umfang.

## Go-Live-Blocker mit Prioritaet hoch

Diese Punkte blockieren einen echten Produktivstart. Sie duerfen nicht nur
"zur Kenntnis" genommen werden, sondern brauchen ein Ergebnis mit Datum und
Verantwortlichem.

Die konkrete Ausfuehrung und die erwarteten Nachweise stehen in
`docs/go-live-runbook.md`.

Das auszufuellende Nachweisprotokoll liegt in `docs/go-live-evidence.md`.

| Blocker | Status | Entscheidung / Nachweis | Verantwortlich | Datum |
| --- | --- | --- | --- | --- |
| Zielserver und Domain festgelegt | offen |  |  |  |
| TLS-Zertifikate vorhanden und eingebunden | offen |  |  |  |
| `.env.production` ohne Platzhalterwerte | offen |  |  |  |
| Produktiver Admin-Initialbenutzer angelegt | offen |  |  |  |
| Demo-Zugaenge in Produktion ausgeschlossen | offen |  |  |  |
| SMTP gegen echten Server getestet | offen |  |  |  |
| Worker-Betrieb aktiv und protokolliert | offen |  |  |  |
| Backup-Routine eingerichtet | offen |  |  |  |
| Restore-Probe erfolgreich dokumentiert | offen |  |  |  |
| Monitoring/Alerting mindestens organisatorisch geregelt | offen |  |  |  |
| Finale Abnahme unterschrieben | offen |  |  |  |

## Mittlere Punkte vor erweitertem Pilot

Diese Punkte blockieren den ersten technischen Produktivstart nicht zwingend.
Sie sollten aber vor einem breiteren Vereins-Pilot bewusst entschieden werden.

| Punkt | Empfehlung | Entscheidung | Verantwortlich | Datum |
| --- | --- | --- | --- | --- |
| Stammdaten loeschen | Nicht schnell loeschen einbauen. Fuer Version 1 Inaktiv-/Sperrstatus verwenden und danach Loesch-/Archivkonzept spezifizieren. | offen |  |  |
| Rollen/Rechte bearbeiten | Nur vorziehen, wenn die Verwaltung Rollen/Rechte selbst pflegen muss. Sonst Seed-/Adminpflege beibehalten. | offen |  |  |
| Semester-Vorauswahl fuer Serien | Komfortfunktion fuer Vereine. Kein Go-Live-Blocker, solange Serien manuell mit Wiederholen-bis angelegt werden koennen. | offen |  |  |
| Oesterreichische Ferien je Bundesland vordefinieren | Fuer St. Valentin fachlich sinnvoll. Vor breitem Serienbuchungs-Pilot priorisieren, wenn Vereine viele Serientermine erfassen. | offen |  |  |

## Niedrige Punkte nach Version 1

| Punkt | Empfehlung |
| --- | --- |
| Raeume direkt in Gebaeudeverwaltung zuordnen | Spaeter pruefen. Aktuell ist die eindeutige Raum-Gebaeude-Zuordnung in der Raumverwaltung klarer. |
| Google-Kalender-Feinschliff | Aktuelle Kalenderansicht ist nutzbar; Feinschliff nach realem Pilotfeedback priorisieren. |
| PDF-Layout finalisieren | Aktuelle PDFs sind funktional, Design kann nach Abnahme verbessert werden. |

## Fachentscheidung: Stammdaten loeschen

Empfehlung fuer Version 1:

- Keine physische Loeschfunktion fuer fachlich referenzierte Stammdaten vor
  Go-Live ergaenzen.
- Gebaeude, Raeume, Organisationen und Benutzer ueber vorhandene Statusfelder
  deaktivieren, sperren oder inaktiv setzen.
- Ein echtes Loesch-/Archivkonzept erst spezifizieren, wenn klar ist, welche
  historischen Buchungen, Abrechnungen, Dokumente, Schaeden, Handover- und
  No-Show-Daten erhalten bleiben muessen.

Begruendung:

- Buchungen werden niemals physisch geloescht.
- Abrechnung und Historie referenzieren Stammdaten.
- Ein schnelles Loeschen wuerde Datenintegritaet und Nachvollziehbarkeit
  gefaehrden.

## Fachentscheidung: Ferien- und Semesterlogik

Empfehlung:

- Fuer den Erststart koennen Ferien/Feiertage manuell gepflegt werden.
- Vor breitem Serienbuchungs-Pilot sollte entschieden werden, ob
  Niederoesterreich-/Oesterreich-Vorlagen als eigene Phase umgesetzt werden.
- Semester-Vorauswahl fuer Serien ist Komfort, aber kein Ersatz fuer die
  fachliche Ferien-/Feiertagskonfiguration.

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

- alle Hoch-Blocker entschieden und nachgewiesen sind,
- keine offenen Punkte mit Prioritaet hoch verbleiben,
- die Abnahmetests aus `docs/acceptance-testplan.md` dokumentiert sind,
- die Produktions-Readiness-Checkliste aus `docs/production-readiness.md`
  in der Zielumgebung abgearbeitet wurde.
