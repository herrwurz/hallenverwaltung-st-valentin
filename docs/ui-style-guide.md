# UI-Styleguide Version 1

Ziel: Vor dem naechsten Deployment soll die Oberflaeche ruhiger,
konsistenter und verwaltungsgeeignet wirken.

## Stilrichtung

- Die Anwendung orientiert sich an einer sachlichen Windows-/Desktop-Anmutung.
- Der Kalender bleibt in der Bedienlogik Google-Kalender-aehnlich:
  Tages-, Wochen-, Monats- und Jahresansicht, Filter, Datumsauswahl und
  Detaildialoge sowie Heute-/Zurueck-/Weiter-Navigation.
- Die restliche Oberflaeche verwendet klare Verwaltungsoberflaechen:
  helle Flaechen, dezente Rahmen, eckige Controls, klare Aktionsbereiche.

## Bereichslogik

| Bereich | Stil |
| --- | --- |
| `/admin` | Verwaltungs-/Desktop-Stil mit Seitenleiste und Arbeitsbereich |
| `/portal` | Einfacher heller Formularstil fuer Vereine, VHS und Schulen |
| `/public` | Reduzierter heller Informationsstil ohne Verwaltungsdichte |

## Komponentenregeln

- Primaeraktionen: blau, klar beschriftet, rechts oder am Ende des Formulars.
- Sekundaeraktionen: weiss/grau mit Rahmen.
- Abbrechen und Zurueck muessen sichtbar bleiben, wenn ein Formular oder
  Detailbereich verlassen werden kann.
- Zurueck-Navigation verwendet nach Moeglichkeit die gemeinsame helle
  `AppBackLink`-Darstellung.
- Formulare verwenden helle Eingabefelder mit klarer Fokusmarkierung.
- Karten und Panels verwenden dezente Rahmen statt starker Schatten.
- Alte Dark-Theme-Flächen innerhalb der App-Shell werden zentral auf helle
  Verwaltungsflächen normalisiert, damit bestehende Fachseiten vor dem
  Test-Deployment einheitlich wirken.
- Status- und Fehlermeldungen verwenden helle semantische Farben: gruen fuer
  Erfolg, rot fuer Fehler, gelb fuer Hinweise, blau fuer Information.
- Keine fachlich wichtigen Entscheidungen nur ueber Farbe darstellen.
- Erfolgs-, Fehler- und Hinweismeldungen verwenden die gemeinsame helle
  `AppFeedback`-Darstellung.

## Umsetzung

- `components/admin-shell.tsx` setzt den Admin-Desktop-Rahmen.
- `components/area-shell.tsx` setzt die helle Grundflaeche fuer Portal und
  Public.
- `app/globals.css` enthaelt die gemeinsamen Windows-Surface-Regeln.
- `components/form-actions.tsx` standardisiert Speichern/Abbrechen.
- `components/app-back-link.tsx` standardisiert Zurueck-Navigation.
- `components/app-feedback.tsx` standardisiert Rueckmeldungen nach Aktionen.
- `components/calendar-view.tsx` buendelt die gemeinsame Kalenderbedienung.
- `components/status-filter-select.tsx` und `components/logout-button.tsx`
  verwenden helle Windows-Controls.

## Offene UI-Punkte

- Einzelne Fachseiten koennen noch gezielt nachpoliert werden, wenn im
  Pilot-Test Bedienprobleme sichtbar werden.
- PDF-Reports bleiben funktional, aber nicht pixelperfekt gestaltet.
- Der Kalender kann spaeter weiter visuell verdichtet werden, falls reale
  Nutzungsdaten viele parallele Termine zeigen.
