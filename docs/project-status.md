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

* moveBooking() vorbereitet
* keine UI
* kein vollständiger Workflow

### Serienbuchungen erweitert

* Semesterlogik
* Ausnahmen
* Ferienunterbrechungen
* Blockbuchungen

### Dokumentenmanagement

* Uploads
* Verträge
* Hallenordnungen
* Schadensfotos

### Deployment

* Produktions-Docker
* HTTPS
* Reverse Proxy
* Backupstrategie
* Restoretests

### E2E-Tests

* Browserflows
* Genehmigungsworkflow
* Warteliste
* Kalender
* Export

---

# Aktuelle Produktionsrisiken

## Kein Deployment-Scheduler

Der Worker ist vorbereitet, muss im Betrieb aber per Cron, separatem Worker-
Container oder vergleichbarer Infrastruktur gestartet werden.

Ohne diese Betriebsintegration laufen Notification Queue und Wartelistenabläufe
nicht automatisch.

---

## Kein vollständiger SMTP-Integrationstest

Mailversand wurde service-seitig getestet, aber nicht gegen produktiven SMTP-Server.

---

## Keine vollständigen E2E-Tests

Es existieren viele Service-Tests, aber noch keine vollständigen Browser-Workflows.

---

## Kein produktionsfertiges Deployment

HTTPS, Reverse Proxy, Backup und Restore fehlen noch.

---

## Export-PDFs bewusst einfach

PDFs sind funktional, aber keine finalen Design-/Layoutreports.

---

# Empfohlene nächste Phasen

## Phase 13

Deployment & Backup

* Docker Production Setup
* HTTPS
* Reverse Proxy
* Backupstrategie
* Restoretests

## Phase 14

E2E-Tests

* Playwright
* echte Browserflows
* Genehmigungen
* Warteliste
* Kalender
* Export

## Phase 15

Verschiebungen & Tauschanträge

* Terminverschiebungen
* Tauschanträge
* Gegenbuchungen
* Historisierung
* Konfliktprüfung

---

# Einstieg für neue Entwickler oder neue Codex-Sessions

Vor jeder neuen Aufgabe lesen:

1. AGENTS.md
2. docs/project-status.md
3. docs/pflichtenheft-v1.0.md
4. docs/erd.md
5. docs/prisma-schema-v1.md

Danach erst Änderungen durchführen.
