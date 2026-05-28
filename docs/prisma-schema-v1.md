# Prisma-Schema V1

## Grundlage und Umfang

Dieses Schema basiert verbindlich auf `docs/pflichtenheft-v1.0.md`.
Phase 3.5 haertet das relationale Grundmodell fuer die folgenden
Implementierungsphasen. Phase 5 nutzt dieses Modell fuer einzelne
Buchungsantraege mit Statushistorie; Phase 6 setzt darauf den
Genehmigungsworkflow fuer `REQUESTED`, `IN_REVIEW`, `APPROVED` und `REJECTED`
im Verwaltungsportal um. Phase 7 ergaenzt die Wartelistenbasis mit
Angebotsfrist, Angebotsannahme und erneuter Genehmigung ueber neue
Buchungsantraege. Phase 10 ergaenzt die Abrechnungsvorbereitung fuer
genehmigte Buchungen. Phase 10.5 ergaenzt Reportingdaten sowie CSV-, XLSX-
und PDF-Exporte ohne automatische Rechnungslegung. Phase 11 nutzt das Modell
fuer die oeffentliche Ansicht mit Kalender, freien Zeiten und iCal-Export. Die
Phase 12 nutzt `AuditEntry` fuer die Protokollierung von Worker-Laeufen. Die in
Phase 3 vorhandene Authentifizierung verwendet `User.passwordHash`.

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
| `WaitlistStatus` | `ACTIVE`, `OFFERED`, `ACCEPTED`, `DECLINED`, `EXPIRED`, `CANCELLED` |
| `BillingStatus` | `NOT_RELEVANT`, `OPEN`, `EXPORTED`, `BILLED`, `CANCELLED` |
| `TariffDayType` | `ALL`, `WEEKDAY`, `WEEKEND`, `HOLIDAY` |
| `BillingCalculationType` | `HOURLY`, `FLAT`, `ZERO` |

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
- `VIEW_BOOKINGS` ist ebenfalls Voraussetzung fuer die Admin-Wartelistenuebersicht.
- `APPROVE_BOOKING` erlaubt die Genehmigung eines Antrags in Pruefung.
- `REJECT_BOOKING` erlaubt die Ablehnung eines Antrags in Pruefung.
- Wartelistenplaetze werden nach `placedAt` gereiht. Wenn ein passender Slot
  frei wird, erhaelt genau ein Eintrag gleichzeitig den Status `OFFERED` mit
  einer Frist von 48 Stunden (`offerExpiresAt`).
- Die Wartelistenbewertung verwendet dieselben effektiven Blockzeiten wie
  Buchungsantraege, inklusive `setupBufferMinutes` und `teardownBufferMinutes`.
- Die Annahme eines gueltigen Wartelistenangebots fuehrt zu einem neuen
  Buchungsantrag im Status `REQUESTED`; eine fixe Genehmigung erfolgt dadurch
  nicht.
- `acceptWaitlistOffer()`, `declineWaitlistOffer()`, `expireWaitlistOffers()`
  und `activateNextWaitlistEntryForSlot()` serialisieren denselben
  Raum-/Teilraum-Kontext per Advisory-Lock, damit ein Slot nicht parallel
  mehrfach verarbeitet werden kann.

## Indizes

Die Abfragepfade fuer spaetere Buchungs- und Verwaltungsfunktionen sind
vorbereitet:

| Modell | Index |
| --- | --- |
| `Booking` | `(status, startsAt)`, `(roomId, startsAt, endsAt)` |
| `BookingSeries` | `(roomId, startsOn, endsOn)` |
| `WaitlistEntry` | `(status, placedAt)` |
| `Tariff` | `(roomId, tariffGroupId, usageTypeId, validFrom)` |
| `Notification` | `(status, createdAt)`, `(status, nextAttemptAt)` |
| `DamageReport` | `(roomId, status)` |

`startsAt`/`endsAt`, `startsOn`/`endsOn` und `placedAt` sind die bereits
bestehenden Schema-Bezeichnungen fuer Beginn/Ende bzw. Erstellzeitpunkt der
Wartelistenreihenfolge.

Zusatz fuer Phase 7.5:

- Partieller Unique-Index auf `WaitlistEntry(organizationId, roomId, startsAt, endsAt)`
  fuer Status `ACTIVE` und `OFFERED`, damit offensichtliche Doppelanmeldungen
  derselben Organisation fuer denselben Slot nicht parallel bestehen koennen.
- `Notification` speichert fuer Wartelistenangebote zusaetzlich
  `waitlistEntryId` und ein JSON-Payload mit `offerExpiresAt`, `roomId`,
  `startsAt` und `endsAt`.

Zusatz fuer Phase 9.5:

- `Notification` speichert Retry-Metadaten: `attemptCount`, `maxAttempts`,
  `nextAttemptAt` und `lastError`. Automatische Queue-Verarbeitung
  beruecksichtigt `nextAttemptAt` und beendet automatische Dauerschleifen,
  sobald `attemptCount >= maxAttempts` erreicht ist.
- Event-Schalter fuer die E-Mail-Ereignisse werden als `SystemSetting` mit dem
  Key `notifications.events.enabled` gespeichert. Fehlende oder unvollstaendige
  Werte fallen sicher auf aktivierte Standardwerte zurueck.

Zusatz fuer Phase 10:

- `Organization.isBillingRelevant` steuert, ob genehmigte Buchungen einer
  Organisation in die Abrechnungsvorbereitung aufgenommen werden.
- `Tariff.dayType` unterscheidet allgemeine, Wochentags-, Wochenend- und
  Feiertagstarife. Die Tarifaufloesung verwendet Raum, Tarifgruppe,
  Organisationstyp, Nutzungstyp, Tagesart und Gueltigkeitszeitraum.
- `BillingEntry` speichert `periodStart`, `periodEnd`, `durationMinutes`,
  `unitPrice` und `calculationType`, damit die Berechnung fuer einen spaeteren
  Excel-/PDF-Export nachvollziehbar bleibt.
- Phase 10.1 ergaenzt Indizes auf `BillingEntry(status, periodStart)`,
  `BillingEntry(organizationId, periodStart)` und `BillingEntry(exportedAt)`.
- Nicht abrechnungsrelevante Organisationen erzeugen in Version 1 keinen
  `BillingEntry`; die Buchung bleibt lediglich von der Abrechnungsvorbereitung
  ausgeschlossen.
- Abrechnungsexporte verwenden das eigene Recht `BILLING_EXPORT`. `CREATE_EXPORTS`
  bleibt fuer sonstige Exporte reserviert.
- Statusaenderungen fuer `BillingEntry` laufen zentral; aktuell ist nur
  `OPEN -> EXPORTED` vorgesehen.
- `ReportingService` liefert reine strukturierte Daten fuer Monatsabrechnung,
  Organisationsuebersicht, Raumbelegung und monatliche Nutzungssummen.
- `ExportService` erzeugt daraus UTF-8-CSV, echte XLSX-Dateien und einfache
  druckbare PDF-Reports. Dateierzeugung liegt bewusst nicht im
  `ReportingService`.
- Exportvorgaenge werden in `AuditEntry` mit Exporttyp, Zeitraum, Filterwerten
  und Anzahl der exportierten Zeilen protokolliert.
- Die oeffentliche Kalenderansicht und der iCal-Export verwenden
  `public.calendar.visibility.default` sowie die raumbezogenen Felder
  `publicShowOrganization` und `publicShowEventName`.
- `Closure.isPublic` steuert, ob eine Sperre oeffentlich als Detail sichtbar
  ist. Nicht-oeffentliche Sperren blockieren freie Zeitfenster weiterhin, ohne
  ihren Grund im oeffentlichen Kalender zu zeigen.
- `AuditEntry` protokolliert Worker-Laeufe mit `entityType = WorkerJob`,
  `entityId = Jobname`, `action = SUCCESS/FAILED` und Payload fuer Startzeit,
  Endzeit, verarbeitete Anzahl und Fehlermeldung.
- Das Recht `MANAGE_SYSTEM_JOBS` erlaubt die manuelle Ausfuehrung von
  Hintergrundjobs im Verwaltungsportal.

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

- Keine Buchungen, Serien, Wartelistenplaetze oder Statushistorien als Seed-Daten.
- Keine Tarifbetraege oder Rechnungen als Seed-Daten.
- Keine automatische Rechnungslegung und keine Zahlungsabwicklung.
- Keine oeffentlichen Schreibfunktionen fuer Buchungen, Warteliste oder
  Verwaltung.
- Kein externer Scheduler-Dienst und kein Deployment-spezifischer Cron-Zwang.
- Keine Umsetzung der Mandantenfaehigkeit.
