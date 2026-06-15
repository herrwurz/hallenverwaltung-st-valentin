# Go-Live-Entscheidungsliste

Diese Liste sammelt Punkte, die vor dem Go-Live bewusst entschieden werden
muessen. Sie basiert auf Pilotfeedback, Produktions-Readiness und dem aktuellen
Version-1-Umfang.

Aktuelle Betriebsentscheidung: Der finale Produktivbetrieb soll spaeter auf
einem Gemeinde-Server erfolgen. Bis dieser bereitsteht, bleiben lokale Tests
und ein eigener Testserver als vorbereitende Betriebsstufen moeglich. Der
angedachte eigene Testserver bei all-inkl.com ist eine gesonderte technische
Klaerung, weil Node.js-, PostgreSQL-, Worker-/Cron- und Prozessbetrieb vom
konkreten Hosting-Tarif abhaengen. Details stehen in
`docs/installation-options.md`.

## Go-Live-Blocker mit Prioritaet hoch

Diese Punkte blockieren einen echten Produktivstart. Sie duerfen nicht nur
"zur Kenntnis" genommen werden, sondern brauchen ein Ergebnis mit Datum und
Verantwortlichem.

Die konkrete Ausfuehrung und die erwarteten Nachweise stehen in
`docs/go-live-runbook.md`.

Das auszufuellende Nachweisprotokoll liegt in `docs/go-live-evidence.md`.

| Blocker | Status | Entscheidung / Nachweis | Verantwortlich | Datum |
| --- | --- | --- | --- | --- |
| Gemeinde-Server, Zielserver und Domain festgelegt | offen | Gemeinde-Server bleibt finaler Zielpunkt; lokaler Teststand ist vorbereitet. Eigener Testserver bei all-inkl.com muss technisch auf Node.js, PostgreSQL, Worker/Cron und Prozessbetrieb geklaert werden. |  |  |
| TLS-Zertifikate vorhanden und eingebunden | offen |  |  |  |
| `.env.production` ohne Platzhalterwerte | offen |  |  |  |
| Produktiver Admin-Initialbenutzer angelegt | offen |  |  |  |
| Demo-Zugaenge in Produktion ausgeschlossen | offen |  |  |  |
| SMTP gegen echten Server getestet | offen | Admin-Testmail unter `/admin/settings/mail` ist vorhanden. Die Queue wird unter `/admin/notifications` kontrolliert. Der Nachweis muss gegen den spaeteren echten SMTP-Server erfolgen. |  |  |
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
| Rollen/Rechte bearbeiten | Umgesetzt: Rolle-Rechte-Zuordnung kann serverseitig geschuetzt bearbeitet werden; SUPER_ADMIN bleibt besonders abgesichert. | erledigt | Codex | 2026-06-10 |
| Semester-Vorauswahl fuer Serien | Umgesetzt fuer aktuelles Semester, Schuljahr/Saison bis 30. Juni und Kalenderjahr. | erledigt | Codex | 2026-06-10 |
| Oesterreichische Ferien je Bundesland vordefinieren | Umgesetzt fuer gesetzliche Feiertage Oesterreich und Schulferien Niederoesterreich als importierbare Admin-Vorlagen. | erledigt | Codex | 2026-06-10 |

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

- Fuer den Erststart koennen Ferien/Feiertage weiterhin manuell gepflegt
  werden.
- Zusaetzlich stehen importierbare Vorlagen fuer gesetzliche Feiertage in
  Oesterreich und Schulferien in Niederoesterreich zur Verfuegung.
- Die Semester-Vorauswahl in der Serienanlage setzt nur das vorhandene
  Enddatum komfortabel vor; die fachliche Ferien-/Feiertagskonfiguration
  bleibt weiterhin massgeblich.

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
