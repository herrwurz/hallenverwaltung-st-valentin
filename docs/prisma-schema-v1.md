# Prisma-Schema V1

## Grundlage und Umfang

Dieses Schema basiert verbindlich auf `docs/pflichtenheft-v1.0.md`.
Es stellt die relationale Grundlage fuer die spaetere Webanwendung bereit.
Phase 2 umfasst keine UI, keine Kalenderdarstellung, keine Buchungslogik und
keine Auth.js-Implementierung.

## Modelle

| Bereich | Modelle | Zweck |
| --- | --- | --- |
| Berechtigungen | `Role`, `Permission`, `RolePermission`, `User`, `UserRole`, `UserPermission` | Rollen plus ergaenzende Einzelrechte |
| Organisationen | `OrganizationType`, `Organization`, `OrganizationContact` | Buchungsberechtigte Organisationen, Sperrstatus und Ansprechpartner |
| Hallen | `Building`, `Room`, `RoomComposition`, `Caretaker`, `BuildingCaretaker`, `RoomCaretaker` | Gebaeude, kombinierbare Raeume und Betreuung |
| Nutzung | `UsageType`, `BookingSeries`, `Booking`, `WaitlistEntry`, `HolidayPeriod`, `Closure` | Datenbasis fuer Prioritaet, Antraege, Warteliste und Sperren |
| Abrechnung | `TariffGroup`, `Tariff`, `BillingEntry` | Flexible Preis- und Abrechnungsgrundlage |
| Erweiterungen | `Document`, `DamageReport`, `Handover`, `AccessMedium`, `AccessAssignment`, `Notification`, `AuditEntry`, `SystemSetting` | Im Pflichtenheft geforderte Erweiterbarkeit und Nachvollziehbarkeit |

## Zentrale Enums

| Enum | Werte |
| --- | --- |
| `OrganizationStatus` | `ACTIVE`, `BLOCKED`, `INACTIVE` |
| `RoomStatus` | `ACTIVE`, `RESTRICTED`, `OUT_OF_SERVICE` |
| `BookingStatus` | `REQUESTED`, `APPROVED`, `REJECTED`, `CANCELLED`, `RESCHEDULED` |
| `ClosureStatus` | `OPEN`, `RESTRICTED`, `BLOCKED` |
| `WaitlistStatus` | `WAITING`, `OFFERED`, `ACCEPTED`, `EXPIRED`, `CANCELLED` |
| `BillingStatus` | `NOT_RELEVANT`, `OPEN`, `EXPORTED`, `BILLED`, `CANCELLED` |

## Seed-Umfang

Phase 2 initialisiert:

- acht Rollen aus Abschnitt 18 des Pflichtenhefts;
- Rechte aus der Rollenmatrix und den expliziten Einzelrechtsbeispielen;
- Organisationstypen `Gemeinde`, `Verein`, `VHS`, `Schule`, `Privat`,
  `Extern` und `Katastrophenschutz`;
- Nutzungstypen inklusive der festgelegten Prioritaetsreihenfolge;
- Tarifgruppen als Struktur ohne Tarifbetraege;
- die im Pflichtenheft erkennbare Beispielstruktur `Sporthalle` mit
  `Halle A`, `Halle B`, `Halle C` und `Gesamthalle`;
- `Volksschule Hauptplatz` als weiterer initialer Standort;
- neutrale Hauswart-Platzhalter, bis reale Kontaktdaten geliefert werden.

## Noch nicht Bestandteil dieser Phase

- Keine Buchungen oder Serien als Seed-Daten.
- Keine Preiswerte oder Abrechnungen.
- Keine Login-Accounts oder Authentifizierung.
- Keine Migration gegen eine laufende Produktiv- oder Entwicklungsdatenbank.
