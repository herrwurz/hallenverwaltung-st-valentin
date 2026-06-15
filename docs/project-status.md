# Project Status – Hallenverwaltung St. Valentin

## Projektübersicht

Webbasierte Hallenverwaltungssoftware für die Stadt St. Valentin.

Die Anwendung besteht aus:

* Verwaltungsportal (/admin)
* Vereinsportal (/portal)
* Öffentlicher Bereich (/public)

Technologie:

* Next.js
* TypeScript
* PostgreSQL
* Prisma ORM
* Auth.js
* Tailwind CSS
* Docker

Architekturprinzip:

* Businesslogik ausschließlich in Services
* Prisma als einzige Datenzugriffsschicht
* serverseitige Rechteprüfung
* append-only Historisierung kritischer Vorgänge
* Single-Tenant-System für St. Valentin

---

# Abgeschlossene Phasen

## Phase 1

Projektsetup

## Phase 2

Prisma-Datenmodell und Seed-Daten

## Phase 3

Auth.js und RBAC

## Phase 3.5

Architektur-Härtung

## Phase 4

Stammdatenverwaltung

## Phase 4.5

Sicherheits- und Integritätskorrekturen

## Phase 5

Buchungssystem-Basis

## Phase 5.5

Booking Hardening

## Phase 6

Genehmigungsworkflow

## Phase 6.5

Konkurrenzkontrolle für Genehmigungen

## Phase 7

Warteliste

## Phase 7.5

Waitlist Hardening

## Phase 8

Kalenderansichten

## Phase 8.5

Kalender-Härtung und Datenschutzeinstellungen

## Phase 9

Benachrichtigungen und Mailversand

## Phase 9.5

Notification Hardening

## Phase 10

Abrechnungsvorbereitung

## Phase 10.1

Billing Hardening

## Phase 10.5

Export & Reporting

## Phase 11

Oeffentliche Ansicht

## Phase 12

Scheduler / Worker

## Phase 13

Deployment & Backup

## Phase 14

E2E-Tests

## Phase 15

Verschiebungen & Tauschanträge

## Phase 16

Dokumentenmanagement und Schadensmeldungen

## Phase 16.5

Dokumenten- und Schadens-Haertung

## Phase 17

Serienbuchungen und Ferien-/Ausnahmelogik

## Phase 18

No-Show- und Hallenwart-Workflows

## Phase 19.1

Caretaker-User-Haertung

## Phase 19.2

Hallenuebergabe-Basis

## Phase 19.3

Zutrittsverwaltung-Basis

## Phase 20

Pilot-Test und Demo-Readiness

## Phase 21.1

Kritische Pilotkorrekturen aus Erstfeedback: raumabhaengige Gebaeudeauswahl,
Admin-Buchungsstatusfilter und klarer Wartelistenstatus im Portal.

## Phase 21.2

UI-/UX-Grundhaertung aus Pilotfeedback: Statusfilter als Comboboxen,
Abbrechen-Aktionen in zentralen Formularen und fehlende Zurueck-Navigation im
Portal.

## Phase 21.3

Kalender-UX aus Pilotfeedback: Tages-, Wochen-, Monats- und Jahresansicht mit
rasterbasierter, Google-Kalender-aehnlicher Darstellung ohne neue
Buchungslogik.

## Phase 21.4-21.6

Zusammengefasste UI-Politur aus Pilotfeedback: Kalender-Termin-Details als
Dialog, sichtbare Umlautkorrekturen in den beruehrten Kalenderflaechen und ein
konservativer Verwaltungsstil mit eckigeren, sachlicheren Kalender-Elementen.

## Phase 21.8

UTF-8-/Text-Härtung für sichtbare App-, Service- und Testtexte: zentrale
deutsche Umlaute in Portal, Verwaltung, Public-Bereich, Statuslabels und
Fehlermeldungen wurden auf echte UTF-8-Zeichen umgestellt. Der lokale Dev-Start
wurde erneut geprüft; in der Codex-Umgebung bleibt eine Next/SWC-Lockfile-
Warnung mit Netzwerk-/EACCES-Abbruch bestehen, während der Produktionsbuild
weiterhin erfolgreich läuft.

## Phase 22.1

UI-Konventionen fuer Portalformulare: Organisationsauswahl wird bei genau einer
aktiven Organisation automatisch als verstecktes Feld gesetzt. Die sichtbare
Auswahl bleibt nur bei mehreren Organisationen erhalten. Zentrale
Formularaktionen verwenden explizite Submit-Buttons.

## Phase 22.2

UI-Konventionen fuer zentrale Admin-Stammdatenformulare: Gebaeude, Raeume,
Organisationen und Benutzer verwenden einheitliche Formularaktionen mit
Speichern und Abbrechen statt handgebauter Einzelbuttons.

## Phase 22.3

UI-Konventionen fuer Kern-Verwaltungsseiten: Gebaeude, Raeume, Organisationen,
Benutzer und Rollen/Rechte verwenden einen gemeinsamen Ruecklink zum
Admin-Dashboard.

## Phase 22.4

Produktions-Readiness-Abschluss: Betriebscheckliste fuer Zielumgebung,
Produktionskonfiguration, Initialbenutzer, SMTP, Worker, Backup/Restore-Probe
und Smoke-Tests wurde in `docs/production-readiness.md` dokumentiert. README
verweist auf diese Checkliste und fuehrt den Projektstand als Phase 22.

## Phase 23.1

Abnahme- und Go-Live-Vorbereitung: Abnahmetestplan, Kurzanleitung fuer
Verwaltung, Kurzanleitung fuer Vereine und Go-Live-Entscheidungsliste wurden
unter `docs/` ergaenzt. README verweist auf die neuen Abnahmedokumente.

## Phase 23.2

Go-Live-Review-Schaerfung fuer priorisierte Punkte: Hoch-Blocker wurden in
`docs/go-live-open-points.md` als echte Produktivstart-Blocker mit
Nachweisspalten dokumentiert. Mittlere Pilotpunkte wie Stammdaten-Loeschkonzept
und Ferien-/Semesterlogik wurden als bewusste Fachentscheidungen vor einem
breiteren Pilot eingeordnet.

## Phase 23.3

Go-Live-Runbook: Die Hoch-Blocker wurden in `docs/go-live-runbook.md` in eine
operative Schrittfolge mit Befehlen, Nachweisen, Stop-Kriterien und
Rollback-Hinweisen ueberfuehrt. README, Produktions-Readiness und
Go-Live-Entscheidungsliste verweisen auf das Runbook.

## Phase 23.4

Go-Live-Nachweisprotokoll: `docs/go-live-evidence.md` wurde als ausfuellbare
Vorlage fuer echte Zielumgebungsnachweise, Risikoakzeptanzen, mittlere
Pilotentscheidungen und finale Freigabe ergaenzt. Runbook, Abnahmeplan,
README und Readiness-Dokumente verweisen darauf.

## Phase 23.5

Produktionskonfigurationscheck: `npm run production:check` prueft
`.env.production` auf fehlende Pflichtwerte, Platzhalter, unsichere
Basiswerte und optional fehlende TLS-Dateien, ohne Secret-Werte auszugeben.
Runbook, Readiness, README und Nachweisprotokoll verweisen auf den Check.

## Phase 23.6

Flexible Installationsoptionen: `docs/installation-options.md` dokumentiert
lokalen Teststand, eigenen Testserver und spaeteren Gemeinde-Server als
getrennte Betriebsstufen. Der Gemeinde-Server bleibt als finaler
Go-Live-Blocker offen; lokale Tests und ein eigener Testserver koennen als
Vorbereitung weiterlaufen.

## Phase 24.1

UI-Style-Basis vor Deployment: `docs/ui-style-guide.md` dokumentiert die
Windows-/Desktop-Anmutung. AdminShell, AreaShell, globale Surface-Regeln und
FormActions wurden auf helle, eckigere Verwaltungsoberflaechen umgestellt. Der
Kalender bleibt funktional Google-Kalender-aehnlich, waehrend die restlichen
Bereiche sachlicher und konsistenter wirken.

## Phase 24.2

Kalenderbedienung sichtbarer gemacht: Tages-/Wochen-/Monats-/Jahresansicht
haben eine gemeinsame Heute-/Zurueck-/Weiter-Navigation. Der Admin-Zurueck-Link
ist nun als sichtbarer heller Windows-Button gestaltet.

## Phase 24.3

Feedback-Meldungen vereinheitlicht: `components/app-feedback.tsx` stellt helle
Erfolgs-, Fehler-, Hinweis- und Informationsmeldungen bereit. Portal-Buchungen,
Warteliste, Dokumente und Schadensmeldungen sowie Admin-Stammdaten nutzen diese
Basis.

## Phase 24.4

Admin-Buchungsworkflow-Meldungen ebenfalls auf `AppFeedback` umgestellt. Damit
ist der offene UI-Restpunkt aus Phase 24.3 erledigt.

## Phase 24.5

Zurueck-Navigation weiter vereinheitlicht: Portal-Buchungen, Warteliste,
Dokumente, Schadensmeldungen sowie Admin-Warteliste, Benachrichtigungen,
System-Jobs, Abrechnung und Kalender-Einstellungen verwenden nun
`AppBackLink` statt dunkler Textlinks.

## Phase 24.6

Vorbereitung auf das Test-Deployment: zentrale Windows-Shell-Regeln wurden fuer
alte Dark-Theme-Statusflaechen erweitert, Statusfilter und Abmeldebutton sind
helle Verwaltungs-Controls, und Start-/Berechtigungsseite wirken nicht mehr wie
ein Phase-1-Prototyp.

## Phase 24.7

Lokaler Klicktest vorbereitet: `.env` kann lokal mit der PostgreSQL-Testdatenbank
auf Port 55435 genutzt werden, Migrationen, Stammdaten und Demo-Daten wurden
eingespielt, und `scripts/start-local-standalone.ps1` startet die stabile
Standalone-Variante fuer `http://localhost:3000`. Der angedachte Testserver auf
all-inkl.com ist als technische Hosting-Klaerung dokumentiert.

## Phase 25

UI-Neuaufbau mit shadcn/ui als generellem Komponentenstandard umgesetzt und
weiter gehaertet. Zentrale Stammdaten-, Buchungs-, Benachrichtigungs-,
Abrechnungs-, Dokument-, Ferien-, Serien- und Betriebslisten nutzen nun
shadcn/ui Cards, Buttons, Badges und DataTable-/Table-Patterns. Tabellen ohne
eingebettete Server-Action-Zellen verwenden TanStack-basierte DataTables mit
Filter, Sortierung und Pagination. Tabellen mit Server-Action-Formularen
bleiben bewusst serverseitige shadcn/ui Tables, um Mutations- und
Berechtigungslogik nicht in fragile Client-Zellen zu verschieben.

Der Kalender nutzt ein eigenes shadcn/Tailwind-Ressourcenraster fuer Tages-
und Wochenansicht mit Raeumen als Spalten, 30-Minuten-Zeitslots und
Status-Badges. Termin-Details werden ueber eine Radix/shadcn-Dialogkomponente
angezeigt. FullCalendar Resource Timeline bleibt nur nach Lizenzklaerung eine
Option.

## Phase 29

Mailbenachrichtigungen wurden fuer zentrale Ereignisse erweitert:
Buchungsantrag, in Pruefung, Genehmigung, Ablehnung, Storno,
Serienzusammenfassungen, Verschiebungsantraege, Wartelistenangebote und
Ablauf, Sperren, Benutzerkonto-Anlage/-Deaktivierung und
Organisationssperren. Testmail und Empfaenger-Vorschau stehen im
Verwaltungsportal zur Verfuegung.

## Phase 30

Ferien-/Feiertagsvorlagen fuer Oesterreich und Niederoesterreich sowie
Semester-/Saison-Kurzbefuellung fuer Serienbuchungen wurden umgesetzt.

## Phase 31

Rollen/Rechte sind in der Verwaltung nicht mehr nur lesbar: Rolle-Rechte-
Zuordnungen koennen serverseitig geschuetzt bearbeitet werden. SUPER_ADMIN
bleibt besonders abgesichert und muss alle Rechte behalten.

## Phase 32

Teststand-Freeze fuer den naechsten Echstand-Durchklicktest. Der verbindliche
Umfang, bewusste Nicht-Ziele, Blocker-Regeln und die Durchklick-Reihenfolge
stehen in `docs/teststand-freeze.md`.

## Phase 34

Ausfuehrlicher Klicktest vom 12.06.2026 wurde als priorisierte Arbeitsliste
unter `docs/phase-34-teststand-befunde.md` dokumentiert. Hohe Prioritaet haben
Login/Auth, Ganztagssperren, Public-Deaktivierung, Gebaeude-/Raum-Sperren,
Admin-Buchungsfilter und fachlich abgesicherte Ausnahmegenehmigungen.

## Phase 35

Kalenderstabilisierung fuer den Teststand: Die Admin-, Portal- und Public-
Kalenderansichten verwenden FullCalendar Community mit Tages-, Wochen-,
Monats- und Jahresansicht. FullCalendar Resource Timeline bleibt wegen
Premium-Lizenzklaerung weiterhin ausgeschlossen. Die Admin-Navigation wurde in
Dashboard/Kalender sowie die Gruppen Stammdaten, Buchungen, Extras und
Einstellungen verschlankt. Der lokale Teststand wurde fuer Build-/Static-
Asset-Auslieferung nachgeschaerft.

## Phase 36

Systemeinstellungen wurden fachlich getrennt: `/admin/settings` ist die
Uebersicht, `/admin/settings/mail` zeigt SMTP-Status und Testmail, ohne
Passwoerter oder Secrets in der Datenbank zu speichern, und
`/admin/settings/notifications` verwaltet die Notification-Event-Schalter als
`SystemSetting`. `/admin/notifications` ist wieder primaer die operative
Benachrichtigungs-Queue mit Verarbeitung und Retry.

## Phase 37

Pilot- und Teststand-Reife: Der lokale Komfortstart wurde auf die zuletzt
stabile Variante gehaertet. `start-test-deployment.bat` erkennt einen bereits
laufenden Testserver, prueft/started die lokale PostgreSQL-Testdatenbank,
normalisiert bekannte OneDrive-/Windows-Dateiattribute fuer `.next`, baut die
Anwendung und startet den Testserver ueber `npm run start`. Die Readiness-
Pruefung wartet bewusst auf `/login`. Pilot-Testplan, Teststand-Freeze und
Produktions-Readiness verweisen nun konsistent auf `/admin/settings/mail`,
`/admin/settings/notifications` und die operative Benachrichtigungs-Queue unter
`/admin/notifications`.

## Phase 38

Pilot-Oberflaechen-Feinschliff vor Uebergabe: Sichtbare Resttexte in zentralen
Durchklickflaechen wurden geglaettet. Admin-Dashboard, Admin-Buchungsfilter,
Public-Einstieg, Ferienlogik, Kalendereinstellungen, System-Jobs und
Benachrichtigungen verwenden konsistent deutsche Begriffe mit echten Umlauten.
Die technische Bezeichnung `Notification Queue` wurde in der Oberflaeche durch
`Benachrichtigungs-Queue` ersetzt. Laufzeitlogs des lokalen Testservers sind
als Artefakte in `.gitignore` eingetragen.

## Pilotfix Kalender, Branding und Raumdefaults

Die Kalendernavigation wurde vereinheitlicht: Zurueck, Heute, Weiter sowie
Tag/Woche/Monat/Jahr liegen im Kalenderfilter; der FullCalendar-Kopf zeigt
keine konkurrierenden Navigations- oder Ansichtsbuttons mehr. Die Admin-
Sidebar verwendet das Gemeindelogo aus `public/brand/` auf weissem Hintergrund
und zeigt darunter `Hallenverwaltung`. Das Dashboard wurde fuer den Pilot auf
Stammdaten, Buchungen und Kalender reduziert. Raeume verwenden fuer neue und
geseedete Testdaten 0-Minuten-Puffer sowie ganztags geoeffnete Standardzeiten
`00:00` bis `23:59`.

---

# Wichtigste Architekturentscheidungen

## Single-Tenant

Version 1 ist bewusst Single-Tenant für St. Valentin.

Mandantenfähigkeit wurde nicht umgesetzt, aber spätere Erweiterbarkeit soll nicht absichtlich verhindert werden.

---

## Service-Architektur

* Keine Fachlogik in React-Komponenten
* Keine Fachlogik in API-Routen
* Alle Workflows laufen über zentrale Services

Beispiele:

* BookingTransitionService
* BookingChangeService
* BookingSeriesService
* NoShowService
* DocumentService
* DamageService
* WaitlistService
* NotificationService
* BillingTransitionService
* CalendarService

---

## Historisierung

Kritische Prozesse sind append-only historisiert:

* BookingStatusHistory
* AuditEntry
* Notification-Status
* OrganizationMember-Historie

Buchungen werden niemals physisch gelöscht.

---

## Sicherheitsmodell

Rechteprüfung ausschließlich serverseitig.

Keine sicherheitsrelevanten Entscheidungen im Frontend.

SUPER_ADMIN darf ausschließlich durch SUPER_ADMIN verwaltet werden.

---

## Konkurrenzkontrolle

Genehmigungen und Wartelistenannahmen verwenden PostgreSQL Advisory Locks.

Parent-/Teilraum-Konflikte werden berücksichtigt.

---

## Warteliste

* Reihenfolge nach Eingangszeit
* 48-Stunden-Angebot
* OFFERED -> ACCEPTED erzeugt neuen REQUESTED-Buchungsantrag
* erneute Genehmigung erforderlich

---

## Abrechnung

Version 1:

* keine Rechnungslegung
* keine Zahlungsabwicklung
* BillingEntries als Abrechnungsgrundlage
* CSV/XLSX/PDF-Export vorhanden

---

# Aktuelle Kernservices

## Buchung

* booking-service.ts
* booking-transition-service.ts
* booking-request-service.ts
* booking-conflict-service.ts
* booking-rules.ts
* booking-approval-service.ts

## Warteliste

* waitlist-service.ts

## Kalender

* calendar-service.ts
* calendar-settings-service.ts
* public-service.ts

## Benachrichtigungen

* notification-service.ts
* notification-template-service.ts
* notification-settings-service.ts
* mail-service.ts
* worker-service.ts

Aktueller Umfang:

* persistente Benachrichtigungs-Queue mit Retry-/Backoff-Logik
* SMTP-Versand ueber konfigurierbare `SMTP_*`-Variablen
* Admin-Testmail und Empfaenger-Vorschau unter `/admin/notifications`
* Event-Schalter fuer aktivierbare/deaktivierbare Mailereignisse
* automatische E-Mail-Vorbereitung fuer Buchungsantrag, in Pruefung,
  Genehmigung, Ablehnung, Storno, Serienzusammenfassungen,
  Verschiebungsantraege, Wartelistenangebote und Ablauf, Sperren,
  Benutzerkonto-Anlage/-Deaktivierung sowie Organisationssperren
* Newsletter, SMS und Push bleiben als spaetere Kanaele bewusst ausserhalb
  von Version 1

## Abrechnung

* billing-service.ts
* billing-transition-service.ts
* reporting-service.ts
* export-service.ts

## Administration

* building-service.ts
* room-service.ts
* organization-service.ts
* user-service.ts
* role-service.ts

---

# Aktuelle Rollen und Rechte

## Rollen

* SUPER_ADMIN
* MUNICIPAL_ADMIN
* FACILITY_MANAGER
* CARETAKER
* ORGANIZATION
* VHS
* SCHOOL
* PUBLIC_USER

---

## Wichtige Rechte

* REQUEST_BOOKING
* VIEW_BOOKINGS
* APPROVE_BOOKING
* REJECT_BOOKING
* MANAGE_USERS
* BILLING_EXPORT
* CREATE_EXPORTS
* MANAGE_SYSTEM_JOBS
* BLOCK_ROOM
* REPORT_NO_SHOW

---

# Wichtige offene Punkte

## Noch nicht umgesetzt

### Verschiebungen & Tauschanträge

* Verschiebungsanträge im Portal sind umgesetzt.
* Verwaltungsprüfung unter /admin/booking-changes ist umgesetzt.
* Genehmigung legt Ersatztermin an und setzt Ausgangsbuchung auf MOVED.
* Mailereignisse fuer beantragt, in Pruefung, genehmigt und abgelehnt sind
  vorbereitet.
* Tauschanträge sind strukturell vorbereitet, aber noch nicht vollständig
  umgesetzt.

### Serienbuchungen erweitert

* woechentliche Serienantraege erzeugen einzelne REQUESTED-Buchungen
* Ferien-/Feiertagszeitraeume sind administrierbar
* CLOSED-Zeitraeume werden uebersprungen
* RESTRICTED-Zeitraeume erzeugen Hinweise
* einzelne Ausnahmedaten koennen bei Serienanlage angegeben werden
* Saison-/Semesterlogik ist als Komfortauswahl fuer aktuelles Semester,
  Schuljahr/Saison bis 30. Juni und Kalenderjahr umgesetzt
* Oesterreichische Feiertage und Niederoesterreich-Schulferien koennen in der
  Ferienverwaltung als Vorlagen importiert werden
* Blockbuchungen bleiben offen, bis die Fachregel eindeutig spezifiziert ist

### Dokumentenmanagement

* Dokumente werden als Metadaten mit Storage-Key erfasst
* Storage-Key wird serverseitig erzeugt und DB-seitig gibt es genau eine Zielzuordnung
* echter Datei-Upload/Storage ist vorbereitet, aber noch nicht angebunden

### Schadensmanagement

* Portal-Schadensmeldungen mit optionalem Foto-Storage-Key
* Admin-Statusbearbeitung fuer gemeldet, in Bearbeitung und erledigt
* Statuswechsel werden auditiert, neue Meldungen koennen `DAMAGE_REPORTED` benachrichtigen

### No-Show-Management

* No-Shows koennen fuer genehmigte, beendete Buchungen gemeldet werden
* Hallenwarte duerfen nur zugeordnete Raeume/Gebaeude melden
* Zuordnung erfolgt primaer ueber `Caretaker.userId`, mit E-Mail-Fallback fuer
  vorhandene Stammdaten
* Verwaltung kann Meldungen zur Kenntnis nehmen
* keine Sanktionen, keine automatische Abrechnung, keine Buchungsstatusaenderung

### Hallenuebergaben

* `Handover` protokolliert Schluesselerhalt, Hallenuebernahme und Retournierung
* Schritte laufen vorwaertsgerichtet und werden auditiert
* Recht `MANAGE_HANDOVERS`, mit Hallenwart-Zuordnung ueber `Caretaker.userId`
  und E-Mail-Fallback ohne `VIEW_BOOKINGS`
* keine automatische Buchungsstatusaenderung und keine Abrechnungsfolge

### Zutrittsverwaltung

* `AccessMedium` verwaltet Schluessel, RFID-Karten und elektronische Zutritte
* `AccessAssignment` protokolliert Ausgabe und Rueckgabe
* pro Medium ist nur eine aktive Ausgabe ohne `returnedAt` erlaubt
* Recht `MANAGE_ACCESS`, Audit fuer Anlage, Ausgabe, Rueckgabe und Deaktivierung
* keine Integration in externe Schliess- oder Tuerkontrollsysteme

### E2E-Ausbau

* vollstaendiger Genehmigungsworkflow
* Wartelistenannahme und Ablauf im Browser
* Kalenderfilter im Browser
* Exportdownloads im Browser

### Pilot-Test

* Demo-Seed erstellt lokale Testbenutzer fuer Gemeinde/Admin, Verein und
  Hallenwart
* `docs/pilot-testplan.md` beschreibt manuelle Smoke-Tests fuer reale
  Oberflaechenpruefung
* lokale Produktansicht ist nach Migration, Seed, Demo-Seed und `npm run dev`
  direkt unter `http://localhost:3000` moeglich

---

# Aktuelle Pilot-Hotfixes

## Phase 26.3

Der Genehmigungsworkflow wurde fuer die Verwaltung vereinfacht:

* `REQUESTED -> APPROVED` ist erlaubt.
* `REQUESTED -> REJECTED` ist erlaubt.
* `IN_REVIEW` bleibt als optionaler Zwischenstatus bestehen, wenn ein Antrag
  intern vorgemerkt oder zur Pruefung uebernommen werden soll.

---

# Aktuelle Produktionsrisiken

## Worker-Betrieb muss produktiv aktiviert bleiben

Der Worker ist in der Production-Compose-Konfiguration vorbereitet und kann
alternativ per Cron gestartet werden.

Ohne aktivierten Worker-Dienst laufen Benachrichtigungs-Queue und Wartelistenabläufe
nicht automatisch.

---

## Kein vollständiger SMTP-Integrationstest

Mailversand wurde service-seitig getestet. Unter `/admin/notifications` gibt
es eine Testmail-Funktion, der echte Nachweis gegen den produktiven SMTP-Server
bleibt aber ein Go-Live-Blocker.

---

## E2E-Abdeckung noch nicht vollstaendig

Es existieren erste Playwright-Smoke-Tests. Vollstaendige Browserflows fuer
Genehmigungsworkflow, Warteliste, Kalenderfilter und Exportdownloads fehlen
noch.

---

## Deployment noch nicht real ausgerollt

Produktionsnahe Docker-, HTTPS-Reverse-Proxy-, Backup- und Restore-Grundlagen
sind vorbereitet und in `docs/production-readiness.md` als Checkliste
dokumentiert. Zertifikate, Server-Hardening, Monitoring und echte Restore-
Proben muessen in der Zielumgebung noch durchgefuehrt werden.

---

## Export-PDFs bewusst einfach

PDFs sind funktional, aber keine finalen Design-/Layoutreports.

---

# Empfohlene nächste Phasen

## Aktuelle Pilot-Hotfixes / Phase 26.4

Bearbeitet wurden die sofort sichtbaren Befunde aus `png/befundliste.txt`:

* Admin-Dashboard-Kacheln bleiben reine, zentrierte Navigationsbuttons.
* Buchungsstatus-Badges in der Admin-Detailansicht sind als stabile Inline-
  Badges ausgerichtet.
* Gebäude-Codes sind beim Bearbeiten read-only und werden service-seitig nicht
  mehr überschrieben.
* Gebäude werden in der Verwaltung aktiv vor inaktiv sortiert.
* Räume werden nach Aktiv, Eingeschränkt, Außer Betrieb sortiert.
* Organisationstypen wie Katastrophenschutz/E2E werden in der Auswahl nicht
  mehr angeboten.
* Nutzungstyp `CLUB_TRAINING` wird als `Training` geseedet.
* Einstellungsnahe Admin-Navigation ist deutlicher gekennzeichnet.

Bewusst offen bleiben größere Folgeblöcke:

* echte Google-Kalender-artige Ressourcenansicht
* Serienbuchungsdialog nach den Referenzbildern
* Serien-Gesamtprüfung/Gesamtgenehmigung
* Löschen von Gebäuden/Räumen nur bei fehlenden Abhängigkeiten
* Sperren von Gebäuden/Räumen über Zeitraum oder Ferienauswahl
* Passwort-vergessen-Prozess
* Hallenwart-Zuordnung über Benutzerverwaltung
* Rollen-/Rechte-Zuordnung als bearbeitbare Oberfläche

---

## Aktuelle Pilot-Hotfixes / Phase 26.5

Serienbuchungen wurden nach den Pilot-Referenzbildern erweitert:

* Portal-Serienantrag nutzt einen eigenen Serienmuster-Dialog.
* Unterstützt werden tägliche, wöchentliche, monatliche und jährliche Muster.
* Wöchentliche Serien können mehrere Wochentage enthalten, z. B. Montag und
  Mittwoch für Fußballtraining.
* Monatliche und jährliche Serien unterstützen Tag-des-Monats sowie
  n-ter-Wochentag-Muster.
* Die Maske zeigt eine Vorschau mit maximal 50 Einträgen.
* Serientermine werden weiterhin als normale `REQUESTED`-Einzelbuchungen
  erzeugt und durchlaufen den vorhandenen Genehmigungsworkflow.

Weiterhin offen:

* Serien-Gesamtprüfung/Gesamtgenehmigung in der Verwaltung.
* Nachträgliche Änderung ganzer Serien bleibt bewusst nicht umgesetzt.

---

## Aktuelle Pilot-Hotfixes / Phase 26.6

Review und Haertung der Serienbuchungen nach dem groesseren Serienumbau:

* Vorschau fuer monatliche n-ter-Wochentag-Muster verwendet nun dieselbe Uhrzeit
  wie der erste Serientermin.
* Monats-/Jahresmuster uebernehmen beim Setzen des ersten Beginns sinnvolle
  Defaults fuer Tag, Wochentag und Monat.
* Woechentliche Muster markieren initial den Wochentag des ersten Beginns.
* Ungueltige Wochentagswerte werden serverseitig abgelehnt statt still
  ignoriert.
* Grenzfaelle fuer Monatsende und maximal 80 Serientermine sind getestet.

---

## Phase 21

Fachlicher Pilot-Review mit echten Testlaeufen

* manuelle Tests mit Gemeinde/Admin, Verein und Hallenwart
* Fehlerliste aus realer Bedienung priorisieren
* fehlende Pflichtfelder, Texte und Bedienlogik nachschaerfen

## Phase 22

Produktions-Readiness ist dokumentarisch abgeschlossen. Die echte Ausfuehrung
in der Zielumgebung bleibt Teil der Betriebs-/Abnahmevorbereitung.

## Phase 23

Abnahme und Go-Live-Vorbereitung ist dokumentarisch vorbereitet:

* `docs/acceptance-testplan.md`
* `docs/user-guide-admin.md`
* `docs/user-guide-portal.md`
* `docs/go-live-open-points.md`
* `docs/go-live-runbook.md`
* `docs/go-live-evidence.md`
* `docs/installation-options.md`
* `docs/ui-style-guide.md`

Hoch priorisierte Go-Live-Blocker muessen vor Produktivstart erledigt oder
ausdruecklich mit Risikoakzeptanz freigegeben werden. Mittlere Pilotpunkte
werden vor einem breiteren Vereins-Pilot entschieden.

---

# Einstieg für neue Entwickler oder neue Codex-Sessions

Vor jeder neuen Aufgabe lesen:

1. AGENTS.md
2. docs/project-status.md
3. docs/pflichtenheft-v1.0.md
4. docs/erd.md
5. docs/prisma-schema-v1.md

Danach erst Änderungen durchführen.
