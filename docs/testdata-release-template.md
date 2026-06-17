# Vorlage: Testdaten- und Echtdatenfreigabe

Diese Vorlage regelt, ob und wie Daten fuer einen lokalen Teststand, einen
externen Testserver oder den Gemeinde-Server verwendet werden duerfen.

Grundregel: Ein Testsystem soll keine echten Produktivdaten enthalten, solange
dies nicht ausdruecklich freigegeben und technisch abgesichert ist.

## 1. Testumfang

| Feld | Angabe |
| --- | --- |
| Testname / Phase |  |
| Umgebung | lokal / eigener Testserver / Gemeinde-Server |
| Zeitraum |  |
| Verantwortlich Fachbereich |  |
| Verantwortlich Technik |  |
| Datenschutz einbezogen | ja / nein |

## 2. Datenquelle

| Datenart | Geplante Quelle | Freigegeben |
| --- | --- | --- |
| Benutzer | Demo / anonymisiert / echt | offen |
| Organisationen | Demo / anonymisiert / echt | offen |
| Raeume/Gebaeude | Demo / real | offen |
| Buchungen | Demo / anonymisiert / echt | offen |
| E-Mail-Adressen | Testpostfach / anonymisiert / echt | offen |
| Dokumente/Uploads | keine / Demo / echt | offen |
| Schadensmeldungen | keine / Demo / echt | offen |

## 3. Entscheidung

- [ ] Es werden ausschliesslich Demo-Daten verwendet.
- [ ] Es werden anonymisierte oder pseudonymisierte Daten verwendet.
- [ ] Es werden echte personenbezogene Daten verwendet.

Wenn echte personenbezogene Daten verwendet werden:

| Pflichtentscheidung | Ergebnis |
| --- | --- |
| Zweck des Echtdaten-Tests begruendet |  |
| Zugriff auf Testsystem begrenzt |  |
| Test-SMTP oder Mailversand geregelt |  |
| Oeffentlicher Bereich deaktiviert oder freigegeben |  |
| Loeschung/Anonymisierung nach Testende geregelt |  |
| Datenschutzfreigabe dokumentiert |  |

## 4. E-Mail-Regelung

| Frage | Entscheidung |
| --- | --- |
| Wird Mailversand aktiviert? | ja / nein |
| Wenn ja: nur Testpostfach? | ja / nein |
| Wenn echte Empfaenger: fachlich freigegeben? | ja / nein |
| `MAIL_DELIVERY_MODE` | disabled / smtp |
| Testmail erfolgreich nachgewiesen | ja / nein |

## 5. Public-Bereich und Kalender

| Einstellung | Entscheidung |
| --- | --- |
| `PUBLIC_AREA_ENABLED` | true / false |
| Oeffentliche Kalenderanzeige | belegt/frei / Vereinsname / Veranstaltungsname |
| Oeffentliche Suche | nicht Teil von Version 1 |
| iCal-Export aktiv | ja / nein |

## 6. Zugriff auf das Testsystem

| Person / Gruppe | Zweck | Zeitraum | Freigegeben |
| --- | --- | --- | --- |
|  |  |  |  |

## 7. Bereinigung nach Testende

| Massnahme | Verantwortlich | Datum | Nachweis |
| --- | --- | --- | --- |
| Testbenutzer deaktivieren oder loeschen |  |  |  |
| Testdatenbank loeschen oder archivieren |  |  |  |
| Backups mit Testdaten bereinigen |  |  |  |
| Test-SMTP/Passwoerter deaktivieren |  |  |  |
| Ergebnis dokumentieren |  |  |  |

## 8. Freigabe

| Rolle | Name | Entscheidung | Datum |
| --- | --- | --- | --- |
| Fachbereich |  | offen |  |
| Technik/Betrieb |  | offen |  |
| Datenschutz |  | offen |  |

