# IT-Sicherheit und Datenschutz - Phase 40.1

Diese Unterlage beschreibt, welche technischen und organisatorischen
Vorbereitungen fuer einen Test- oder Produktivbetrieb der Hallenverwaltung auf
einem Gemeinde-Server erforderlich sind.

Sie ersetzt keine Rechtsberatung und keine formale Freigabe durch Datenschutz,
IT-Sicherheitsbeauftragte oder Amtsleitung. Sie ist die technische
Arbeitsgrundlage, damit diese Freigaben strukturiert vorbereitet werden
koennen.

## Ziel

- Testbetrieb und spaeterer Produktivbetrieb sollen klar getrennt sein.
- Personenbezogene Daten sollen nur im notwendigen Umfang verarbeitet werden.
- Betrieb, Backup, Rollen, Protokollierung und Vorfallbehandlung sollen vor
  der Uebergabe nachvollziehbar geregelt sein.
- Konfigurationen fuer Test und Produktion sollen ueber Environment-Variablen
  getrennt bleiben.

## Geltungsbereich

Version 1 ist Single-Tenant fuer St. Valentin.

Betroffene Bereiche:

- Verwaltungsportal `/admin`
- Vereinsportal `/portal`
- optionaler oeffentlicher Bereich `/public`
- PostgreSQL-Datenbank
- Notification Queue und E-Mail-Versand
- Worker fuer Hintergrundjobs
- Backups und Restore-Proben
- Logs und Audit-Eintraege

Nicht enthalten:

- SMS und Push
- externe Schliesssysteme
- automatische Rechnungslegung
- Zahlungsabwicklung
- Mandantenfaehigkeit

## Rollen und Verantwortlichkeiten

| Rolle | Aufgabe | Vor Go-Live klaeren |
| --- | --- | --- |
| Verantwortlicher | Gemeinde/Stadt als datenschutzrechtlich verantwortliche Stelle | ja |
| Technischer Betreiber | Gemeinde-IT oder beauftragter Serverbetreiber | ja |
| Fachverantwortung | Hallenverwaltung/Gemeindeabteilung | ja |
| Datenschutz | Datenschutzbeauftragte oder zustaendige Stelle | ja |
| IT-Sicherheit | interne IT oder beauftragte IT-Betreuung | ja |
| Auftragsverarbeiter | nur falls externer Betrieb/Hosting oder externe Wartung erfolgt | bei Bedarf |

Wenn die Anwendung auf einem Gemeinde-Server betrieben wird, ist zu klaeren, ob
externe Entwickler oder Dienstleister produktiven Zugriff erhalten. Falls ja,
braucht es mindestens eine dokumentierte Zugriffsbeschraenkung, Protokollierung
und gegebenenfalls eine Auftragsverarbeitungsvereinbarung.

## Personenbezogene Daten

Typische Datenkategorien:

- Benutzerkonten: Name, E-Mail, Aktivstatus, Rollen und Rechte
- Organisationskontakte: Name, Funktion, E-Mail, Telefon
- Buchungen: Organisation, Titel, Zeitraum, Raum, Status, Historie
- Benachrichtigungen: Empfaenger, Betreff, Versandstatus, Fehlertext
- Audit-/Job-Protokolle: Benutzer, Aktion, Zeitpunkt, technische Metadaten
- Dokument- und Schadensmetadaten: Dateiname, Beschreibung, Meldender,
  Bearbeitungsstatus

Grundsatz:

- Keine Passwoerter im Klartext speichern.
- SMTP-Passwoerter, Datenbankpasswoerter und Auth-Secrets bleiben in
  Environment-Variablen.
- Logs duerfen keine Secrets enthalten.
- Oeffentliche Kalenderansichten muessen standardmaessig datensparsam bleiben.

## Erforderliche Unterlagen

| Unterlage | Zweck | Status |
| --- | --- | --- |
| Verzeichnis der Verarbeitungstaetigkeiten | Beschreibung Zweck, Datenarten, Empfaenger, Fristen | offen |
| Berechtigungskonzept | Wer darf Admin, Portal, Berichte, Exporte, Systemjobs nutzen | technisch vorbereitet |
| TOMs / Sicherheitsmassnahmen | Zugriff, Verschluesselung, Backup, Protokollierung, Patchprozess | offen |
| Betriebs- und Backupkonzept | Serverbetrieb, Restore, Verantwortliche, Intervalle | teilweise vorhanden |
| Aufbewahrungs- und Loeschkonzept | Datenlebenszyklus fuer Buchungen, Benutzer, Organisationen, Logs | offen |
| Incident-/Datenpannenprozess | Meldeweg, Fristen, Verantwortliche, Sofortmassnahmen | offen |
| Testdatenkonzept | Keine echten Produktivdaten im Testsystem ohne Freigabe | offen |
| Abnahmeprotokoll | Fachliche und technische Freigabe vor Produktivstart | vorhanden als Vorlage |

Bestehende Projektunterlagen:

- `docs/production-readiness.md`
- `docs/go-live-runbook.md`
- `docs/go-live-open-points.md`
- `docs/go-live-evidence.md`
- `docs/installation-options.md`
- `docs/acceptance-testplan.md`
- `docs/privacy-processing-record-template.md`
- `docs/security-tom-checklist.md`
- `docs/testdata-release-template.md`

## Technische Mindestmassnahmen

### Transport und Zugriff

- Produktivbetrieb ausschliesslich ueber HTTPS.
- HTTP nur fuer Redirect oder Zertifikatserneuerung.
- Firewall nur fuer notwendige Ports oeffnen.
- Adminzugriff auf Server nur fuer benannte Personen.
- Keine gemeinsamen Admin-Zugaenge ohne organisatorische Freigabe.

### Anwendungssicherheit

- Alle `/admin/*`-Seiten serverseitig mit Rechten schuetzen.
- Mutationen duerfen nicht nur UI-seitig abgesichert sein.
- SUPER_ADMIN-Rechte duerfen nicht durch normale Admins eskaliert werden.
- Inaktive Benutzer verlieren Zugriff.
- Gesperrte Organisationen duerfen keine neuen Termine erzeugen.

### Secrets und Konfiguration

- `.env.test` und `.env.production` strikt trennen.
- Keine Secrets committen.
- `AUTH_SECRET`, Datenbankpasswort und SMTP-Passwort pro Umgebung getrennt
  vergeben.
- `MAIL_DELIVERY_MODE=disabled` nur fuer Testumgebungen.
- Produktion muss `MAIL_DELIVERY_MODE=smtp` verwenden.

### Datenbank

- PostgreSQL-Zugriff nur aus notwendigem Netzwerkbereich erlauben.
- Datenbankpasswort nicht wiederverwenden.
- Migrationen vor Produktivstart pruefen.
- Produktive Datenbank nicht mit Demo-Seeds betreiben.

### Backup und Restore

- Automatische Backups einrichten.
- Restore-Probe vor Produktivstart durchfuehren.
- Backup-Aufbewahrung organisatorisch festlegen.
- Backup-Ablage gegen unbefugten Zugriff schuetzen.
- Backup-Dateien nicht in Git oder Tickets hochladen.

### Logging und Audit

- Audit-Eintraege fuer kritische Fachvorgaenge behalten:
  Buchungen, Statuswechsel, Systemjobs, Exporte, Sperren und relevante
  Verwaltungsaktionen.
- Technische Logs duerfen keine Passwoerter, Tokens oder privaten
  Zertifikatsschluessel enthalten.
- Aufbewahrungsfrist fuer Logs und Audit-Daten festlegen.

### E-Mail

- SMTP nur ueber konfigurierte Environment-Variablen.
- Keine externen Maildienste hardcoden.
- Testmail gegen echten SMTP-Server vor Produktivstart nachweisen.
- Fehlgeschlagene Mails muessen in der Queue sichtbar bleiben.
- Massenversand oder Newsletter bleiben bis zu einer eigenen
  Datenschutzentscheidung deaktiviert.

## Datenschutzentscheidungen vor Echtdaten-Test

Vor einem Test mit echten Vereins- oder Gemeindedaten muessen mindestens diese
Punkte entschieden sein:

| Frage | Empfehlung fuer Version 1 |
| --- | --- |
| Darf der oeffentliche Bereich aktiv sein? | Standard: deaktiviert, bis fachlich freigegeben |
| Welche Kalenderdetails sind oeffentlich sichtbar? | Standard: nur belegt/frei |
| Duerfen echte E-Mail-Adressen im Testserver verwendet werden? | Nur mit Test-SMTP oder ausdruecklicher Freigabe |
| Duerfen Produktivdaten in Testumgebung kopiert werden? | Nein, ausser mit Freigabe und Schutzmassnahmen |
| Wie lange bleiben Benachrichtigungsfehler sichtbar? | Frist festlegen, da Empfaenger/Fehlertexte personenbezogen sein koennen |
| Wie werden ausgeschiedene Vereinsfunktionaere behandelt? | Benutzer deaktivieren, Mitgliedschaft historisch beenden |

## Go-Live-Stop-Kriterien

Ein Echtdaten- oder Produktivstart darf nicht erfolgen, wenn:

- `.env.production` Platzhalter oder Demo-Secrets enthaelt.
- HTTPS nicht korrekt funktioniert.
- kein produktiver Admin mit sicherem Passwort existiert.
- aktive Demo-Benutzer in Produktion vorhanden sind.
- SMTP nicht getestet wurde, obwohl Mails aktiviert sind.
- Backup oder Restore-Probe nicht nachgewiesen ist.
- keine Person fuer Betrieb, Ausfall und Datenpannen benannt ist.
- oeffentliche Kalenderdetails nicht datenschutzseitig freigegeben sind.
- Test- und Produktivumgebung dieselben Secrets oder dieselbe Datenbank nutzen.

## Massnahmenplan

| Prioritaet | Massnahme | Ergebnis |
| --- | --- | --- |
| hoch | Datenschutz-/IT-Verantwortliche benennen | Freigabefaehige Zuständigkeit |
| hoch | `.env.test` und `.env.production` getrennt ausfuellen | keine Vermischung der Umgebungen |
| hoch | HTTPS, Firewall und Adminzugang pruefen | technische Basissicherheit |
| hoch | Backup und Restore-Probe durchfuehren | Wiederherstellbarkeit nachgewiesen |
| hoch | SMTP-Test mit realem Server oder Testmodus dokumentieren | kontrollierter Mailbetrieb |
| mittel | Verzeichnis der Verarbeitungstaetigkeiten erstellen | DSGVO-Unterlage vorbereitet |
| mittel | Aufbewahrungs- und Loeschkonzept abstimmen | Datenlebenszyklus geklaert |
| mittel | Incident-Prozess dokumentieren | Reaktion bei Datenpanne geregelt |
| mittel | Monitoring und Alarmierung festlegen | Betriebsausfaelle werden bemerkt |

## Empfehlung fuer den naechsten Teststand

Fuer den naechsten externen Teststand:

1. Eigene `.env.test` verwenden.
2. `APP_ENV=test` setzen.
3. `PUBLIC_AREA_ENABLED=false` lassen, solange die oeffentliche Ansicht nicht
   bewusst getestet wird.
4. `MAIL_DELIVERY_MODE=disabled` oder Test-SMTP verwenden.
5. Keine echten Produktivdaten importieren.
6. Testbenutzer und Testorganisationen klar als Testdaten kennzeichnen.
7. Nach dem Test dokumentieren, ob Daten geloescht, anonymisiert oder fuer
   weitere Tests behalten werden.

Fuer Tests mit Echtdaten ist vorab `docs/testdata-release-template.md`
auszufuellen.

## Ausfuellbare Vorlagen

| Vorlage | Zweck |
| --- | --- |
| `docs/privacy-processing-record-template.md` | Grundlage fuer das Verzeichnis der Verarbeitungstaetigkeit |
| `docs/security-tom-checklist.md` | technische und organisatorische Massnahmen |
| `docs/testdata-release-template.md` | Freigabe und Bereinigung von Test- oder Echtdaten |
