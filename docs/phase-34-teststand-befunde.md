# Phase 34: Teststand-Befunde aus ausfuehrlichem Klicktest

Diese Liste sammelt die Befunde aus dem ausfuehrlichen lokalen Klicktest vom
12.06.2026. Sie ist die verbindliche Arbeitsliste fuer die naechsten
Teststand-Korrekturen.

Statuswerte:

- offen
- in Arbeit
- erledigt
- bewusst spaeter

Prioritaeten:

- hoch: blockiert Teststand, Datenintegritaet oder zentrale Bedienlogik
- mittel: wichtig fuer Pilot-/Gemeinde-Test, aber nicht sofort blockierend
- niedrig: Komfort, Feinschliff oder spaetere Erweiterung

## Leitentscheidungen

### Ganztagslogik fuer Sperren und Datumsfilter

Ganztagige Sperren sollen nicht ueber eine manuelle Eingabe `00:00` bis
`24:00` geloest werden. Technisch sauber ist:

- Checkbox `ganztags`
- bei `ganztags` nur Datum eingeben
- intern speichern als Start `YYYY-MM-DD 00:00`
- intern speichern als Ende exklusiv am Folgetag `YYYY-MM-DD + 1 00:00`
- anzeigen als `ganztagig`

Damit ist eine Sperre am 06.07.2026 eindeutig:

- Start: 06.07.2026 00:00
- Ende: 07.07.2026 00:00

Nicht verwenden:

- `24:00` als gespeicherte Uhrzeit
- Ende gleich Start
- implizite Tagesdauer ohne sichtbare UI-Entscheidung

### Public-Bereich

Der Public-Bereich soll fuer Version 1 deaktivierbar sein. Umsetzung als
SystemSetting und Umgebungsvariable `PUBLIC_AREA_ENABLED`. Wenn deaktiviert,
soll `/public` nicht als Fehler wirken, sondern auf Login oder eine kurze
Hinweisseite fuehren. Der oeffentliche Kalender und iCal duerfen dann keine
Belegungsdaten ausliefern.

### Genehmigung trotz Sperre

Eine Buchung in einem gesperrten Zeitraum darf nicht einfach normal genehmigt
werden. Falls fachlich gewuenscht, braucht es eine ausdrueckliche
Ausnahmegenehmigung:

- eigenes Recht, z. B. `OVERRIDE_CLOSURE`
- Pflichtkommentar
- Warnung im UI
- Audit/Statushistorie
- klare Anzeige, dass eine Sperre bewusst uebersteuert wurde

Bis zur Umsetzung bleibt die harte Blockade durch Sperren fachlich korrekt.

## Hohe Prioritaet

| ID | Bereich | Befund | Empfehlung | Status |
| --- | --- | --- | --- | --- |
| P34-H01 | Login/Auth | Admin- und Portal-Login landen auf `Kein Zugriff`, obwohl Demo-Rechte erwartet werden. | Demo-Seed stellt Demo-Konten wieder aktiv, entfernt alte explizite Rechte-Overrides und beendet fremde aktive Demo-Mitgliedschaften. `/unauthorized` zeigt Diagnose und Abmelden. Im Klicktest nach `npm run demo:seed` verifizieren. | erledigt |
| P34-H02 | Sperren | Bei Datums-/Sperrformularen fehlt `ganztags`; Eingabe nur eines Datums ist unklar. | Checkbox `ganztags` einfuehren und intern Ende exklusiv Folgetag speichern. | erledigt |
| P34-H03 | Public | `/public` soll deaktivierbar sein, da vorerst Admin- und Vereinslogin reichen. | SystemSetting/Env-Flag fuer Public-Bereich. | erledigt |
| P34-H04 | Gebaeude/Raeume | Gebaeudesperren muessen bei Raeumen sichtbar sein; Raumsperren muessen beim Gebaeude sichtbar sein. | Closure-Sichtbarkeit in Listen/Details beidseitig anzeigen. | erledigt |
| P34-H05 | Sperren | Gebaeude- und Raumsperren muessen bearbeitbar und loeschbar/stornierbar sein. | Zentrale Closure-Verwaltung mit Bearbeiten und Loeschen. | erledigt |
| P34-H06 | Buchungsantraege | Filter nach Gebaeude und Raum fehlen; Statusfilter braucht `Alle`. | Admin-Buchungsfilter erweitern. | erledigt |
| P34-H07 | Buchungsantraege | Statusfilter bleibt nach Ablehnung optisch auf vorherigem Status, obwohl Text automatische Filteraenderung meldet. | Redirect-/Filterzustand nach Aktion synchronisieren. | erledigt |
| P34-H08 | Buchungsantraege | Genehmigung trotz Sperre wird gewuenscht, aktuell blockiert Sperre korrekt. | Nur als ausdrueckliche Ausnahmegenehmigung mit Recht und Pflichtkommentar umsetzen. | erledigt |

## Mittlere Prioritaet

| ID | Bereich | Befund | Empfehlung | Status |
| --- | --- | --- | --- | --- |
| P34-M01 | Admin-Dashboard | `Einstellungen` entfernen; Einstellungen als klappbares Menue mit Unterpunkten. | Admin-Navigation/Sidebar strukturieren. | erledigt |
| P34-M02 | Organisationen | ESV ASKOE St. Valentin zeigt 3 Mitglieder, erwartet 2. | Aktive vs. historische Mitgliedschaften pruefen; Liste ggf. nur aktive zeigen. | erledigt |
| P34-M03 | Gebaeude | Neu angelegte Hallenwart-Benutzer sind bei Gebaeuden nicht als Hallenwart auswaehlbar. | Benutzerrolle `CARETAKER` und `Caretaker`-Datensatz sauber verknuepfen. | erledigt |
| P34-M04 | Kalender | Tag/Woche/Monat/Jahr gibt es doppelt bzw. nicht synchron. | Nur einen zentralen View-Switcher anzeigen oder beide synchronisieren. | erledigt |
| P34-M05 | Kalender | Filter nach Organisation fehlt. | Admin-/Portal-Kalenderfilter erweitern. | erledigt |
| P34-M06 | Kalender | Jahresraster soll im Feld Datum plus Uhrzeit anzeigen; Jahresfilter klaeren. | Jahresansicht lesbarer machen. | erledigt |
| P34-M07 | Kalender | `Freie Zeiten` ist unklar. | Bezeichnung/Hilfetext verbessern oder Ansicht vereinfachen. | erledigt |
| P34-M08 | Ferien | Ferien duerfen nicht automatisch Gebaeude sperren; Status `geoeffnet`. | Ferien als Hinweisdaten, Sperren separat anlegen. | erledigt |
| P34-M09 | Ferien/Sperren | Es sollen separate Datensaetze angelegt werden koennen, welche Hallen in welchen Ferien gesperrt sind. | Aus Ferien heraus Closure-Datensaetze je Gebaeude/Raum optional erzeugen. | erledigt |
| P34-M10 | Warteliste | Status nach Neuanlage ist schwarz. | Badge-Farbe fuer Wartelistenstatus ergaenzen. | erledigt |
| P34-M11 | Admin-Navigation | Warteliste fehlt im linken Admin-Menue. | Admin-Sidebar um Warteliste ergaenzen, wenn `VIEW_BOOKINGS`. | erledigt |
| P34-M12 | Warteliste | Weiterbehandlung einer Wartelistenbuchung ist unklar; keine Aktionen sichtbar. | Prozess erklaeren und ggf. Admin-Aktionen sichtbar machen. | erledigt |

## Niedrige Prioritaet / Konfiguration

| ID | Bereich | Befund | Empfehlung | Status |
| --- | --- | --- | --- | --- |
| P34-L01 | Benachrichtigungen | Testmail scheitert mit `getaddrinfo ENOTFOUND smtp.example.test`. | Kein Codefehler bei Platzhalter-SMTP; UI-Hinweis verbessert und Versand mit Platzhalterwerten bewusst blockiert. Echte SMTP-Daten fuer reale Testmail benoetigen. | erledigt |
| P34-L02 | Dashboard | Einige einfache Analyse-Kacheln/Diagramme sind sinnvoll. | `Admin Dashboard Analytics Light` mit offenen Antraegen, Monatsgenehmigungen, Warteliste und Mailfehlern umgesetzt. Keine Ausschusslogik. | erledigt |

## Nicht uebernehmen

Der Ausschuss-Terminplanungs-Prompt gehoert zu einem anderen Projekt und wird
nicht in dieses Projekt uebernommen. Fuer die Hallenverwaltung bleiben nur
kleine Dashboard-Analyse-Kacheln als spaetere Option relevant.

## Empfohlene Abarbeitungsreihenfolge

1. P34-H01 Login/Auth final klaeren.
2. P34-H02 bis P34-H05 Sperren/Ganztagigkeit/Gebaeude-Raum-Sichtbarkeit.
3. P34-H06 bis P34-H08 Buchungsfilter und Ausnahmegenehmigung.
4. P34-M01, P34-M10, P34-M11 Navigation/Status-Badges.
5. P34-M04 bis P34-M07 Kalenderfilter und Verstaendlichkeit.
6. P34-M08 bis P34-M09 Ferien/Sperren trennen.
7. P34-L01 SMTP-Hinweis.
8. P34-L02 leichte Dashboard-Analytics.
