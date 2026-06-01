# Abnahmetestplan Phase 23

Dieser Plan beschreibt die fachliche Abnahme vor dem Go-Live von Version 1.
Er baut auf `docs/pilot-testplan.md` und `docs/production-readiness.md` auf.
Die betrieblichen Go-Live-Nachweise werden in `docs/go-live-evidence.md`
dokumentiert.

## Ziel

Die Stadt/Gemeinde bestaetigt, dass die wichtigsten Version-1-Funktionen fuer
den Pilot- oder Produktivstart ausreichend funktionieren:

- oeffentliche Ansicht
- Login und Rollensteuerung
- Vereinsportal
- Buchungsantrag
- Genehmigungsworkflow
- Warteliste
- Kalender
- Benachrichtigungen
- Abrechnungsvorbereitung und Export
- Hintergrundjobs
- Backup-/Restore-Probe in der Zielumgebung

## Voraussetzungen

- Ziel- oder Abnahmeumgebung ist gestartet.
- Migrationen wurden erfolgreich ausgefuehrt.
- Stammdaten sind vorhanden:
  - reale Gebaeude
  - reale Raeume
  - Hauswarte
  - Organisationstypen
  - Nutzungstypen
  - Tarifgruppen und Tarife
- Mindestens diese Benutzer existieren:
  - Gemeinde/Admin
  - Verein
  - Hallenwart
- SMTP ist fuer die Abnahme konfiguriert oder bewusst als offener Punkt
  protokolliert.
- Worker laeuft oder wird fuer den Test manuell unter `/admin/system/jobs`
  gestartet.

## Rollen und Testpersonen

| Rolle | Zweck | Einstieg |
| --- | --- | --- |
| Gemeinde/Admin | Verwaltung, Genehmigung, Abrechnung, Einstellungen | `/admin` |
| Verein | Buchungsantraege, Warteliste, Portal-Kalender | `/portal` |
| Hallenwart | Hallenuebergaben, No-Shows, Schaeden | `/admin/handovers` |
| Oeffentlich | Kalender und freie Zeiten ohne Login | `/public` |

## A. Oeffentliche Ansicht

1. `/public` aufrufen.
2. Standortuebersicht pruefen.
3. `/public/calendar` aufrufen.
4. Gebaeude- und Raumfilter verwenden.
5. Freie Zeiten fuer einen Raum anzeigen.
6. Datenschutzmodus pruefen:
   - nur belegt/frei
   - Vereinsname anzeigen
   - Veranstaltungsname anzeigen

Erwartung:

- Keine Anmeldung erforderlich.
- Stornierte und abgelehnte Buchungen blockieren nicht.
- Gesperrte Zeiten werden angezeigt oder beruecksichtigt.
- Oeffentlich werden nur erlaubte Details gezeigt.

## B. Login und Rollen

1. Als Admin anmelden.
2. Weiterleitung nach `/admin` pruefen.
3. Als Verein anmelden.
4. Weiterleitung nach `/portal` pruefen.
5. Als Hallenwart anmelden.
6. Zugriff auf erlaubte Hallenwart-Funktionen pruefen.
7. Mit Vereinsbenutzer eine Admin-Seite direkt aufrufen.

Erwartung:

- Rollenbasierte Weiterleitung funktioniert.
- Vereinsbenutzer erhalten keinen Zugriff auf Verwaltungsseiten.
- Inaktive Benutzer koennen nicht weiterarbeiten.

## C. Stammdatenverwaltung

1. Gebaeude anzeigen.
2. Raum anzeigen und Gebaeudezuordnung pruefen.
3. Organisation anzeigen.
4. Benutzer anzeigen.
5. Rollen/Rechte anzeigen.
6. Formularaktionen pruefen:
   - Speichern
   - Abbrechen
   - Zurueck zum Dashboard

Erwartung:

- Keine fachlichen Daten sind hardcodiert.
- Raeume sind eindeutig einem Gebaeude zugeordnet.
- Parent-/Teilraum-Auswahl erzeugt keine Zyklen.

## D. Buchungsantrag im Portal

1. Als Verein `/portal/bookings` oeffnen.
2. Neuen Einzeltermin beantragen.
3. Bei nur einer Organisation darf kein unnoetiges Organisationsfeld sichtbar
   sein.
4. Antrag in der eigenen Liste pruefen.
5. Ungueltigen Zeitraum testen:
   - Ende vor Beginn
   - ausserhalb Oeffnungszeiten
   - zu lange Dauer

Erwartung:

- Gueltiger Antrag wird als `REQUESTED` angelegt.
- Ungueltige Eingaben liefern verstaendliche Fehlermeldungen.
- Verein kann nur fuer eigene aktive Organisationen beantragen.

## E. Genehmigungsworkflow

1. Als Admin `/admin/bookings` oeffnen.
2. Antrag auf `IN_REVIEW` setzen.
3. Konflikthinweise ansehen.
4. Antrag genehmigen.
5. Zweiten ueberlappenden Antrag testen.
6. Antrag ablehnen und Ablehnungsgrund erfassen.

Erwartung:

- Statuswechsel laufen nur ueber erlaubte Schritte.
- Genehmigung prueft harte Konflikte erneut.
- Ablehnungsgrund wird historisiert.
- Historie zeigt Actor, Status, Zeitpunkt und Grund.

## F. Warteliste

1. Als Verein Wartelistenplatz anlegen.
2. Als Admin oder durch Storno einen Slot freimachen.
3. Platz 1 wird angeboten.
4. Angebotsfrist pruefen.
5. Angebot annehmen.
6. Angebot ablehnen und naechsten Platz pruefen.
7. Abgelaufene Angebote ueber Worker verarbeiten.

Erwartung:

- Reihung nach Eingangszeit.
- Immer nur der naechste passende Platz wird angeboten.
- Annahme erzeugt neuen Antrag in `REQUESTED`, keine fixe Buchung.

## G. Kalender

1. Admin-Kalender aufrufen.
2. Portal-Kalender aufrufen.
3. Oeffentlichen Kalender aufrufen.
4. Tages-, Wochen-, Monats- und Jahresansicht pruefen.
5. Termin-Detaildialog pruefen.
6. Filter nach Gebaeude und Raum pruefen.

Erwartung:

- Admin sieht alle Details.
- Portal sieht eigene Details und fremde nur eingeschraenkt.
- Oeffentlich gelten Datenschutzeinstellungen.
- Parent-/Teilraum-Konflikte werden korrekt beruecksichtigt.

## H. Benachrichtigungen und Worker

1. `/admin/notifications` oeffnen.
2. Event-Schalter pruefen.
3. Queue manuell verarbeiten.
4. Fehlgeschlagene Benachrichtigung erneut senden.
5. `/admin/system/jobs` oeffnen.
6. Maintenance-Jobs manuell starten.

Erwartung:

- Deaktivierte Events erzeugen keine Benachrichtigung.
- Retry-/Backoff-Regeln werden eingehalten.
- Worker-Laeufe werden protokolliert.

## I. Abrechnung und Export

1. `/admin/billing` oeffnen.
2. Zeitraum auswaehlen.
3. Abrechnungsfaehige Buchungen anzeigen.
4. BillingEntries erzeugen.
5. CSV exportieren.
6. XLSX exportieren.
7. PDF exportieren.
8. Eintraege als exportiert markieren.

Erwartung:

- Nur `APPROVED`-Buchungen werden abgerechnet.
- 0-Euro- und Pauschaltarife funktionieren.
- Exportierte Eintraege werden nicht still ueberschrieben.

## J. Backup und Restore-Probe

1. Backup mit `deploy/scripts/backup-postgres.sh` erstellen.
2. Restore-Test mit `deploy/scripts/restore-test-postgres.sh` ausfuehren.
3. Ergebnis dokumentieren.

Erwartung:

- Backup-Datei wird erzeugt.
- Restore-Test laeuft ohne Fehler.
- Wiederhergestellte Tabellen werden angezeigt.

## Abnahmekriterien

Version 1 kann fachlich abgenommen werden, wenn:

- alle Muss-Tests aus A bis J bestanden sind oder bewusst als offener Punkt
  dokumentiert wurden,
- keine offenen Punkte mit Prioritaet hoch den Betrieb blockieren,
- ein echter SMTP-Test entweder bestanden oder als Go-Live-Risiko akzeptiert
  wurde,
- Worker-Betrieb produktiv geregelt ist,
- eine Restore-Probe dokumentiert wurde,
- finale Initialbenutzer ohne Demo-Passwoerter angelegt sind.

## Blockerbewertung

Vor Unterschrift muessen die Hoch-Blocker aus
`docs/go-live-open-points.md` einzeln bewertet werden. Ein Punkt darf nur als
erledigt gelten, wenn ein Nachweis vorliegt, zum Beispiel:

- Domain zeigt auf Zielserver.
- TLS-Zertifikat ist aktiv.
- `.env.production` enthaelt keine Platzhalter.
- Admin-Initialbenutzer wurde mit sicherem Passwort angelegt.
- Demo-Zugaenge sind nicht vorhanden oder deaktiviert.
- SMTP-Test wurde real versendet.
- Worker-Logs zeigen erfolgreiche Joblaeufe.
- Backup-Datei wurde erzeugt.
- Restore-Probe wurde erfolgreich ausgefuehrt.
- Monitoring/Alarmierung ist mindestens organisatorisch geregelt.

Mittlere Punkte aus `docs/go-live-open-points.md` muessen nicht zwingend vor
dem ersten Go-Live umgesetzt sein. Sie muessen aber bewusst als
"vor erweitertem Pilot", "nach Version 1" oder "nicht erforderlich"
entschieden werden.

## Abnahmeprotokoll

Die Detailnachweise fuer Betrieb, SMTP, Worker, Backup/Restore und
Risikoakzeptanzen werden im Go-Live-Nachweisprotokoll gefuehrt:
`docs/go-live-evidence.md`.

| Punkt | Ergebnis | Bemerkung | Verantwortlich | Datum |
| --- | --- | --- | --- | --- |
| Oeffentliche Ansicht | offen |  |  |  |
| Login/Rollen | offen |  |  |  |
| Stammdaten | offen |  |  |  |
| Buchungsantrag | offen |  |  |  |
| Genehmigung | offen |  |  |  |
| Warteliste | offen |  |  |  |
| Kalender | offen |  |  |  |
| Benachrichtigungen | offen |  |  |  |
| Abrechnung/Export | offen |  |  |  |
| Backup/Restore | offen |  |  |  |
