**1\. Prioritätenlogik**

Wie soll priorisiert werden?

Vorschlag für Gemeinden:

| **Priorität** | **Gruppe**                             | **Darf bestehende Reservierungen verdrängen?**                                 |
| ------------- | -------------------------------------- | ------------------------------------------------------------------------------ |
| 1             | Gemeinde / Katastrophenschutz / Wahlen | Ja                                                                             |
| 2             | Schulen                                | Optional                                                                       |
| 3             | Meisterschafts- & Ligabetrieb          | Optional                                                                       |
| 4             | Regelmäßige Vereinsnutzung             | Nein                                                                           |
| 5             | VHS / Kurse                            | Nein - die finden meistens in der Volksschule Hauptplatz statt oder in Klassen |
| 6             | Private / Einzelveranstaltungen        | Nein                                                                           |

Fragen:

- Passt diese Reihenfolge? Ja
- Dürfen Schulen Vereine verdrängen? Ja
- Dürfen Meisterschaftsspiele Trainings verdrängen? Ja
- Dürfen Gemeindeveranstaltungen alles verdrängen? Ja

**2\. Genehmigungslogik**

Vorschlag:

| **Buchungsart**      | **Genehmigung nötig** |
| -------------------- | --------------------- |
| neue Einzelbuchung   | Ja                    |
| neue Serienbuchung   | Ja                    |
| Storno               | Nein                  |
| Terminverschiebung   | Ja                    |
| Tausch               | Ja                    |
| Wartelistenübernahme | Ja                    |

Fragen:

- Soll JEDE Buchung genehmigt werden? Ja - alle Vereine aus St. Valentin, der SC St. Pantaleon und die Fußballschule Salzkammergut dürfen buchen, müssen aber trotzdem genehmigt werden. Diese Liste soll erweiterbar sein
- Oder dürfen gewisse Stammvereine automatisch buchen? Nein
- Sollen wiederkehrende Stammtermine automatisch verlängert werden? Nein

**3\. Serienbuchungen**

Wichtiger Punkt.

Fragen:

- Was passiert in:

- Ferien?
- Feiertagen?
- schulautonomen Tagen?

Optionen:

- automatisch aussetzen
- trotzdem buchen
- konfigurierbar - Soll erste Priorität sein - in den Ferien sind oftmals Hallen wegen Reinigung 2 Wochen gesperrt.

- Dürfen einzelne Termine einer Serie verschoben werden? Ja - Serie sind die wöchentlichen Termine
- Darf man:

- ganze Serie - Nein
- einzelne Termine - Ja
- zukünftige Termine - Nein

bearbeiten?

Ferienkalender:

- Sommerferien
- Semesterferien
- Weihnachtsferien
- Osterferien
- Herbstferien
- schulautonome Tage

Pro Ferienzeit:

- Halle geöffnet
- Halle eingeschränkt
- Halle gesperrt

Pflichtfelder: Grund, Beginn, Ende, sichtbar für Benutzer Ja/Nein

**4\. Hallenlogik**

Sehr wichtig für Sporthallen.

Fragen:

- Gibt es Räume mit Unterbereichen? Ja
- Gibt es eine Halle, die in mehrere Bereiche geteilt werden kann? Ja
- Können kombinierte Hallen automatisch alle Teilhallen sperren? Ja
- Braucht ihr: Ja - die Zeiten werden unbedingt benötigt, Zeiten sollen konfigurierbar sein

- Aufbauzeiten?
- Abbauzeiten?
- Pufferzeiten?

Beispiel:  
18:00-20:00 reserviert → automatisch 17:45-20:15 blockieren.

Sporthalle

├─ Halle A

├─ Halle B

└─ Halle C

Gesamthalle

Logik:

Wird die Gesamthalle gebucht: → A+B+C automatisch gesperrt

Wird Halle A gebucht: → Gesamthalle nicht mehr buchbar

**5\. Wartelistenlogik**

Fragen:

- Reihenfolge:

- Priorität?
- Eingangszeit? Soll erste Priorität sein
- manuelle Entscheidung?

- Wenn ein Termin frei wird:

- automatisch informieren?
- automatisch reservieren?
- zuerst Gemeinde prüfen lassen? Soll erste Priorität sein

- Wie lange gilt eine Wartelistenbenachrichtigung?

- 12h?
- 24h?
- 48h? Soll erste Priorität sein

Empfehlung zur Wartelistenzeit und Informierung: Nur Platz 1 erhält 48 Stunden Zeit., danach Platz 2 usw.

**6\. Stornoregeln**

Fragen:

- Gibt es:

- Mindeststornofristen? Nein
- Sanktionen? Nein
- Statistik über Nichtnutzung? Nein

- Sollen No-Shows protokolliert werden? Ja - der Hallenwart und die Gemeinde melden
- Sollen kurzfristigen Stornos automatisch gemeldet werden? Ja

**7\. Sonderfälle**

Sehr wichtig.

Fragen:

- Soll die Gemeinde Hallen kurzfristig sperren können? Ja
- Soll es globale Sperren geben? Nein
- Soll es Notfallüberschreibungen geben? Nein
- Soll eine Halle „außer Betrieb" gesetzt werden können? Ja - in den Ferien

**8\. Öffentliche Anzeige**

Fragen:

- Was darf öffentlich sichtbar sein?

- nur belegt/frei? Ja
- Vereinsname? Ja
- Veranstaltungsname? Ja

- Soll es:

- öffentliche Suche? Nein
- freie-Zeiten-Ansicht? Ja
- Export als iCal geben? Ja

**Datenschutzoption**

Admin kann wählen:

- Nur belegt/frei
- Vereinsname anzeigen
- Veranstaltungsname anzeigen

**9\. Schlüssel- und Zutrittsverwaltung**

In der Datenbank vorsehen für Erweiterbarkeit

- Schlüsselnummer
- Schlüsselausgabe
- Schlüsselrückgabe
- RFID-Karten
- elektronische Zutritte

**10\. Maximale Buchungsdauer**

Soll konfigurierbar sein pro Halle. Standard: 06:00 - 23:00

**11\. Buchungsvorlauf: soll konfigurierbar sein, aber Vorschlag**

- Einzeltermine: 180 Tage
- Serienbuchungen: ganze Saison

**12\. Sperrung wegen Nichtbezahlung**

Da eine Abrechnung vorgesehen ist:

Soll es später möglich sein:

- Organisation auf "gesperrt" setzen
- keine neuen Buchungen zulassen

Bereits im Datenmodell vorsehen.

**13\. Mehrere Ansprechpartner**

Organisationen sollten besitzen:

- Hauptansprechpartner
- Stellvertreter
- Kassier
- weitere Funktionäre

**14\. Dokumentenverwaltung**

Für Vereine sehr sinnvoll:

Uploads:

- Hallenordnung
- Benützungsvertrag
- Versicherungsnachweis
- Veranstaltungsgenehmigungen

**15\. Schäden und Übergabe**

**Schadensmeldung**

- Foto
- Beschreibung
- Status

**Hallenübergabe**

- Schlüssel erhalten
- Halle übernommen
- Halle retourniert

**16\. Abrechnung**

Tarifmodell flexibel halten.

Abrechnungslogik - Tarife sollten abhängig sein von:

| **Faktor**       | **Beispiel**                                 |
| ---------------- | -------------------------------------------- |
| Halle/Raum       | Sporthalle, Turnsaal, Mehrzweckraum          |
| Organisationstyp | Verein, VHS, Schule, Privat, Extern          |
| Nutzungstyp      | Training, Meisterschaft, Veranstaltung, Kurs |
| Zeitraum         | Stunde, Halbtag, Ganztag                     |
| Sonderkosten     | Reinigung, Auf-/Abbau, Schlüssel, Technik    |

- Abrechnung pro genehmigte Buchung
- Grundtarif pro Stunde
- optional Pauschaltarif
- Kostenstelle je Halle/Raum
- Export an Gemeinde als Excel/PDF
- keine automatische Rechnungserstellung in Version 1

Status für Abrechnung

- nicht abrechnungsrelevant
- offen
- exportiert
- abgerechnet
- storniert

**17\. Benachrichtigungen**

Zentrale Benachrichtigungsmatrix

| **Ereignis**                 | **Antragsteller** | **Gemeinde** | **Hallenwart** | **Warteliste**    |
| ---------------------------- | ----------------- | ------------ | -------------- | ----------------- |
| Buchung beantragt            | Ja                | Ja           | Optional       | Nein              |
| Buchung genehmigt            | Ja                | Optional     | Ja             | Nein              |
| Buchung abgelehnt            | Ja                | Optional     | Nein           | Nein              |
| Buchung storniert            | Ja                | Ja           | Ja             | Ja, falls passend |
| Termin wird frei             | Nein              | Ja           | Nein           | Ja                |
| Warteliste Platz 1           | Ja                | Ja           | Nein           | Ja                |
| Terminverschiebung beantragt | Ja                | Ja           | Optional       | Nein              |
| Tausch beantragt             | beide Vereine     | Ja           | Optional       | Nein              |
| Schaden gemeldet             | Melder            | Ja           | Hallenwart     | Nein              |
| Halle gesperrt               | betroffene Bucher | Ja           | Ja             | Nein              |

Umsetzung:

- E-Mail
- SMS/Push nur später
- Admin kann pro Ereignis aktivieren/deaktivieren
- Versand wird protokolliert
- fehlgeschlagene Mails bleiben in Warteschlange

**18\. Rollenrechte**

Rollen + Einzelrechte kombinieren

**Rollen**

- Super-Admin
- Gemeinde-Admin
- Hallenverwalter
- Hallenwart
- Verein/Organisation
- VHS
- Schule
- Öffentlicher Benutzer

| **Funktion**                  | **Verein** | **Hallenwart** | **Hallenverwalter** | **Gemeinde-Admin** | **Super-Admin** |
| ----------------------------- | ---------- | -------------- | ------------------- | ------------------ | --------------- |
| Öffentlichen Kalender sehen   | Ja         | Ja             | Ja                  | Ja                 | Ja              |
| Buchung beantragen            | Ja         | Ja             | Ja                  | Ja                 | Ja              |
| Eigene Buchung stornieren     | Ja         | Nein           | Ja                  | Ja                 | Ja              |
| Buchung genehmigen            | Nein       | Nein           | Optional            | Ja                 | Ja              |
| Buchung ablehnen              | Nein       | Nein           | Optional            | Ja                 | Ja              |
| Termin verschieben beantragen | Ja         | Nein           | Ja                  | Ja                 | Ja              |
| Termintausch beantragen       | Ja         | Nein           | Ja                  | Ja                 | Ja              |
| Hallen sperren                | Nein       | Ja             | Ja                  | Ja                 | Ja              |
| No-Show melden                | Nein       | Ja             | Ja                  | Ja                 | Ja              |
| Schaden melden                | Ja         | Ja             | Ja                  | Ja                 | Ja              |
| Schaden bearbeiten            | Nein       | Ja             | Ja                  | Ja                 | Ja              |
| Organisation sperren          | Nein       | Nein           | Nein                | Ja                 | Ja              |
| Benutzer verwalten            | Nein       | Nein           | Nein                | Ja                 | Ja              |
| Tarife verwalten              | Nein       | Nein           | Nein                | Ja                 | Ja              |
| Exporte erstellen             | Nein       | Nein           | Optional            | Ja                 | Ja              |
| Systemeinstellungen ändern    | Nein       | Nein           | Nein                | Nein               | Ja              |

Jede Rolle soll zusätzlich durch Einzelrechte ergänzt werden können, z. B.:

- darf_genehmigen
- darf_halle_sperren
- darf_abrechnung_exportieren
- darf_organisation_sperren
- darf_system_verwalten

**19\. Historisierung**

Festlegen: Reservierungen niemals löschen.

Nur Statusänderungen:

- beantragt
- genehmigt
- storniert
- abgelehnt
- verschoben

Dadurch bleiben alle Vorgänge nachvollziehbar.

**20\. Systemarchitektur und Benutzeroberflächen**

Die Hallenverwaltungssoftware ist als webbasierte Online-Anwendung konzipiert.

Bereich 1 - Öffentlicher Bereich

\- ohne Login

\- öffentliche Kalenderansicht

\- freie Zeiten

\- Halleninformationen

\- Rauminformationen

\- iCal-Export

Bereich 2 - Vereinsportal

\- Login

\- Buchungen beantragen

\- eigene Buchungen verwalten

\- Stornos

\- Terminverschiebungen beantragen

\- Warteliste

\- Dokumente hochladen

\- Schadensmeldungen

\- Stammdaten pflegen

Bereich 3 - Verwaltungsportal

\- Hallenverwaltung

\- Raumverwaltung

\- Genehmigungen

\- Wartelistenverwaltung

\- Sperren

\- Benutzerverwaltung

\- Rollenverwaltung

\- Tarife

\- Abrechnung

\- Auswertungen

\- Dokumentenverwaltung

\- Schadensmanagement