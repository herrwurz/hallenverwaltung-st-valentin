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

* Verschiebungsanträge im Portal
* Verwaltungsprüfung unter /admin/booking-changes
* Genehmigung legt Ersatztermin an und setzt Ausgangsbuchung auf MOVED
* Tauschanträge strukturell vorbereitet, aber noch nicht vollständig umgesetzt

### Serienbuchungen erweitert

* woechentliche Serienantraege erzeugen einzelne REQUESTED-Buchungen
* Ferien-/Feiertagszeitraeume sind administrierbar
* CLOSED-Zeitraeume werden uebersprungen
* RESTRICTED-Zeitraeume erzeugen Hinweise
* einzelne Ausnahmedaten koennen bei Serienanlage angegeben werden
* Saison-/Semesterlogik wird aktuell ueber das Feld "Wiederholen bis"
  abgebildet
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

# Aktuelle Produktionsrisiken

## Worker-Betrieb muss produktiv aktiviert bleiben

Der Worker ist in der Production-Compose-Konfiguration vorbereitet und kann
alternativ per Cron gestartet werden.

Ohne aktivierten Worker-Dienst laufen Notification Queue und Wartelistenabläufe
nicht automatisch.

---

## Kein vollständiger SMTP-Integrationstest

Mailversand wurde service-seitig getestet, aber nicht gegen produktiven SMTP-Server.

---

## E2E-Abdeckung noch nicht vollstaendig

Es existieren erste Playwright-Smoke-Tests. Vollstaendige Browserflows fuer
Genehmigungsworkflow, Warteliste, Kalenderfilter und Exportdownloads fehlen
noch.

---

## Deployment noch nicht real ausgerollt

Produktionsnahe Docker-, HTTPS-Reverse-Proxy-, Backup- und Restore-Grundlagen
sind vorbereitet. Zertifikate, Server-Hardening, Monitoring und echte Restore-
Proben muessen in der Zielumgebung noch durchgefuehrt werden.

---

## Export-PDFs bewusst einfach

PDFs sind funktional, aber keine finalen Design-/Layoutreports.

---

# Empfohlene nächste Phasen

## Phase 21

Fachlicher Pilot-Review mit echten Testlaeufen

* manuelle Tests mit Gemeinde/Admin, Verein und Hallenwart
* Fehlerliste aus realer Bedienung priorisieren
* fehlende Pflichtfelder, Texte und Bedienlogik nachschaerfen

## Phase 22

Produktions-Readiness

* echte Zielumgebung vorbereiten
* HTTPS, SMTP, Backup, Restore-Probe und Worker-Betrieb pruefen
* sichere Initialbenutzer und Betriebsdokumentation

## Phase 23

Abnahme und Go-Live-Vorbereitung

* Abnahmetestplan
* Schulungs-/Kurzanleitung fuer Verwaltung und Vereine
* finale offene Punkte fuer Version 1 entscheiden

---

# Einstieg für neue Entwickler oder neue Codex-Sessions

Vor jeder neuen Aufgabe lesen:

1. AGENTS.md
2. docs/project-status.md
3. docs/pflichtenheft-v1.0.md
4. docs/erd.md
5. docs/prisma-schema-v1.md

Danach erst Änderungen durchführen.
