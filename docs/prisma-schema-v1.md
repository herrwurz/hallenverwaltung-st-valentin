# Prisma-Schema V1

## Grundlage und Umfang

Dieses Schema basiert verbindlich auf `docs/pflichtenheft-v1.0.md`.
Phase 3.5 haertet das relationale Grundmodell fuer die folgenden
Implementierungsphasen. Phase 5 nutzt dieses Modell fuer einzelne
Buchungsantraege mit Statushistorie; Phase 6 setzt darauf den
Genehmigungsworkflow fuer `REQUESTED`, `IN_REVIEW`, `APPROVED` und `REJECTED`
im Verwaltungsportal um. Kalender, Warteliste und Abrechnung sind weiterhin
nicht umgesetzt. Die in Phase 3 vorhandene Authentifizierung verwendet
`User.passwordHash`.

Version 1 ist Single-Tenant fuer St. Valentin. Mandantenfaehigkeit wird nicht
umgesetzt, spaetere Erweiterbarkeit soll aber nicht absichtlich verhindert
werden.

## Modelle

| Bereich | Modelle | Zweck |
| --- | --- | --- |
| Berechtigungen | `Role`, `Permission`, `RolePermission`, `User`, `UserRole`, `UserPermission` | Rollen plus ergaenzende Einzelrechte |
| Organisationen | `OrganizationType`, `Organization`, `OrganizationContact`, `OrganizationMember` | Organisationen, Kontakte und gueltige Benutzerzuordnungen |
| Hallen | `Building`, `Room`, `RoomComposition`, `Caretaker`, `BuildingCaretaker`, `RoomCaretaker` | Gebaeude, kombinierbare Raeume und Betreuung |
| Nutzung | `UsageType`, `BookingSeries`, `Booking`, `BookingStatusHistory`, `WaitlistEntry`, `HolidayPeriod`, `Closure` | Buchungsgrundlage, unveraenderbare Historie, Warteliste und Sperren |
| Abrechnung | `TariffGroup`, `Tariff`, `BillingEntry` | Flexible Preis- und Abrechnungsgrundlage |
| Erweiterungen | `Document`, `DamageReport`, `Handover`, `AccessMedium`, `AccessAssignment`, `Notification`, `AuditEntry`, `SystemSetting` | Erweiterbarkeit und Nachvollziehbarkeit |

## Zentrale Enums

| Enum | Werte |
| --- | --- |
| `OrganizationStatus` | `ACTIVE`, `BLOCKED`, `INACTIVE` |
| `RoomStatus` | `ACTIVE`, `RESTRICTED`, `OUT_OF_SERVICE` |
| `BookingStatus` | `DRAFT`, `REQUESTED`, `IN_REVIEW`, `APPROVED`, `REJECTED`, `CANCELLED`, `MOVED`, `ARCHIVED` |
| `ClosureStatus` | `OPEN`, `RESTRICTED`, `CLOSED` |
| `WaitlistStatus` | `WAITING`, `OFFERED`, `ACCEPTED`, `EXPIRED`, `CANCELLED` |
| `BillingStatus` | `NOT_RELEVANT`, `OPEN`, `EXPORTED`, `BILLED`, `CANCELLED` |

## Harte Invarianten

- `BookingStatusHistory` wird append-only gefuehrt. Ein Datenbank-Trigger
  verhindert `UPDATE` und `DELETE` an Historieneintraegen.
- Bei der Erstanlage eines Buchungsantrags ist `BookingStatusHistory.oldStatus`
  bewusst `null`; erst danach werden echte Statusuebergaenge historisiert.
- Die Verwaltungsfreigabe folgt in Version 1 dem Weg `REQUESTED ->
  IN_REVIEW -> APPROVED/REJECTED`; direkte Genehmigung oder Ablehnung aus
  `REQUESTED` ist nicht vorgesehen.
- Vor `APPROVED` wird der konfliktrelevante Raumkontext per transaktionalem
  PostgreSQL-Advisory-Lock serialisiert. Der Lock umfasst den angefragten Raum
  sowie alle ueber `RoomComposition` verbundenen Parent- und Teilraeume.
- Buchungen werden nicht physisch geloescht; ein Datenbank-Trigger verhindert
  `DELETE`, und spaetere Services muessen den Statusverlauf schreiben.
- `Booking` speichert fuer Buchungsantraege neben dem Titel eine optionale
  Beschreibung (`description`).
- Eine `Closure` hat exakt eines von `buildingId` und `roomId`. Der
  Check-Constraint in der Migration und `lib/services/closure-service.ts`
  sichern diese Regel fuer Datenbank und kuenftige Service-Aufrufe.
- `OrganizationMember` wird fuer organisationsbezogene Buchungsantraege
  ausgewertet; nur aktuell gueltige Mitgliedschaften berechtigen zur
  Antragstellung, sofern kein Verwaltungsrecht vorliegt.
- `VIEW_BOOKINGS` ist Voraussetzung fuer die Admin-Buchungsuebersicht.
- `APPROVE_BOOKING` erlaubt die Genehmigung eines Antrags in Pruefung.
- `REJECT_BOOKING` erlaubt die Ablehnung eines Antrags in Pruefung.

## Indizes

Die Abfragepfade fuer spaetere Buchungs- und Verwaltungsfunktionen sind
vorbereitet:

| Modell | Index |
| --- | --- |
| `Booking` | `(status, startsAt)`, `(roomId, startsAt, endsAt)` |
| `BookingSeries` | `(roomId, startsOn, endsOn)` |
| `WaitlistEntry` | `(status, placedAt)` |
| `Tariff` | `(roomId, tariffGroupId, usageTypeId, validFrom)` |
| `Notification` | `(status, createdAt)` |
| `DamageReport` | `(roomId, status)` |

`startsAt`/`endsAt`, `startsOn`/`endsOn` und `placedAt` sind die bereits
bestehenden Schema-Bezeichnungen fuer Beginn/Ende bzw. Erstellzeitpunkt der
Wartelistenreihenfolge.

## Seed-Umfang

Die Seeds initialisieren Rollen, Rechte, Organisationstypen, Nutzungstypen
und Tarifgruppen sowie folgende reale Standorte:

| Gebaeude | Raeume | Hauswart/Schulwart |
| --- | --- | --- |
| Volksschule Hauptplatz | Turnsaal | Christian Ömer |
| Volksschule Langenhart | Turnsaal, Bewegungsraum | Gerald Kugler |
| NMS Schubertviertel | Turnsaal groß, Turnsaal klein, Sportplatz, Funcourt | Josef Döberl |
| NMS Langenhart | Sporthalle | Thomas Teichmann |
| Sozialzentrum | Kellergeschoß | Herbert Brandstätter |

## Nicht Bestandteil von Phase 5

- Keine Buchungen, Serien oder Statushistorien als Seed-Daten.
- Keine Tarifbetraege, Rechnungen oder Abrechnungsablaeufe.
- Keine Kalender-, Wartelisten- oder Genehmigungslogik.
- Keine Umsetzung der Mandantenfaehigkeit.
