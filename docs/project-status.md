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

---

# Wichtige offene Punkte

## Noch nicht umgesetzt

### Verschiebungen & Tauschanträge

* Verschiebungsanträge im Portal
* Verwaltungsprüfung unter /admin/booking-changes
* Genehmigung legt Ersatztermin an und setzt Ausgangsbuchung auf MOVED
* Tauschanträge strukturell vorbereitet, aber noch nicht vollständig umgesetzt

### Serienbuchungen erweitert

* Semesterlogik
* Ausnahmen
* Ferienunterbrechungen
* Blockbuchungen

### Dokumentenmanagement

* Dokumente werden als Metadaten mit Storage-Key erfasst
* Storage-Key wird serverseitig erzeugt und DB-seitig gibt es genau eine Zielzuordnung
* echter Datei-Upload/Storage ist vorbereitet, aber noch nicht angebunden

### Schadensmanagement

* Portal-Schadensmeldungen mit optionalem Foto-Storage-Key
* Admin-Statusbearbeitung fuer gemeldet, in Bearbeitung und erledigt
* Statuswechsel werden auditiert, neue Meldungen koennen `DAMAGE_REPORTED` benachrichtigen

### E2E-Ausbau

* vollstaendiger Genehmigungsworkflow
* Wartelistenannahme und Ablauf im Browser
* Kalenderfilter im Browser
* Exportdownloads im Browser

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

## Phase 17

Serienbuchungen und Ferien-/Ausnahmelogik

* Serienantraege fuer wiederkehrende Termine
* Ferien- und Feiertagsregeln anwenden
* einzelne Serientermine verschiebbar halten

---

# Einstieg für neue Entwickler oder neue Codex-Sessions

Vor jeder neuen Aufgabe lesen:

1. AGENTS.md
2. docs/project-status.md
3. docs/pflichtenheft-v1.0.md
4. docs/erd.md
5. docs/prisma-schema-v1.md

Danach erst Änderungen durchführen.
