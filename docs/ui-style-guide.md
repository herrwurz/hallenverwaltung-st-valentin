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

## Zielstandard ab Phase 25

Phase 25 ist gestartet und setzt shadcn/ui als generellen Komponentenstandard.

- shadcn/ui ist als genereller Komponentenstandard eingefuehrt.
- Alle tabellarischen Daten sollen ueber eine shadcn/ui Data-Table-/Grid-
  Komponente dargestellt werden: Gebaeude, Raeume, Benutzer, Organisationen,
  Rollen/Rechte, Buchungen, Warteliste, Benachrichtigungen, Abrechnung,
  Dokumente, Schaeden, No-Shows, Hallenuebergaben und Zutrittsmedien.
- Tabellen mit eingebetteten Server-Action-Formularen duerfen als serverseitige
  shadcn/ui Table umgesetzt bleiben, wenn eine Client-DataTable die stabile
  Mutationsausfuehrung gefaehrden wuerde.
- Fuer Formulare, Filter und Aktionen sind bevorzugt shadcn/ui Button, Input,
  Select, Combobox/Command, Popover, Dialog, Calendar/Date-Picker, Badge,
  Card, Table, Tabs und Form-Patterns zu verwenden.
- Der Kalender soll als Ressourcenraster gestaltet werden: Raeume/Hallen als
  Spalten, 30-Minuten-Zeitslots als Zeilen, Status-Badges als visuelle Anker
  und Buchungsdetails im Dialog.
- Tages- und Wochenansicht nutzen ein eigenes shadcn/Tailwind-
  Ressourcenraster. Monat und Jahr bleiben bewusst kompaktere
  Uebersichtsansichten.
- FullCalendar Resource Timeline bleibt eine Option, benoetigt aber vor
  Produktiveinsatz eine Lizenzklaerung. Ohne Lizenz wird ein eigenes
  shadcn/Tailwind-Ressourcenraster bevorzugt.
- Drag-and-drop darf zunaechst nur lokal/visuell vorbereitet werden. Speichern
  von Verschiebungen muss weiter ueber die vorhandene Workflowlogik laufen.

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
