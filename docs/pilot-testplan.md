# Pilot-Testplan

Dieser Plan beschreibt einen schlanken manuellen Produkttest fuer die lokale
Demo- oder Pilotumgebung.

## Lokaler Start

### Komfortstart fuer den Klicktest

Fuer den lokalen Klicktest kann das Test-Deployment jederzeit per Batch
gestartet werden:

```cmd
start-test-deployment.bat
```

Der Batch fuehrt aus:

1. Migrationen anwenden
2. Stammdaten seeden
3. Demo-Daten seeden
4. Produktionsbuild erstellen
5. Standalone-Testserver starten
6. `http://localhost:3000` im Browser oeffnen

Das Fenster "Hallenverwaltung Testserver" muss waehrend des Klicktests offen
bleiben und kann mit `Ctrl+C` beendet werden.

### Manueller Start

1. `.env` aus `.env.example` erstellen.
2. PostgreSQL starten.
3. Migrationen, Stammdaten und Demo-Daten einspielen.

```bash
npm install
npm run db:deploy
npm run db:seed
npm run demo:seed
npm run dev
```

Danach ist die Anwendung unter `http://localhost:3000` erreichbar.

Falls `npm run dev` in der lokalen Windows-/Codex-Umgebung wegen der bekannten
Next/SWC-Lockfile-Problematik nicht stabil offen bleibt, kann fuer den
Klicktest die gebaute Standalone-Variante verwendet werden:

```powershell
npm run build
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local-standalone.ps1
```

Das PowerShell-Fenster muss waehrend des Klicktests offen bleiben und kann mit
`Ctrl+C` beendet werden.

## Demo-Logins

Die Demo-Logins sind nur fuer lokale Tests gedacht und duerfen nicht in
Produktionsumgebungen verwendet werden.

| Rolle | E-Mail | Passwort | Einstieg |
| --- | --- | --- | --- |
| Gemeinde/Admin | `demo.admin@example.test` | `DemoAdminPassword!2026` | `/admin` |
| Verein | `demo.verein@example.test` | `DemoVereinPassword!2026` | `/portal` |
| Hallenwart | `demo.hallenwart@example.test` | `DemoHallenwartPassword!2026` | `/admin/handovers` |

## Empfohlene Smoke-Tests

### Oeffentlicher Bereich

- `/public` aufrufen.
- Kalender und freie Zeiten pruefen.
- Keine Anmeldung erforderlich.

### Vereinsportal

- Als Verein einloggen.
- `/portal/bookings` oeffnen.
- Eigenen Buchungsantrag anzeigen und neuen Antrag testweise erfassen.
- `/portal/calendar` und `/portal/waitlist` aufrufen.

### Verwaltungsportal

- Als Gemeinde/Admin einloggen.
- `/admin/bookings` oeffnen.
- Demo-Antrag in Pruefung nehmen und genehmigen oder ablehnen.
- `/admin/calendar`, `/admin/billing`, `/admin/notifications` und
  `/admin/system/jobs` pruefen.

### Hallenwart

- Als Hallenwart einloggen.
- `/admin/handovers` oeffnen.
- Schluesselerhalt, Hallenuebernahme und Rueckgabe fuer eine genehmigte
  Demo-Buchung testweise durchlaufen.

## Was noch kein finaler Abnahmetest ist

- Kein Test gegen echten SMTP-Server.
- Kein echter Produktivbetrieb mit HTTPS, Backup-Restore-Probe und Monitoring.
- Keine echte Dateiablage fuer Dokumente oder Schadensfotos.
- Keine Integration in Schliesssysteme.
- Kein final abgestimmtes PDF-Layout.

## Pilot-Feedback

### Allgemein
- UI/UX auf Windows Style
- Verwende UTF-8 und ändere die Umlaute (z.B. oe auf ö)
- Prio Hoch - Fehler in der Logik der Datenbank: Räume müssen eindeutig zu einem Gebäude zugeordnet werden können, d.h ein Raum kann nicht zu mehreren Gebäuden gehören und darf auch in den gesamten Comboboxen nur nach dieser Logik angezeigt werden.z.B. bei Combobox Auswahl NMS Langenhart darf nur der Raum NMS Langenhart - Sporthalle angezeigt werden und zur Auswahl stehen
- keine Englischen Bezeichnungen
- Status (Auswahl) müssen immer als Combobox dargestellt werden
- Schalter müssen immer als Checkbox dargestellt werden
- Stammdaten sollen auch gelöscht werden können über Button
- Zurück-Button auf allen Seiten, wo es Sinn macht
- Abbrechen-Button auf allen Neuanlage Seiten, wo es Sinn macht
- nach einer Aktion muss ein Dialog kommen, ob die Aktion (Anlage, Absenden, Bearbeiten, Löschen, ...) erfolgreich ausgeführt wurde oder nicht

### Verwaltungsportal
- /admin/bookings: Combobox für Status der Buchungsarten (Offen, Beantragt, ...); Fehler: nach Button "in Prüfung setzen" der offenen Anträge sind sie nicht "In Prüfung" sondern bleiben in Offen und Beantragt
- /admin/calender: Anicht muss Tag, Woche, Monat, Jahr haben; komplette UI/UX Überarbeitung nötig
- /admin/billing: noch keine testbaren Erkenntnisse
- /admin/system/jobs: noch keine testbaren Erkenntnisse
- /admin/handover: noch keine testbaren Erkenntnisse
- /admin/access: noch keine testbaren Erkenntnisse
- /admin/damages: Status (Auswahl) als Combobox
- /admin/no-shows: Status (Auswahl) als Combobox
- /admin/notifications: Event-Schalter als Checkboxen, keine Englischen Bezeichnungen
- /admin/settings/calender: Einträge untereinander anzeigen
- /admin/buildings: Räume sollen bereits zugeordnet werden können, wenn sie bereits existieren. Es dürfen aber nur Räume angezeigt werden, die noch nirgends zugeordnet sind, da ja ein Raum eindeutig zu einem Gebäude zugeordent werden darf; Abbrechen Buttonfehlt, Löschen Button fehlt
- /admin/rooms: Räume sollen auch gelöscht werden können; bei Auswahl eines Gebäudes dürfen nur dessen Räume angezeigt werden; optional passt die Zeitraum Erfassung
- /admin/roles: Phase für anlegen und bearbeiten einführen
- /admin/holidays: Ferien und Semesterferien müssen für Österreich vordefiniert und wählbar sein, da es in Österreich je Bundesland verschiedene Zeiträume gibt

### Organiationsportal
- /portal/bookings: da ich nur für meine Organisation einen Antrag machen darf, braucht das Feld "Organisation" nicht angezeigt werden; bei Serienterminen soll es die Möglichkeit geben, sofort ein Semester auswählen zu können
- /portal/waitlist: ein angelegter Wartelistenantrag wird nicht angezeigt, muss aber als "beantragt" angezeigt werden
- /portal/documents: noch keine testbaren Erkenntnisse; Zurück zum Portal fehlt
- /portal/damages: noch keine testbaren Erkenntnisse; Zurück zum Portal fehlt

### Kalender
- Wochenansicht soll wie Google Kalender wirken
- Monatsansicht/Jahresansicht gewünscht
- Termin-Detail als Dialog

### Priorität
- Hoch: ...
- Mittel: ...
- Niedrig: ...
