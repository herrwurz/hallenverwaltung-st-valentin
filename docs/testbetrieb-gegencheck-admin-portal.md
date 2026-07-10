# Gegencheck Testbetrieb (Admin + Portal)

Ziel
----
Schneller Realitaetscheck, ob Doku und Anwendung fuer die Kernablaeufe uebereinstimmen.
Dauer: ca. 20-30 Minuten.

Rollen fuer den Check
---------------------
- 1x Admin-Konto
- 1x Portal-Konto (Verein/Organisation)

Vorbereitung
------------
1. Beide Konten koennen sich anmelden.
2. Mindestens 1 Gebaeude, 1 Raum, 1 Nutzungstyp und 1 Organisation sind vorhanden.
3. Beide Tester arbeiten mit Datum/Uhrzeit-Screenshots.

Checkliste Portal (Verein)
--------------------------
1. Portal Startseite
- Erwartet: Menues Buchungsantraege, Kalender, Warteliste, Dokumente, Schadensmeldungen.

2. Einzeltermin beantragen
- Menue: Portal -> Buchungsantraege
- Eingabe: Organisation, Raum, Nutzungstyp, Start/Ende, Titel
- Erwartet: Status REQUESTED sichtbar.

3. Serienantrag erstellen
- Menue: Portal -> Buchungsantraege -> Neuer Serienantrag
- Erwartet: Serie speichert; Einzeltermine erscheinen als REQUESTED.

4. Warteliste anlegen
- Menue: Portal -> Warteliste
- Erwartet: Eintrag angelegt; Platzierung nachvollziehbar.

5. Dokument und Schaden
- Menue: Portal -> Dokumente / Schadensmeldungen
- Erwartet: Speichern moeglich, Eintraege in Liste sichtbar.

Checkliste Admin (Verwaltung)
-----------------------------
1. Admin Navigation
- Erwartet: Dashboard/Kalender sowie Buchungs- und Stammdatenbereiche sichtbar (rechteabhaengig).
- Erwartet: Nutzungstypen im Bereich Stammdaten vorhanden.

2. Buchungsantrag pruefen
- Menue: Admin -> Buchungsantraege
- Aktion: Einen REQUESTED-Antrag auf APPROVED oder REJECTED setzen.
- Erwartet: Statuswechsel sichtbar und konsistent.

3. Warteliste pruefen
- Menue: Admin -> Warteliste
- Erwartet: Reihenfolge nach Eingangszeit; Angebote mit 48h-Frist nachvollziehbar.

4. Ferien und Sperren
- Menue: Admin -> Ferien
- Erwartet: Ferienzeitraeume als Hinweislogik fuer Serien.
- Erwartet: Fuer echte Schliessung separat Sperre erzeugbar.

5. Nutzungstypen pruefen
- Menue: Admin -> Nutzungstypen
- Erwartet: Nutzungstypen mit Prioritaet und Genehmigungseigenschaften bearbeitbar.

6. Tarife pruefen
- Menue: Admin -> Tarife
- Erwartet: Tarifgruppen und Tarife je Raum/Tagesart sichtbar; Klick auf Zeile oeffnet Bearbeitungsfenster.

Abnahmekriterium
----------------
- Alle Punkte ohne Widerspruch zwischen UI und Doku.
- Keine Menues in der Doku, die in der UI nicht sichtbar sind.
- Nutzungstypen in Doku und UI gleich benannt.

Fehlerprotokoll (Kurzschema)
----------------------------
- Schritt:
- Erwartet:
- Tatsaechlich:
- Rolle/Konto:
- URL:
- Screenshot:
- Zeit:

Stand
-----
- Version: Gegencheck Admin/Portal
- Aktualisiert: 2026-07-09
