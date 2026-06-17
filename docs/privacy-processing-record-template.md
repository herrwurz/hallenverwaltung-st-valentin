# Vorlage: Verzeichnis der Verarbeitungstaetigkeit

Diese Vorlage dient als Arbeitsgrundlage fuer die Datenschutzdokumentation der
Hallenverwaltung St. Valentin. Sie muss durch die verantwortliche Stelle der
Gemeinde geprueft und freigegeben werden.

## 1. Verarbeitungstaetigkeit

| Feld | Angabe |
| --- | --- |
| Bezeichnung | Hallenverwaltung St. Valentin |
| Verantwortliche Stelle |  |
| Fachlich verantwortliche Abteilung |  |
| Technisch verantwortliche Stelle |  |
| Datenschutzkontakt |  |
| Stand / Version |  |

## 2. Zweck der Verarbeitung

- Verwaltung von Gebaeuden, Raeumen und Hallensperren.
- Verwaltung von Organisationen, Vereinen, Schulen und Kontakten.
- Entgegennahme, Pruefung und Genehmigung von Buchungsantraegen.
- Verwaltung von Wartelisten, Serienbuchungen und Terminverschiebungen.
- Benachrichtigung betroffener Benutzer per E-Mail.
- Erstellung von Auswertungen, Berichten und Abrechnungsvorbereitungen.
- Nachvollziehbarkeit durch Audit- und Statushistorien.

## 3. Betroffene Personengruppen

| Personengruppe | Beispiele |
| --- | --- |
| Benutzer der Verwaltung | Gemeinde-Mitarbeiter, Hallenverwaltung |
| Vereins-/Organisationsbenutzer | Vereinsfunktionaere, Schul-/VHS-Ansprechpartner |
| Hallenwarte | Schulwarte, Hauswarte, Betreuungspersonen |
| Organisationskontakte | Obmann, Stellvertretung, Kassier, Kontaktpersonen |
| Antragsteller | Personen, die Buchungen oder Aenderungen beantragen |

## 4. Datenkategorien

| Kategorie | Beispiele | Pflicht / optional |
| --- | --- | --- |
| Stammdaten Benutzer | Name, E-Mail, Aktivstatus | Pflicht |
| Authentifizierung | Passwort-Hash, Rollen, Rechte | Pflicht |
| Organisationsdaten | Name, Typ, Status, Sperrgrund | Pflicht |
| Kontaktdaten | E-Mail, Telefonnummer, Funktion | je nach Rolle |
| Buchungsdaten | Raum, Zeitraum, Titel, Nutzungstyp, Status | Pflicht |
| Historien | Statuswechsel, Akteur, Zeitpunkt, Grund | Pflicht |
| Benachrichtigungen | Empfaenger, Betreff, Versandstatus, Fehlertext | technisch erforderlich |
| Berichte/Exporte | Abrechnungs- und Belegungsdaten | bei Nutzung |
| Dokument-/Schadensmetadaten | Dateiname, Beschreibung, Meldender, Status | bei Nutzung |

## 5. Rechtsgrundlage

Die konkrete Rechtsgrundlage muss durch die Gemeinde festgelegt werden.

| Zweck | Rechtsgrundlage / Bemerkung |
| --- | --- |
| Hallen- und Raumverwaltung |  |
| Buchungsverwaltung fuer Vereine/Schulen |  |
| E-Mail-Benachrichtigungen |  |
| Abrechnungsvorbereitung |  |
| Audit und Nachvollziehbarkeit |  |
| Oeffentliche Kalenderanzeige |  |

## 6. Empfaenger und Zugriff

| Empfaenger / Rolle | Zugriff |
| --- | --- |
| Gemeinde-Administratoren | Verwaltungsportal und Stammdaten |
| Hallenverwaltung | Buchungen, Kalender, Sperren, Berichte |
| Hallenwarte | zugeordnete Hallen, Uebergaben, No-Shows |
| Organisationsbenutzer | eigene Organisation, eigene Antraege |
| Oeffentlichkeit | nur freigegebene Kalenderdaten, falls `/public` aktiv |
| SMTP-Dienst | E-Mail-Zustellung |
| IT-Betrieb | technischer Betrieb, Wartung, Backup |

## 7. Speicherdauer und Loeschung

Die fachlichen Fristen muessen organisatorisch beschlossen werden.

| Datenart | Vorschlag / Entscheidung |
| --- | --- |
| Benutzerkonten | deaktivieren statt loeschen, Loeschfrist festlegen |
| Organisationsmitgliedschaften | historisch beenden, nicht ueberschreiben |
| Buchungen und Statushistorie | wegen Nachvollziehbarkeit laenger aufbewahren |
| Benachrichtigungsfehler | Frist fuer Fehlertexte festlegen |
| Audit-Eintraege | Frist und Zweckbindung festlegen |
| Backups | Aufbewahrungsfrist und Loeschroutine festlegen |
| Testdaten | nach Testende loeschen oder anonymisieren |

## 8. Technische und organisatorische Massnahmen

Verweis auf:

- `docs/security-tom-checklist.md`
- `docs/security-privacy-readiness.md`
- `docs/go-live-evidence.md`

## 9. Risiken und Schutzbedarf

| Risiko | Einschaetzung | Massnahme |
| --- | --- | --- |
| Unbefugter Adminzugriff |  | Rollen/Rechte, sichere Passwoerter, Serverzugriff begrenzen |
| Falsche oeffentliche Kalenderdetails |  | Public-Bereich deaktivieren oder nur belegt/frei |
| Mailversand an falsche Empfaenger |  | Testmail, Event-Schalter, Queue-Kontrolle |
| Verlust der Datenbank |  | Backup und Restore-Probe |
| Vermischung Test/Produktion |  | getrennte `.env.test` und `.env.production` |
| Secrets in Logs/Tickets |  | keine Secrets protokollieren |

## 10. Freigabe

| Rolle | Name | Entscheidung | Datum |
| --- | --- | --- | --- |
| Fachverantwortung |  | offen |  |
| Datenschutz |  | offen |  |
| IT-Sicherheit/Betrieb |  | offen |  |

