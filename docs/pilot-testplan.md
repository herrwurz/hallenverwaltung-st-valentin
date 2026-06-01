# Pilot-Testplan

Dieser Plan beschreibt einen schlanken manuellen Produkttest fuer die lokale
Demo- oder Pilotumgebung.

## Lokaler Start

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
