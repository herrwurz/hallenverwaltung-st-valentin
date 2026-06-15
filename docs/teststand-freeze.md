# Teststand-Freeze

Dieser Freeze beschreibt den Stand, der als testbarer Echstand fuer die
Gemeinde bereitgestellt werden soll. Er ist kein Produktiv-Go-Live, sondern
eine stabile fachliche Testbasis fuer Durchklicktests, Abnahmefeedback und
gezielte Restkorrekturen.

## Ziel

- Die wichtigsten Version-1-Funktionen sind lokal testbar.
- Neue Komfort- oder Wunschfunktionen werden bis zum Abschluss des
  Durchklicktests nicht mehr spontan vorgezogen.
- Korrekturen werden nur noch vorgenommen, wenn sie den Teststand blockieren,
  Datenintegritaet betreffen oder eine zentrale Bedienung unplausibel machen.
- Produktivthemen wie Gemeinde-Server, TLS, echte Backups, Monitoring und
  echte SMTP-Nachweise bleiben im Go-Live-Runbook.

## Enthaltener Funktionsumfang

### Verwaltungsportal

- Login, Rollen und Rechte mit serverseitiger Pruefung.
- Stammdaten fuer Gebaeude, Raeume, Organisationen, Benutzer und Rollen.
- Gebaeude- und Raumsperren.
- Buchungsantraege mit Genehmigung, Ablehnung, Storno und Statushistorie.
- Serienbuchungen als wiederkehrende Einzelantraege.
- Warteliste mit Angebot, Frist, Annahme, Ablehnung und Ablauf.
- Kalenderansichten fuer Verwaltung, Portal und Oeffentlichkeit.
- Benachrichtigungen mit Benachrichtigungs-Queue, SMTP-Status, Event-Schaltern und Testmail.
  SMTP-Status und Testmail liegen unter `/admin/settings/mail`, die
  Event-Schalter unter `/admin/settings/notifications`, die operative Benachrichtigungs-Queue
  unter `/admin/notifications`.
- Ferien-/Feiertagsverwaltung mit Vorlagen fuer Oesterreich und
  Niederoesterreich.
- No-Shows, Hallenuebergaben, Dokumentmetadaten und Schadensmeldungen.
- Abrechnungsvorbereitung mit CSV-, XLSX- und PDF-Exporten.
- System-Jobs fuer Benachrichtigungen und Wartelistenablauf.

### Vereinsportal

- Eigene Buchungsantraege anzeigen und anlegen.
- Serienbuchungen mit Tages-, Wochen-, Monats- und Jahresmustern.
- Semester-/Saison-Vorauswahl fuer Serien-Enddatum.
- Eigene Wartelisteneintraege anzeigen und Angebote annehmen oder ablehnen.
- Eigener Kalender mit eingeschraenkten Fremddetails.
- Dokumente und Schadensmeldungen als vorbereitete Version-1-Funktionen.

### Öffentlicher Bereich

- Oeffentliche Start-/Informationsansicht.
- Datenschutzkonformer Kalender.
- Freie Zeiten.
- iCal-Export.

### Betrieb lokal

- Lokaler Komfortstart ueber `start-test-deployment.bat`.
- Migration, Seed, Demo-Seed, Build und lokaler Testserver ueber
  `npm run start`.
- Manueller Worker-Lauf ueber Admin-Seite oder `npm run worker:run`.

## Bewusst nicht Teil dieses Teststands

- Automatische Rechnungslegung oder Zahlungsabwicklung.
- SMS, Push oder Newsletter-Versand.
- Premium-Kalenderkomponenten oder lizenzpflichtige Resource-Timeline.
- Integration in Schliesssysteme.
- Mandantenfaehigkeit.
- Finales Produktivhosting auf Gemeinde-Server.
- all-inkl.com-Testserver, solange Node.js-, PostgreSQL-, Worker- und
  Prozessbetrieb dort nicht verbindlich geklaert sind.
- Finale PDF-Pixelperfektion.
- Echte Dateiablage fuer Uploads; Dokumente werden weiter ueber Metadaten und
  `storageKey` vorbereitet.

## Blocker-Regel ab Freeze

Ein Punkt blockiert den Teststand nur, wenn mindestens eine der folgenden
Bedingungen zutrifft:

- Login, Rechte oder Sessionvalidierung verhindern zentrale Testrollen.
- Buchungen, Serien, Genehmigung, Warteliste oder Kalender liefern fachlich
  falsche Kernentscheidungen.
- Daten koennen inkonsistent gespeichert werden.
- Eine zentrale Seite laedt nicht oder stuerzt bei normaler Bedienung ab.
- Mailqueue oder Worker koennen nicht kontrolliert getestet werden.
- Demo-Daten oder Filter erzeugen fachlich falsche Testwahrnehmung.

Nicht blockierend fuer diesen Freeze:

- reine Optikfeinheiten ohne Bedienblockade,
- Wunschkomfort wie Drag-and-drop,
- finale Drucklayouts,
- Produktiv-Infrastruktur,
- optionale spaetere Erweiterungen.

## Durchklick-Reihenfolge

1. Lokalen Teststand mit `start-test-deployment.bat` starten.
2. Oeffentlichen Bereich oeffnen: `/public`.
3. Als Admin anmelden und Stammdaten pruefen:
   `/admin/buildings`, `/admin/rooms`, `/admin/organizations`,
   `/admin/users`, `/admin/roles`.
4. Als Verein anmelden und Einzelbuchung anlegen.
5. Als Verein Serienbuchung mit Tages-, Wochen-, Monats- und Jahresmuster
   testen.
6. Als Admin Buchungsantraege filtern, genehmigen und ablehnen.
7. Kalender in Admin, Portal und Public pruefen.
8. Warteliste anlegen, Angebot ausloesen, annehmen und ablehnen.
9. Benachrichtigungen pruefen:
   SMTP-Status/Testmail, Event-Schalter und Benachrichtigungs-Queue.
10. System-Jobs manuell ausfuehren.
11. Abrechnungsvorbereitung und Export stichprobenartig pruefen.
12. Hallenwart-Workflows fuer Handover und No-Show stichprobenartig pruefen.

Der detaillierte Ablauf steht in `docs/pilot-testplan.md` und
`docs/acceptance-testplan.md`.

## Testdaten und Logins

Die lokalen Demo-Zugaenge stehen in `docs/pilot-testplan.md`. Sie sind nur
fuer lokale Tests und Testserver gedacht. Fuer echte Produktivumgebungen
muessen Demo-Zugaenge ausgeschlossen und ein produktiver Initialbenutzer
angelegt werden.

## Bekannte Umgebungsrisiken

- Im OneDrive-Pfad koennen `.next`- und Prisma-DLL-Dateisperren auftreten.
  Fuer stabile Builds und Klicktests ist ein lokaler Pfad wie
  `C:\Projekte\hallenverwaltung-st-valentin` robuster.
- Die bekannte Next/SWC-Warnung ist nur dann blockierend, wenn der Build mit
  Fehlercode endet oder der Testserver nicht startet.
- Echte SMTP-Zustellung muss gegen den spaeteren Mailserver separat
  nachgewiesen werden.
- all-inkl.com bleibt ein offener Hosting-Klaerungspunkt und ist nicht
  Voraussetzung fuer den lokalen Echstand-Test.

## Ergebnisbewertung

Nach dem Durchklicktest werden Befunde in drei Gruppen eingeteilt:

- Blocker: vor Weitergabe oder Abnahme beheben.
- Wichtig: vor breiterem Pilot beheben, sofern Aufwand und Risiko passen.
- Spaeter: fuer Version 1 optional oder nach Go-Live einplanen.

Ab diesem Freeze gilt: erst Blocker stabilisieren, dann bewusst entscheiden,
welche wichtigen Punkte vor dem naechsten Deployment wirklich noch notwendig
sind.
