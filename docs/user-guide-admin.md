# Kurzanleitung Verwaltungsportal

Diese Anleitung richtet sich an Gemeinde/Admin-Benutzer fuer Version 1.

## Einstieg

1. `/login` oeffnen.
2. Mit dem Admin-Benutzer anmelden.
3. Nach erfolgreichem Login `/admin` verwenden.

Wichtig:

- Keine Demo-Zugaenge in Produktion verwenden.
- Inaktive Benutzer verlieren den Zugriff.
- Jede Verwaltungsseite ist serverseitig geschuetzt.

## Navigation

Die linke Admin-Navigation fuehrt zu:

- Dashboard
- Buchungsantraege
- Kalender
- Abrechnung
- Benachrichtigungen
- Einstellungen
- Warteliste
- Gebaeude
- Raeume
- Organisationen
- Benutzer
- Rollen/Rechte

Auf Kern-Verwaltungsseiten gibt es zusaetzlich einen Ruecklink zum Dashboard.

## Stammdaten pflegen

### Gebaeude

Unter `/admin/buildings`:

- Gebaeude anlegen
- Gebaeude bearbeiten
- aktiv/inaktiv setzen
- Hauswart zuordnen

### Raeume

Unter `/admin/rooms`:

- Raum anlegen
- Raum bearbeiten
- Status setzen
- Gebaeude zuordnen
- optional Parent-Room/Gesamtbereich zuordnen
- Oeffnungszeiten und Pufferzeiten pflegen

Regel:

- Ein Raum gehoert eindeutig zu einem Gebaeude.
- Teilbereiche und Gesamtbereiche duerfen keine Zyklen bilden.

### Organisationen

Unter `/admin/organizations`:

- Organisation anlegen
- Organisation bearbeiten
- Organisation aktiv, inaktiv oder gesperrt setzen
- Organisationstyp zuordnen

Gesperrte Organisationen koennen keine neuen Buchungsantraege stellen.

### Benutzer

Unter `/admin/users`:

- Benutzer anlegen
- Benutzer bearbeiten
- Rollen zuweisen
- Organisationen zuweisen
- aktive/inaktive Benutzer steuern

Hinweis:

- Rollen mit hoeheren Systemrechten duerfen nur entsprechend berechtigt
  verwaltet werden.
- Organisationsmitgliedschaften werden historisiert.

## Buchungsantraege bearbeiten

Unter `/admin/bookings`:

1. Statusfilter verwenden.
2. Antrag pruefen.
3. Antrag auf `IN_REVIEW` setzen.
4. Konflikte ansehen.
5. Antrag genehmigen oder ablehnen.

Regeln:

- Direkte Statusspruenge sind begrenzt.
- Genehmigung prueft Konflikte erneut.
- Ablehnung braucht eine Begruendung.
- Statushistorie bleibt erhalten.

## Warteliste

Unter `/admin/waitlist`:

- Wartelisteneintraege anzeigen
- nach Status filtern
- Frist und Angebot sehen

Die Reihung erfolgt automatisch nach Eingangszeit. In Version 1 gibt es keine
manuelle Reihung.

## Kalender

Unter `/admin/calendar`:

- Tag, Woche, Monat und Jahr pruefen
- nach Gebaeude und Raum filtern
- Termin-Details anzeigen

Der Admin sieht alle Details. Die oeffentliche Sicht wird separat unter
`/admin/settings/calendar` konfiguriert.

## Benachrichtigungen

Unter `/admin/notifications`:

- Queue einsehen
- fehlgeschlagene Mails erneut senden
- Event-Schalter bearbeiten
- Queue manuell verarbeiten

Mailversand setzt korrekte SMTP-Konfiguration voraus.

## System-Jobs

Unter `/admin/system/jobs`:

- Notification Queue verarbeiten
- abgelaufene Wartelistenangebote verarbeiten
- Maintenance-Jobs manuell starten
- Jobprotokoll einsehen

Im Produktivbetrieb sollte der Worker automatisch laufen.

## Abrechnung

Unter `/admin/billing`:

- Zeitraum auswaehlen
- abrechnungsfaehige Buchungen anzeigen
- Abrechnungseintraege erzeugen
- CSV/XLSX/PDF exportieren
- Eintraege als exportiert markieren

Version 1 erstellt keine Rechnungen und keine Zahlungen. Es handelt sich um
Abrechnungsvorbereitung.

## Vor Go-Live pruefen

- Sind echte Admin-Benutzer angelegt?
- Sind Demo-Zugaenge deaktiviert oder nicht vorhanden?
- Laeuft SMTP?
- Laeuft Worker?
- Wurde Backup und Restore-Probe dokumentiert?
- Sind offene Pilotpunkte bewertet?
