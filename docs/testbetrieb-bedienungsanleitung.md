# Bedienungsanleitung Testbetrieb – Hallenverwaltung St. Valentin

Ziel dieser Anleitung
----------------------
Diese Anleitung führt Sie einmal von oben nach unten durch die Anwendung: anmelden, sich orientieren,
die wichtigsten Abläufe für Verein und Gemeinde kennenlernen, und wissen, wofür die übrigen Menüpunkte da sind.
Sie brauchen dafür nichts zu installieren – die Anwendung läuft komplett im Browser.

Anmelden
-----------
Adresse: **https://hallenverwaltung.hofreither.at**

Für den Testbetrieb stehen zwei Test-Konten bereit:

| Rolle | E-Mail | Passwort | Sie landen in |
| --- | --- | --- | --- |
| Verein / Organisation | verein@test.local | Test1234!Test | Vereinsportal (`/portal`) |
| Gemeindeverwaltung | gemeinde@test.local | Test1234!Test | Verwaltungsportal (`/admin`) |

Geben Sie die E-Mail-Adresse und das Passwort auf der Anmeldeseite ein und bestätigen Sie mit „Anmelden“.
Ihr eigenes, persönliches Konto legt die Gemeinde später für Sie an (siehe Abschnitt „Benutzer anlegen“ weiter unten).

Erster Überblick nach der Anmeldung
---------------------------------------
Je nach Rolle sehen Sie unterschiedliche Bereiche. Die Menüs sind rechteabhängig – Sie sehen nur, was für Ihre
Rolle vorgesehen ist.

**Als Verein landen Sie im Vereinsportal** mit fünf Bereichen:
- Buchungsanträge
- Kalender
- Warteliste
- Dokumente
- Schadensmeldungen

**Als Gemeinde landen Sie im Verwaltungsportal** mit einem Dashboard und einer linken Navigation, gegliedert in:
- Dashboard und Kalender
- Stammdaten (Gebäude, Räume, Organisationen, Benutzer, Rollen/Rechte, Nutzungstypen, Tarife)
- Buchungen (Buchungsanträge, Änderungsanträge, Serien, Warteliste)
- Extras (Abrechnung, Dokumente, Schäden, Hallenübergaben, Zutritte)
- Einstellungen (Ferien, Systemeinstellungen, Mail/SMTP, Benachrichtigungen, Öffentlicher Kalender, System-Jobs, No-Shows)

Stammdaten – die Basis, die zuerst stimmen muss
----------------------------------------------------
„Stammdaten“ sehen nur Gemeinde-Rollen. Das sind die Grunddaten, auf denen alle Buchungen aufbauen. Empfohlene
Reihenfolge beim erstmaligen Einrichten:

1. **Gebäude** – Standorte mit Adresse, Kontakt und Hauswart.
2. **Räume** – jedem Gebäude zugeordnet, mit Öffnungszeiten, Status und optionalen Teilbereichen (z. B. Halle A/B als
   Teil einer Gesamthalle).
3. **Organisationen** – Vereine, Schulen, VHS. Jede Organisation hat einen Typ, einen Status (aktiv/gesperrt) und
   optional eine Tarifgruppe für die Abrechnung.
4. **Nutzungstypen** – kategorisieren Buchungen (z. B. Training, Meisterschaftsspiel, Schulnutzung) und steuern, ob eine
   Buchung genehmigt werden muss und ob sie niedriger priorisierte Buchungen verdrängen darf.
5. **Tarife** – Preise je Raum, Tarifgruppe und Tageszeit für die Abrechnung. Ohne Angabe von Nutzungstyp oder
   Organisationsart gilt ein Tarif automatisch für alle; spezifischere Tarife gehen vor.
6. **Benutzer und Rollen/Rechte** – wer sich anmelden darf und was er darf (siehe unten).

**Bedienung:** In jeder Stammdaten-Liste öffnet ein Klick auf einen Eintrag ein Bearbeitungsfenster mit den
Details. Über den Button „+ Neu“ oberhalb der Liste legen Sie einen neuen Eintrag an. Zum Verwerfen genügt „Abbrechen“
oder ein Klick außerhalb des Fensters.

**Benutzer anlegen:** Admin → Benutzer → „+ Neuer Benutzer“. Anzeigename und E-Mail eingeben, passende Rolle
ankreuzen (z. B. Gemeindeverwaltung, Hallenwart, Verein) und bei Bedarf eine oder mehrere Organisationen zuordnen.
Das Passwortfeld bleibt dabei leer (siehe nächster Abschnitt).

Registrierung und Mailverkehr
--------------------------------
Es gibt keine Selbstregistrierung – jedes Konto wird von der Gemeinde angelegt. Damit dabei kein Passwort
telefonisch durchgegeben werden muss, läuft die Registrierung in vier Schritten:

1. Die Gemeinde legt zuerst die Organisation an (Stammdaten → Organisationen), danach den Benutzer dafür
   (Stammdaten → Benutzer) – **ohne Passwort einzugeben.**
2. Der Verein bekommt automatisch eine E-Mail „Konto aktivieren“ mit einem Link. Der Link ist 7 Tage gültig.
3. Über den Link vergibt der Verein sein eigenes Passwort (mindestens 8 Zeichen).
4. Ab jetzt kann sich der Verein normal über die Anmeldeseite einloggen.

Ist der Link abgelaufen oder verloren gegangen, hilft „Passwort vergessen?“ auf der Anmeldeseite weiter – er
erzeugt einen neuen Link nach demselben Prinzip. Versucht jemand sich anzumelden, bevor ein Passwort vergeben
wurde, zeigt die Anmeldeseite das direkt und verständlich an, statt nur „Passwort falsch“ zu melden.

**Laufender Mailverkehr:** Ab dem ersten Buchungsantrag läuft die Kommunikation zwischen Verein und Gemeinde
automatisch per E-Mail, ganz ohne weiteres Zutun. Jeder Schritt löst eine Mail an die Beteiligten aus:
- Buchung/Serie/Verschiebung beantragt → in Prüfung → genehmigt/abgelehnt
- Wartelistenangebot erstellt bzw. abgelaufen
- Sperre angelegt, Schaden gemeldet, No-Show gemeldet
- Organisation gesperrt/stillgelegt, Konto deaktiviert

Empfänger sind jeweils die antragstellende Person, der als „primär“ hinterlegte Organisationskontakt und die
zuständigen Gemeinde-Mitarbeiter. Welche dieser Ereignisse Mails auslösen, lässt sich unter Admin → Einstellungen
→ Benachrichtigungsregeln einzeln ein- und ausschalten – die Aktivierungs- und Passwort-Mails sind davon
bewusst ausgenommen und funktionieren immer, damit niemand ausgesperrt bleibt.

Buchungen – Standardablauf für Vereine
-------------------------------------------
**Einzeltermin beantragen**
- Menü: Buchungsanträge → Formular „Neuer Buchungsantrag“
- Angeben: Gebäude/Raum, Titel, Nutzungstyp, Beginn und Ende
- Ergebnis: Der Antrag erhält den Status *Beantragt* und wartet auf Entscheidung durch die Gemeinde

**Serientermin beantragen** (z. B. wöchentliches Training über die Saison)
- Menü: Buchungsanträge → Formular „Neuer Serienantrag“
- Angeben: Rhythmus (täglich/wöchentlich/monatlich/jährlich), Zeitraum, optional Ausnahmedaten
- Ganztägige oder mehrtägige Termine sind über die Checkbox „Ganztägig“ möglich
- Ergebnis: Alle Einzeltermine der Serie werden automatisch erzeugt und einzeln zur Genehmigung eingereicht;
  Ferienzeiten werden dabei automatisch übersprungen

**Kalender lesen**
- Menü: Kalender
- Zeigt freie und belegte Zeiten; eigene Buchungen sind vollständig sichtbar, fremde nur eingeschränkt

**Warteliste nutzen**
- Menü: Warteliste → Wunschzeitraum eintragen
- Wird ein passender Slot frei, erhält der nächste Platz in der Reihenfolge ein Angebot mit 48 Stunden Frist

**Termin stornieren oder Verschiebung beantragen**
- Menü: Buchungsanträge → Abschnitt „Stornieren und Verschieben“
- Noch nicht genehmigte eigene Anträge können direkt storniert werden
- Für bereits genehmigte Termine kann eine Verschiebung mit Begründung beantragt werden (muss von der Gemeinde
  genehmigt werden)

Buchungen – Standardablauf für die Gemeinde
-------------------------------------------------
**Anträge prüfen und entscheiden**
- Menü: Admin → Buchungsanträge
- Prüfen: Konflikte mit anderen Buchungen oder Sperren, Raum, Zeitraum, Nutzungstyp
- Entscheidung: *Genehmigt* oder *Abgelehnt*, optional zunächst *In Prüfung*
- Bei Konflikten mit einer bestehenden genehmigten Buchung ist eine Genehmigung nur mit ausdrücklicher
  Übersteuerung und Begründung möglich

**Änderungsanträge bearbeiten**
- Menü: Admin → Änderungsanträge
- Hier laufen Verschiebungswünsche von Vereinen zu bereits genehmigten Terminen auf

**Serien im Überblick behalten**
- Menü: Admin → Serien
- Zeigt alle Serienanträge gebündelt statt als viele Einzeltermine

**Warteliste steuern**
- Menü: Admin → Warteliste
- Reihenfolge nach Eingangszeitpunkt, Angebote laufen automatisch nach 48 Stunden ab

Die wichtigsten Extras
---------------------------
- **Dokumente** (Portal und Admin) – Hallenordnungen, Verträge und Nachweise als Metadaten hinterlegen
- **Schadensmeldungen** (Portal und Admin) – Schäden mit Beschreibung und optionalem Foto melden bzw. bearbeiten
- **Hallenübergaben** (Admin) – Übergabeprotokolle zwischen Hausmeister und nutzender Organisation erfassen
- **Zutritte** (Admin) – Schlüssel, RFID-Karten und elektronische Zutritte je Gebäude/Raum ausgeben und zurücknehmen
- **Abrechnung** (Admin) – aus genehmigten, abrechnungsrelevanten Buchungen und den hinterlegten Tarifen
  Abrechnungspositionen für einen Zeitraum erzeugen und exportieren
- **Berichte** (Admin-Dashboard) – Tagesbelegung, Wochenplan, Monats- und Vereinsübersicht zum Ausdrucken

Die wichtigsten Einstellungen
------------------------------------
- **Ferien** (Admin → Ferien) – Ferien- und Feiertagszeiträume sind zunächst nur Hinweislogik für Serienanträge
  (Serientermine werden automatisch übersprungen). Für eine tatsächliche Schließung muss zusätzlich bewusst eine
  Gebäude- oder Raumsperre aus dem Zeitraum angelegt werden.
- **Benachrichtigungsregeln** (Admin → Einstellungen → Benachrichtigungsregeln) – steuert, bei welchen Ereignissen
  E-Mails verschickt werden. **Empfehlung für den Testbetrieb:** alle Ereignis-Schalter deaktivieren, da ein einzelner
  Serienantrag sonst sehr viele Mails auslösen kann.
- **Mail/SMTP** (Admin → Einstellungen → Mail/SMTP) – im Testbetrieb keine produktive Mailserver-Konfiguration
  eintragen.
- **Systemeinstellungen, System-Jobs, No-Shows** – weitere Feineinstellungen für den späteren Wirkbetrieb; im
  Testbetrieb in der Regel nicht relevant.

Status einer Buchung verstehen
-------------------------------------
- **Beantragt** – neu eingereicht, wartet auf Entscheidung
- **In Prüfung** – Gemeinde hat die Bearbeitung begonnen
- **Genehmigt** – Termin ist fix
- **Abgelehnt** – Termin findet nicht statt
- **Storniert** – vom Verein zurückgezogen
- **Verschoben** – Kennzeichnung des alten Termins nach einer genehmigten Verschiebung

Wenn etwas nicht funktioniert
------------------------------------
Bitte melden Sie Probleme mit folgenden Angaben:
- Was Sie tun wollten (z. B. „Buchung anlegen“)
- Mit welcher Rolle/welchem Konto Sie angemeldet waren
- Datum und Uhrzeit
- Was Sie erwartet haben und was tatsächlich passiert ist
- Ein Screenshot
- Die Adresse aus der Browser-Adresszeile

Kontakt:
- E-Mail: andreas@hofreither.at
- Dringend: +43 (664) 23 14 524

Stand
-----
- Version: Bedienungsanleitung Testbetrieb
- Aktualisiert: 2026-07-09
