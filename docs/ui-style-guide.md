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
- Formulare verwenden helle Eingabefelder mit klarer Fokusmarkierung.
- Karten und Panels verwenden dezente Rahmen statt starker Schatten.
- Keine fachlich wichtigen Entscheidungen nur ueber Farbe darstellen.
- Erfolgs-, Fehler- und Hinweismeldungen verwenden die gemeinsame helle
  `AppFeedback`-Darstellung.

## Umsetzung

- `components/admin-shell.tsx` setzt den Admin-Desktop-Rahmen.
- `components/area-shell.tsx` setzt die helle Grundflaeche fuer Portal und
  Public.
- `app/globals.css` enthaelt die gemeinsamen Windows-Surface-Regeln.
- `components/form-actions.tsx` standardisiert Speichern/Abbrechen.
- `components/app-feedback.tsx` standardisiert Rueckmeldungen nach Aktionen.
- `components/calendar-view.tsx` buendelt die gemeinsame Kalenderbedienung.

## Offene UI-Punkte

- Einzelne Fachseiten koennen noch gezielt nachpoliert werden, wenn im
  Pilot-Test Bedienprobleme sichtbar werden.
- PDF-Reports bleiben funktional, aber nicht pixelperfekt gestaltet.
- Der Kalender kann spaeter weiter visuell verdichtet werden, falls reale
  Nutzungsdaten viele parallele Termine zeigen.
