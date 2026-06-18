# Bedienungsanleitung — Testbetrieb (Gemeinde)

Zweck
-----
Diese Anleitung richtet sich an Gemeindemitarbeiterinnen, Vereinsverantwortliche und Tester. Sie erklärt intuitiv und ohne technische Details, welche Menüs es gibt, welche Aufgaben dort üblich sind und wie Standardabläufe (Use Cases) aussehen.

Sicherheitshinweis
-----------------
Der `SUPER-ADMIN`-Zugang ist nur für das Technikteam und wird nicht öffentlich weitergegeben. Alle Routineaufgaben werden mit `ADMIN`- oder Portal-Konten durchgeführt.

Kurz: Menüs & Aufgaben
----------------------
- Dashboard: Übersicht über offene Anfragen, anstehende Buchungen und wichtige Hinweise. Startpunkt für tägliche Checks.
- Kalender: Visualisierung der Hallen und Räume in Tages-/Wochen-/Monatsansicht. Hier sehen Sie geblockte Zeiten, Genehmigungen und Übersichten pro Raum.
- Buchungen: Liste aller Buchungsanträge mit Filter (Status, Raum, Zeitraum). Als Antragsteller: Buchung anlegen. Als Admin: Anfragen prüfen, genehmigen oder ablehnen.
- Serienbuchungen: Bereich für wiederkehrende Termine (z. B. wöchentlich). Einzeltermine werden automatisch erzeugt und durchlaufen die normale Genehmigung.
- Warteliste: Übersicht und Verwaltung der Warteliste für ausgebuchte Zeiten. Reihenfolge nach Eingangszeit.
- Sperren / Hallen-Sperren: Räume oder Gebäude zeitweise sperren (z. B. Wartung, Feiertag). Sperren haben Priorität vor Buchungen.
- Organisationen / Vereine: Stammdaten zu Vereinen und Ansprechpartnern verwalten (Admin-Recht).
- Benutzer & Rollen: Nur für Administratoren: Benutzer anlegen, Rollen zuweisen oder deaktivieren.
- Dokumente: Veranstaltungsdokumente, Schadensmeldungen, Fotos — Metadaten werden hier verwaltet.
- Abrechnung / Exporte: Vorbereitung von Abrechnungen, CSV/Excel-Export. Keine automatische Rechnungslegung im Testbetrieb.
 - Abrechnung / Exporte: Vorbereitung von Abrechnungen, CSV/Excel-Export. Keine automatische Rechnungslegung im Testbetrieb.
    Hinweis: Eine vollständige Abrechnungs-Engine ist in dieser Testversion noch nicht implementiert; es ist derzeit nur die Abrechnungsvorbereitung und der Export vorgesehen.
- Hilfe / Support: Kontaktinformationen, Fehler melden, kurze FAQs.

Stammdaten — Was gehört dazu und wie pflegen?
-------------------------------------------
Die Stammdaten bilden die Grundlage für alle Buchungen und Abläufe. In dieser Sektion ist beschrieben, welche Daten gepflegt werden sollten, wer das tun kann und wie typische Pflegeabläufe aussehen.

- Gebäude / Locations
   - Inhalt: Name, Adresse, Beschreibung, Kontakt, Hauptfoto.
   - Wer pflegt: Gemeindetechnik / Sachbearbeiter.
   - Typische Aktionen: Neues Gebäude anlegen, Adresse korrigieren, Foto hochladen.

- Räume / Hallen
   - Inhalt: Raumname, Kapazität (Personen), Größe (m²), Ausstattung (Tische, Bühne, Beamer), Standardpreise, Öffnungszeiten, Raumfotos.
   - Wer pflegt: Sachbearbeiter, in Abstimmung mit Technik bei Ausstattung.
   - Typische Aktionen: Kapazität anpassen, Ausstattung ergänzen, Raum sperren/öffnen.

- Organisationen / Vereine
   - Inhalt: Vereinsname, Ansprechpartner, Email, Telefonnummer, Vereinsadresse, Berechtigungen (z. B. bevorzugte Buchungsrechte).
   - Wer pflegt: Sachbearbeiter / Portal-Admin.
   - Typische Aktionen: Neues Vereinsprofil anlegen, Ansprechpartner ändern.

- Benutzer & Rollen
   - Inhalt: Name, E-Mail, zugewiesene Rolle (z. B. `PORTAL_USER`, `PORTAL_ADMIN`, `ADMIN`), Status (aktiv/inaktiv).
   - Wer pflegt: Administratoren.
   - Typische Aktionen: Konto anlegen, Rolle ändern, Konto deaktivieren.

- Tarife / Preise
   - Inhalt: Preislisten pro Raum/Kategorie, Zeitbasis (Stunde/Tag), ermässigte Sätze (z. B. Vereine), Bemerkungen.
   - Wer pflegt: Sachbearbeiter / Abrechnungskontakt.
   - Typische Aktionen: Preis aktualisieren, Rabattregel hinzufügen.

- Öffnungszeiten & Sonderzeiten
   - Inhalt: Regelmäßige Öffnungszeiten pro Raum/Gebäude, Ferien-/Feiertagsregeln, eingeschränkte Zeiten.
   - Wer pflegt: Sachbearbeiter.
   - Typische Aktionen: Ferienzeitraum anlegen, eingeschränkte Zeiten einstellen (RESTRICTED/CLOSED).

- Ausstattungs- und Ressourcenliste
   - Inhalt: Inventar (z. B. Anzahl Tische, Stühle, technische Geräte), besondere Voraussetzungen (z. B. Bühne erforderlich).
   - Wer pflegt: Technik/Sachbearbeiter.
   - Typische Aktionen: Inventar aktualisieren, Ressourcenträger zuordnen.

- Hallenwarte / Caretaker
   - Inhalt: Name, Zuordnung zu Räumen, Kontaktinformationen, Zugriffsrechte (No-Show-Reporting etc.).
   - Wer pflegt: Verwaltung / Technik.
   - Typische Aktionen: Hallenwart hinzufügen, Zuständigkeit anpassen.

- Dokumentvorlagen & Kategorien
   - Inhalt: Standardtexte für Bestätigungen, Ablehnungsmotive, Schadensformulare, Dateivorlagen.
   - Wer pflegt: Fachverantwortliche in Abstimmung mit Technik.
   - Typische Aktionen: Vorlage anpassen, neue Kategorie anlegen.

- Kategorien & Tags
   - Inhalt: Veranstaltungsarten (Sport, Kultur, Privat), interne Tags zur Filterung.
   - Wer pflegt: Sachbearbeiter.
   - Typische Aktionen: Neue Kategorie erstellen, bestehende Kategorie umbenennen.

Pflege‑Workflow (kurz)
----------------------
1) Anlegen: Neue Stammdaten werden im jeweiligen Stammdaten-Menü erstellt (`Admin` → z. B. `Räume`, `Gebäude`, `Organisationen`).
2) Prüfen: Bei kritischen Änderungen (Kapazität, Preise, Öffnungszeiten) immer kurze interne Freigabe einholen.
3) Ändern: Änderungen dokumentieren (Änderungsgrund, Datum, Benutzer).
4) Kommunikation: Wichtige Änderungen (z. B. Preisänderung, Schließung über Ferien) per interner Rundmail an betroffene Vereine und Mitarbeiter kommunizieren.

Best Practices
--------------
- Verwenden Sie eindeutige, sprechende Bezeichnungen (z. B. „Halle A — Sporthalle“).
- Ergänzen Sie immer ein aussagekräftiges Foto bei neuen Räumen/Gebäuden.
- Halten Sie Kapazitäten realistisch und dokumentieren Sie Annahmen (z. B. Bestuhlung 2x2m).
- Bei Preisanpassungen: Datum und Grund vermerken, alte Preise archivieren.

Detaillierte Menüpunkte — Buchungen
-----------------------------------
Hier finden Sie die konkreten Unterfunktionen, die Sie im Menü `Buchungen` erwarten.

- Übersicht / Liste
   - Anzeige: Tabellenansicht mit Spalten für Datum, Raum, Antragsteller, Status, Genehmiger.
   - Filter: Status (`REQUESTED`, `APPROVED`, `REJECTED`, `CANCELLED`), Raum, Zeitraum, Organisation.
   - Aktionen: Detailansicht öffnen, schnelle Genehmigung/Ablehnung, Export (CSV) der gefilterten Liste.

- Buchung erstellen (Portal)
   - Formularfelder: Raumwahl, Beginn/Ende, erwartete Teilnehmerzahl, Zweck, Zusatzoptionen (Aufbau, Technik), Versicherungsnachweis als Dateiupload.
   - Validierungen: Überschneidungen prüfen, Max-Kapazität, Sperren/Feiertage beachten.
   - Ergebnis: Antrag wird mit Status `REQUESTED` angelegt und landet in der Admin-Warteschlange.

- Buchungsantrag prüfen (Admin)
   - Prüfpunkte: Verfügbarkeit, versicherungsrechtliche Angaben, notwendige Dokumente, vorherige No-Shows.
   - Aktionen: Genehmigen (`APPROVE`), Ablehnen (`REJECT` mit Grund), Vorläufige Vormerkung (`IN_REVIEW`), Kommentar für Antragsteller.
   - Folge: Genehmigte Termine erscheinen im Kalender; Ablehnungen erzeugen Benachrichtigungen.

- Serienbuchungen
   - Verwaltung für wiederkehrende Termine: Übersicht über alle erzeugten Einzeltermine, Möglichkeit einzelne Termine abzusagen oder zu verschieben.
   - Hinweis: Serien erzeugen viele Einzelanträge mit jeweils eigenem Status; Änderungen der Serie betreffen nicht automatisch bereits erzeugte Einzeltermine.

- Warteliste
   - Ansicht: Wartelistenplätze pro Zeitraum/Raum, Platz 1 zuerst.
   - Aktionen: Platz best&auml;tigen oder ablehnen, manuelles Verschieben, automatisiertes Angebot per Benachrichtigung (falls SMTP konfiguriert).

- No-Show / Nachbearbeitung
   - Erfassen: Hallenwarte oder Admins können No-Shows protokollieren; Eintrag wird auditiert.
   - Wirkung: Keine automatische Sanktion, aber als Entscheidungsgrundlage für künftige Vergaben nutzbar.

- Kalenderintegration
   - Visualisierung: Genehmigte Buchungen als Kalenderereignisse pro Raum/Spalte.
   - Export/Sync: CSV-Export verfügbar; eine Live-Sync/CalDAV ist in Version 1 nicht enthalten.

- Benachrichtigungen & E-Mails
   - Hinweis: Das System generiert Benachrichtigungstexte (Bestätigung, Ablehnung, Wartelistenangebot). Ob E-Mails tatsächlich versendet werden, hängt von der SMTP-Konfiguration (siehe Hinweis weiter unten).

Detaillierte Menüpunkte — Stammdaten
------------------------------------
Im Bereich `Stammdaten` sind folgende Menüpunkte üblicherweise vorhanden; jede Einzelseite hat typische Felder und Aktionen.

- Gebäude / Locations
   - Felder: Name, Kurzcode, Adresse, Kontaktperson, Hauptfoto, Beschreibung, aktive/inaktive Kennzeichnung.
   - Aktionen: Gebäude anlegen, deaktivieren, Ansprechpartner ändern, Standort- und Bilderpflege.

- Räume / Hallen
   - Felder: Raumcode, Bezeichnung, Kapazität, Fläche, Standardpreise, Zeitfenster/Öffnungszeiten, Ausstattung, Fotos.
   - Aktionen: Raum anlegen, Standardpreise setzen, Ressourcen (Inventar) zuordnen, Öffnungszeiten pflegen.

- Organisationen / Vereine
   - Felder: Vereins-ID, Name, Ansprechpartner, Kontakt, Berechtigungsstufe, Notizen.
   - Aktionen: Vereinsprofil anlegen, Status (aktiv/inaktiv), bevorzugte Preiskategorie vergeben.

- Benutzer & Rollen
   - Felder: Vorname, Nachname, E-Mail, Rolle(n), Zugeordnete Organisation, Aktiv-Flag.
   - Aktionen: Konto anlegen, Rollen zuweisen, Passwort-Reset, Audit-Historie einsehen.

- Tarife / Preise
   - Felder: Preisstufen, Gültigkeitszeitraum, Zielgruppe (z. B. Vereine), Staffelpreise.
   - Aktionen: Preis aktualisieren, Historie, Export für Abrechnung.

- Öffnungszeiten & Sonderzeiten
   - Felder: Regelöffnungszeiten, Ferienregelungen, Ausnahmedaten.
   - Aktionen: Ferienzeit anlegen, Raum temporär schließen, spezielle Veranstaltungen markieren.

- Ausstattungs- und Ressourcenliste
   - Verwaltung von Inventar, Zuweisung zu Räumen, Verfügbarkeit und besondere Hinweise (z. B. Bühne erforderlich).

- Hallenwarte / Caretaker
   - Felder: Name, Kontakt, verantwortete Räume, Zuständigkeiten.
   - Aktionen: Hallenwart zuordnen, No-Show-Berechtigung vergeben.

- Dokumentvorlagen & Kategorien
   - Aktionen: Vorlagen anlegen, Standardtexte pflegen, Dokumenttypen verwalten.

Hinweis zu E-Mail / SMTP
------------------------
Im Auslieferungszustand des Testpiloten ist SMTP nicht konfiguriert — das bedeutet:

- Die Anwendung besitzt die Mailfunktionalitäten (Vorlagen, Trigger, Queue-Logik), aber
- Ohne konfigurierte SMTP-Einstellungen werden keine externen E-Mails an reale Adressen verschickt.
- In Tests erscheint die Mailausgabe in Logs oder als Vorschau; zur echten Zustellung konfigurieren Sie die SMTP-Parameter in der Umgebungsdatei (`.env`) oder im Bereitstellungs-Setup (SMTP-Host, Port, Benutzer, Passwort, TLS).

Empfehlung: Vor Live-Tests SMTP mit einem Testkonto oder SMTP-Dienst (z. B. Mailtrap, test.smtp) konfigurieren, um Mail-Flows realistisch zu prüfen, ohne Produktionsadressen zu nutzen.


Standardabläufe (Use Cases)
---------------------------
1) Buchung anlegen (Vereinsnutzer / Bürger)
   - Menü: `Portal` → `Buchung erstellen`
   - Schritte: Raum, Datum & Uhrzeit, Teilnahmezahl eingeben → Formular absenden.
   - Erwartet: Antrag erhält Status `REQUESTED`. Bestätigungsmail (Test) wird generiert.

2) Buchungsanfrage prüfen und genehmigen (Verwaltung / Admin)
   - Menü: `Admin` → `Buchungen`
   - Schritte: Filter auf `REQUESTED` setzen → Anfrage öffnen → Details prüfen (Versicherung, Zweck, Überschneidungen) → `Approve` oder `Reject` klicken.
   - Erwartet: Bei `Approve` wird Status `APPROVED` und der Termin im Kalender sichtbar. Bei `Reject` erhält der Antragsteller eine Ablehnung.

3) Serienbuchung anlegen (Verein)
   - Menü: `Portal` → `Serienbuchung`
   - Schritte: Wiederkehrendes Muster wählen (z. B. wöchentlich, mehrere Wochentage), Start- und Enddatum festlegen → absenden.
   - Erwartet: Einzeltermine im System als `REQUESTED` erscheinen; jedes Einzelereignis wird durch den normalen Prüfprozess geführt.

4) Sperre anlegen (Verwaltung)
   - Menü: `Admin` → `Sperren` / `Closure`
   - Schritte: Raum/Gebäude, Grund, Beginn/Ende angeben → Sperre speichern.
   - Erwartet: Betroffene Buchungen im Zeitraum werden markiert oder blockiert; neue Anfragen für den Zeitraum werden verhindert.

5) Warteliste verwalten (Verwaltung)
   - Menü: `Admin` → `Warteliste`
   - Schritte: Wartelistenplätze prüfen → wenn frei wird, Platz 1 per Benachrichtigung informieren oder automatisiert verschieben.
   - Erwartet: Reihenfolge nach Eingangszeit; Frist (z. B. 48 Stunden) für Platzannahme beachten.

6) No-Show melden (Hallenwart)
   - Menü: `Admin` → `Buchungen` → gebuchte Veranstaltung auswählen → `No-Show` protokollieren.
   - Erwartet: No-Show wird protokolliert, keine automatische Abrechnung, Eintrag wird auditiert.

7) Benutzerkonto anlegen (Admin)
   - Menü: `Admin` → `Benutzer`
   - Schritte: Neue Nutzerinformationen (Name, Email, Rolle) eingeben → Konto anlegen → Passwort sicher übergeben.
   - Erwartet: Konto kann sich beim ersten Login ein Passwort setzen.

Fehler melden & Informationen sammeln
-----------------------------------
Wenn ein Fehler auftritt, notieren Sie:
- Welche Aktion Sie ausgeführt haben (z. B. „Buchung anlegen“)
- Welche Rolle Sie hatten (Portal-Benutzer / Admin)
- Datum & Uhrzeit
- Screenshots und die verwendete URL

Diese Informationen an das Technikteam senden (siehe Kontakt unten).

Kontenvergabe & Passwörter
-------------------------
- Testkonten werden zentral vom Technikteam angelegt.
- Passwörter werden per sicherem Kanal (z. B. Passwort-Manager, verschlüsselte Mail) übergeben.
- Nach Testende Passwörter ändern oder Konten deaktivieren.

Standard-Logindaten (Testpilot-Auslieferungszustand)
--------------------------------------------------
Im Auslieferungszustand dieser Testumgebung werden üblicherweise einige vorbereitete Testkonten eingerichtet, damit Verwaltung und Vereine schnell loslegen können. Die tatsächlichen Zugangsdaten (insbesondere Passwörter) werden vom Technikteam sicher verteilt. Beispiele für die vorkonfigurierten Kontotypen:

- Gemeinde (Verwaltung / Admin)
   - Benutzer (Beispiel): gemeinde.admin@beispiel.local
   - Passwort (Beispiel): Test1234!Test
   - Rolle: `ADMIN`
   - Zweck: Vollständige Verwaltungs- und Genehmigungsrechte (Buchungen prüfen, Sperren anlegen, Stammdaten pflegen).

- Verein (Portal-Benutzer)
   - Benutzer (Beispiel): verein.mustermann@verein.local
   - Passwort (Beispiel): Test1234!Test
   - Rolle: `PORTAL_USER`
   - Zweck: Buchungen anlegen, eigene Anträge verwalten, Dokumente hochladen.

- Hallenwart / Caretaker
   - Benutzer (Beispiel): hallenwart.mustermann@beispiel.local
   - Passwort (Beispiel): Test1234!Test
   - Rolle: `CARETAKER` (oder entsprechendes internes Recht)
   - Zweck: No-Show-Meldungen, lokale Handover-Schritte, Sicht auf zugewiesene Räume.

Wichtiger Hinweis: In dieser Testversion ist keine Self-Service-Funktion zum Ändern von Passwörtern über das UI implementiert. Zugangsdaten werden zentral gesetzt oder vom Technikteam zurückgesetzt. Bitte behandeln Sie die Zugangsdaten vertraulich und fordern Sie neue Testkonten beim Technikteam an, falls weitere Rollen benötigt werden.

Kurze SUPER-ADMIN Richtlinie
----------------------------
- `SUPER-ADMIN` ist nur für technische Aufgaben (Setup, Migrationen, Notfallwiederherstellung).
- Nicht verwenden für Routine-Tests oder Genehmigungen.
- Jede Nutzung dokumentieren: Zweck, Zeitpunkt, verantwortliche Person.

Abschluss & Verantwortlichkeiten
--------------------------------
- Betriebsverantwortlich: Gemeindetechnik (Deployment, Backups)
- Fachverantwortlich: Sachbearbeiter für Buchungen (Genehmigungen, Sperren)
- Support: Technikteam (Fehler, Zugangsprobleme)

Kontakt
-------
Technikteam: Mag. Andreas Hofreither / +43 (664) 23 14 524 / andreas@hofreither.at
Fachkontakt Buchungen: [Name/Email eintragen]

Möchten Sie, dass ich diese Anleitung als PDF exportiere oder weitere Screenshots/Beispiele ergänze? Die Datei habe ich im Repo abgelegt unter: [docs/testbetrieb-bedienungsanleitung.md](docs/testbetrieb-bedienungsanleitung.md)

Weitere Standardabläufe — Gemeinde (Verwaltung)
---------------------------------------------
- Stornierung einer bestätigten Buchung:
   - Menü: `Admin` → `Buchungen`
   - Schritte: Buchung auswählen → `Cancel`/`Stornieren` → Grund eingeben → Buchung auf `CANCELLED` setzen → betroffene Parteien informieren.
   - Erwartet: Termin ist aus Kalender entfernt/markiert; Audit-Eintrag vorhanden.

- Ersatztermin erstellen (nach Ablehnung oder Verschiebung):
   - Menü: `Admin` → `Buchungen` oder `Serien`
   - Schritte: Neue Anfrage manuell anlegen oder Änderungsantrag annehmen und neuen Termin anlegen → alten Termin ggf. als `MOVED` kennzeichnen.
   - Erwartet: Konsistente Historie, Nutzerbenachrichtigung.

- Notfall-Schließung (z. B. Unwetter, Sicherheit):
   - Menü: `Admin` → `Sperren` / `Closure`
   - Schritte: Große Sperre für betroffenes Gebäude anlegen, kommunizieren, laufende Veranstaltungen kontaktieren.
   - Erwartet: Sofortige Blockierung, Hinweise im Dashboard, ggf. manuelle Nachbearbeitung genehmigter Buchungen.

- Abrechnungsexport für Abrechnungsteam:
   - Menü: `Admin` → `Abrechnung` / `Berichte`
   - Schritte: Zeitraum wählen → Export (CSV/Excel) generieren → Datei für Buchhaltung bereitstellen.
   - Erwartet: Vollständige Liste genehmigter Buchungen mit Preisen und Rechnungsreferenzen.
   Hinweis: Die automatische Erstellung und der Versand von Rechnungen sind in Version 1 noch nicht implementiert; hier erfolgt lediglich die Export-Vorbereitung zur weiteren Verarbeitung extern.

- Rollen-/Rechteüberprüfung (Quarterly):
   - Menü: `Admin` → `Rollen/Rechte` / `Benutzer`
   - Schritte: Rollenliste prüfen, inaktive Nutzer deaktivieren, besondere Rechte dokumentieren.
   - Erwartet: Minimale Berechtigungsvergabe, dokumentierte Ausnahmen.

Weitere Standardabläufe — Verein (Portal)
---------------------------------------
- Buchung stornieren (Antragsteller):
   - Menü: `Portal` → `Buchungsanträge`
   - Schritte: Eigene Buchung auswählen → `Stornieren` anklicken → Grund angeben.
   - Erwartet: Status auf `CANCELLED`, Benachrichtigung an Verwaltung.

- Buchung ändern (Antragsteller):
   - Menü: `Portal` → `Buchungsanträge`
   - Schritte: Änderungswunsch einreichen (Datum/Uhrzeit/Raum) → Änderungsantrag absenden.
   - Erwartet: Änderungsantrag im Admin zur Prüfung, automatische Benachrichtigung bei Entscheidung.

- Wartelistenplatz annehmen:
   - Menü: `Portal` → `Warteliste`
   - Schritte: Angebot annehmen innerhalb Frist (z. B. 48h) → Buchung finalisieren.
   - Erwartet: Platz wird bestätigt; falls nicht angenommen, wird nächster Platz informiert.

- Schadensmeldung (Verein meldet Schaden):
   - Menü: `Portal` → `Schadensmeldungen`
   - Schritte: Schaden beschreiben, Foto optional anhängen, Absenden.
   - Erwartet: Schaden erscheint in Admin-Übersicht, Sachbearbeitung weist Maßnahmen zu.

- Veranstaltungsunterlagen hochladen:
   - Menü: `Portal` → `Dokumente`
   - Schritte: Verträge, Versicherungsnachweise hochladen → Dokumenttyp wählen → absenden.
   - Erwartet: Admin prüft Dokumente vor Genehmigung, Upload wird als Metadaten gespeichert.

Urheber / Ersteller
-------------------
Diese Anwendung wurde entwickelt und erstellt von Andreas Hofreither.
Alle Rechte vorbehalten. Für Fragen zur Anwendung oder zum Testbetrieb kontaktieren Sie bitte den/ die oben genannte(n) Ansprechpartner(innen).

Ausblick — Mögliche Erweiterungen
---------------------------------
Im weiteren Projektverlauf sind mehrere größere Module denkbar, die den Funktionsumfang erweitern und den Betrieb vereinfachen. Nachfolgend ein kurzer Überblick (nicht abschließend):

- PSP-Integration (Payment Service Provider)
   - Hinweis: Eine direkte PSP-Integration ist derzeit nicht erforderlich und wird vorerst nicht implementiert. Bei Bedarf kann diese später zur Zahlungsabwicklung ergänzt werden.

- Benachrichtigungen / SMTP-Engine: E-Mail-Queue, Templates, Retry-Logik, Test-SMTP.
- Background Jobs / Worker: Asynchrone Verarbeitung (E-Mails, Exporte, Fristen), Redis/Bull.
- Abrechnung / Invoicing: Rechnungs-Engine, Nummernkreise, PDF-Rechnungen, Export.
- Kalender / Resource Timeline mit Drag&Drop: Raumspalten, 30-Min-Raster, Änderungsanträge.
- Fortgeschrittene Buchungsregeln: Prioritäten, Blockbuchungen, Konfliktauflösung.
- Wartelisten-Automatisierung: Angebote, Fristen, automatisches Befüllen.
- Dokumenten-Storage (Objektstore): S3/MinIO-Integration, presigned URLs, storageKey-Handling.
- Audit & History: Append-only Auditlogs für Statuswechsel und administrative Aktionen.
- Rollen & Feingranulares RBAC: UI zur Verwaltung feiner Berechtigungen.
- Benutzer-Self-Service: Registrierung, Passwort-Reset-Flow (abhängig von SMTP).
- Reporting & Scheduled Exports: Geplante Exporte, KPI-Dashboards.
- Monitoring & Healthchecks: Sentry, Metriken, Health-Endpunkte.

Wenn gewünscht, kann das Technikteam priorisieren, welche dieser Module als nächstes umgesetzt werden sollen. Die wichtigsten operativen Punkte sind SMTP/Notifications, Background-Jobs, Audit/History und Document-Storage.

