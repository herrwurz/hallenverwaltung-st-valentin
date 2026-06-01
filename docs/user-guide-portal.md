# Kurzanleitung Vereinsportal

Diese Anleitung richtet sich an Vereins-/Organisationsbenutzer fuer Version 1.

## Einstieg

1. `/login` oeffnen.
2. Mit dem Vereinsbenutzer anmelden.
3. Nach erfolgreichem Login `/portal` verwenden.

Der Benutzer kann nur fuer Organisationen arbeiten, denen er aktiv zugeordnet
ist.

## Buchungsantrag stellen

Unter `/portal/bookings`:

1. Neuen Buchungsantrag ausfuellen.
2. Gebaeude und Raum auswaehlen.
3. Titel und Nutzungstyp angeben.
4. Beginn und Ende setzen.
5. Antrag absenden.

Hinweise:

- Wenn der Benutzer nur einer Organisation zugeordnet ist, wird kein
  Organisationsfeld angezeigt.
- Der Antrag wird nicht sofort fix gebucht.
- Status nach dem Absenden: `beantragt`.
- Die Gemeinde prueft und genehmigt oder lehnt ab.

## Serienantrag

Unter `/portal/bookings` kann ein Serienantrag fuer woechentliche Termine
gestellt werden.

Wichtig:

- Geschlossene Ferien-/Feiertagszeitraeume werden uebersprungen.
- Eingeschraenkte Zeitraeume erzeugen Hinweise.
- Ganze Serien werden in Version 1 nicht gesammelt nachtraeglich geaendert.
- Einzeltermine koennen ueber Verschiebungsantraege behandelt werden.

## Eigene Antraege ansehen

Unter `/portal/bookings` sieht der Verein:

- beantragte Termine
- Termine in Pruefung
- genehmigte Termine
- abgelehnte Termine
- stornierte Termine
- Serien
- Aenderungsantraege

Ein eigener Antrag kann storniert werden, solange er noch beantragt ist.

## Warteliste

Unter `/portal/waitlist`:

1. Wartelistenplatz anlegen.
2. Status verfolgen.
3. Angebot annehmen oder ablehnen, wenn ein Platz angeboten wird.

Regeln:

- Reihenfolge nach Eingangszeit.
- Platz 1 wird zuerst angeboten.
- Angebotsfrist: 48 Stunden.
- Annahme erzeugt einen neuen Buchungsantrag.
- Annahme ist noch keine fixe Buchung.

## Kalender

Unter `/portal/calendar`:

- eigene Termine mit Details sehen
- fremde Termine eingeschraenkt sehen
- nach Gebaeude und Raum filtern
- Tages-, Wochen-, Monats- und Jahresansicht verwenden

## Dokumente

Unter `/portal/documents`:

- Dokument-Metadaten fuer die eigene Organisation erfassen
- vorhandene Dokumente anzeigen

Version 1 speichert Dokumente als Metadaten mit serverseitigem Storage-Key.
Ein echter Datei-Upload kann spaeter ergaenzt werden.

## Schaeden melden

Unter `/portal/damages`:

- Gebaeude und Raum auswaehlen
- Schaden beschreiben
- Meldung absenden

Die Verwaltung bearbeitet den Status der Schadensmeldung.

## Was Vereine nicht koennen

- keine Buchung direkt genehmigen
- keine fremden Organisationen buchen
- keine Verwaltungsdaten bearbeiten
- keine Abrechnung exportieren
- keine System-Jobs starten

## Vor dem ersten echten Betrieb

- Vereinsbenutzer und Organisation pruefen.
- Richtige aktive Mitgliedschaft sicherstellen.
- Ansprechpartner und E-Mail-Adressen pruefen.
- Testbuchung gemeinsam mit der Verwaltung durchspielen.
