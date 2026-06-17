# TOM-Checkliste: Technische und organisatorische Massnahmen

Diese Checkliste ist eine praktische Grundlage fuer die IT- und
Datenschutzfreigabe. Sie muss fuer die konkrete Zielumgebung ausgefuellt
werden.

Statuswerte:

- `offen`
- `umgesetzt`
- `nicht erforderlich`
- `risikoakzeptiert`

## 1. Zugriffskontrolle

| Massnahme | Status | Nachweis / Bemerkung |
| --- | --- | --- |
| Serverzugang nur fuer benannte Administratoren | offen |  |
| Keine gemeinsamen produktiven Admin-Konten ohne Freigabe | offen |  |
| Starke individuelle Passwoerter fuer produktive Benutzer | offen |  |
| Demo-Benutzer in Produktion entfernt oder deaktiviert | offen |  |
| SUPER_ADMIN nur fuer eng begrenzten Personenkreis | offen |  |
| Rollen/Rechte fachlich geprueft | offen |  |
| Inaktive Benutzer verlieren Zugriff | technisch umgesetzt | zentrale Session-/Rechtepruefung |

## 2. Zugangsschutz und Transport

| Massnahme | Status | Nachweis / Bemerkung |
| --- | --- | --- |
| HTTPS fuer Produktion verpflichtend | offen |  |
| TLS-Zertifikat gueltig und zur Domain passend | offen |  |
| HTTP nur Redirect/ACME, keine produktive Nutzung | offen |  |
| Firewall nur fuer notwendige Ports offen | offen |  |
| PostgreSQL nicht oeffentlich erreichbar | offen |  |
| SSH/Adminzugriff eingeschraenkt | offen |  |

## 3. Konfigurations- und Secret-Schutz

| Massnahme | Status | Nachweis / Bemerkung |
| --- | --- | --- |
| `.env.production` nicht in Git | offen |  |
| `.env.test` nicht in Git | offen |  |
| Test und Produktion nutzen getrennte Secrets | offen |  |
| `AUTH_SECRET` lang, zufaellig und nicht wiederverwendet | offen |  |
| SMTP-Passwort nicht in Datenbank oder Logs | technisch vorgesehen | Environment-Variable |
| Datenbankpasswort nicht in Tickets/Chats kopieren | offen |  |
| Produktionscheck ohne Fehler | offen | `npm run production:check` |

## 4. Datensparsamkeit und Sichtbarkeit

| Massnahme | Status | Nachweis / Bemerkung |
| --- | --- | --- |
| Public-Bereich fuer Test standardmaessig deaktiviert | technisch vorbereitet | `PUBLIC_AREA_ENABLED=false` |
| Oeffentliche Kalenderdetails festgelegt | offen | belegt/frei, Vereinsname oder Veranstaltung |
| Keine unnoetigen personenbezogenen Daten in Berichten | offen |  |
| E-Mail-Ereignisse bewusst aktiviert/deaktiviert | offen | `/admin/settings/notifications` |
| Newsletter/SMS/Push nicht aktiv | umgesetzt | nicht Teil von Version 1 |

## 5. Protokollierung und Nachvollziehbarkeit

| Massnahme | Status | Nachweis / Bemerkung |
| --- | --- | --- |
| Buchungsstatushistorie aktiv | umgesetzt | `BookingStatusHistory` |
| Kritische Adminaktionen werden auditiert | teilweise umgesetzt | je nach Fachbereich |
| Worker-Laeufe werden protokolliert | umgesetzt | `AuditEntry` |
| Benachrichtigungsstatus nachvollziehbar | umgesetzt | Notification Queue |
| Log-Aufbewahrungsfrist festgelegt | offen |  |
| Keine Secrets in technischen Logs | offen | organisatorisch pruefen |

## 6. Backup und Wiederherstellung

| Massnahme | Status | Nachweis / Bemerkung |
| --- | --- | --- |
| Backup-Script eingerichtet | vorbereitet | `deploy/scripts/backup-postgres.sh` |
| Backup-Ziel und Rechte festgelegt | offen |  |
| Backup-Aufbewahrung festgelegt | offen |  |
| Restore-Probe erfolgreich | offen |  |
| Destruktiver Restore nur mit Freigabe | vorbereitet | Runbook-Regel |
| Backup-Dateien nicht in Git/Tickets | offen |  |

## 7. Betrieb und Wartung

| Massnahme | Status | Nachweis / Bemerkung |
| --- | --- | --- |
| Verantwortliche Person fuer Betrieb benannt | offen |  |
| Update-/Patchprozess festgelegt | offen |  |
| Monitoring fuer Webdienst | offen |  |
| Monitoring fuer Worker | offen |  |
| Monitoring fuer Datenbank | offen |  |
| Monitoring fuer Speicherplatz | offen |  |
| Eskalationsweg bei Ausfall bekannt | offen |  |

## 8. Incident und Datenpannen

| Massnahme | Status | Nachweis / Bemerkung |
| --- | --- | --- |
| Interner Meldeweg bei Sicherheitsvorfall festgelegt | offen |  |
| Datenschutzkontakt fuer Datenpannen benannt | offen |  |
| Sofortmassnahmen dokumentiert | offen | Zugang sperren, Server sichern, Logs sichern |
| Kommunikationsweg zur Fachabteilung festgelegt | offen |  |
| Entscheidung ueber externe Meldungen geregelt | offen | durch Gemeinde/Datenschutz |

## 9. Testbetrieb

| Massnahme | Status | Nachweis / Bemerkung |
| --- | --- | --- |
| Eigene `.env.test` verwendet | offen |  |
| Testdaten statt Produktivdaten verwendet | offen |  |
| Test-SMTP oder Mailversand deaktiviert | offen |  |
| Testzugriff auf benannte Personen begrenzt | offen |  |
| Testende und Datenbereinigung dokumentiert | offen |  |

