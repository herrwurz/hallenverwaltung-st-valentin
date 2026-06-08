# Hallenverwaltung St. Valentin

## Projekt

Webbasierte Hallenverwaltungssoftware für Gemeinden.

Bereiche:

- Öffentlicher Bereich (/public)
- Vereinsportal (/portal)
- Verwaltungsportal (/admin)

---

# Verbindliche Dokumentation

Vor jeder Änderung lesen:

- docs/pflichtenheft-v1.0.md
- docs/erd.md
- docs/prisma-schema-v1.md

Diese Dokumente gelten als fachliche Wahrheit.

## Projektstatus-Datei

docs/project-status.md dient als kompakter Projektüberblick.

Lesen wenn:

- neue Codex-Session startet
- neue Phase beginnt
- Architekturentscheidungen betroffen sind
- der Nutzer ausdrücklich auf den Projektstatus verweist

Nicht standardmäßig bei jeder Aufgabe lesen.

AGENTS.md bleibt die primäre Arbeitsanweisung.

project-status.md dient ausschließlich als Projektkontext und soll Credits sparen, indem nicht bei jeder Aufgabe Pflichtenheft, ERD und Prisma-Dokumentation erneut geladen werden.

---

# Technologie

- Next.js
- TypeScript
- PostgreSQL
- Prisma
- Auth.js
- Tailwind CSS
- shadcn/ui als primaerer UI-Komponentenstandard ab Phase 25
- Docker

---

# UI-Komponentenstandard ab Phase 25

Phase 25 ist gestartet und bildet den verbindlichen UI-Standard fuer weitere
Oberflaechenarbeiten.

## UI/UX Stack & Component Guidelines

### Core Technology Stack

- Styling Framework: Tailwind CSS, utility-first, responsive und mit
  semantischen Farben.
- Component Library: shadcn/ui mit Radix UI Primitives und Copy-Paste-
  Architektur.
- Icons: Lucide React fuer klare, minimale Outline-Icons.
- Table Engine: TanStack Table (`@tanstack/react-table`), visuell umgesetzt mit
  shadcn/ui Table-Komponenten.
- Validierung: Zod bleibt verbindlich. React Hook Form darf fuer komplexe
  Client-Formulare mit shadcn/ui Form verwendet werden, darf aber die
  serverseitige Validierung in Services und Server Actions nicht ersetzen.

### Required Component Mapping

- shadcn/ui ist nicht nur punktuell, sondern als genereller UI-Stack zu
  verwenden.
- Vorhandene Eigenbau-Controls sollen schrittweise durch passende shadcn/ui-
  Komponenten ersetzt werden, sofern fachlich sinnvoll und wartbar.
- Main Layout & Overview: Bento-Grid-Pattern mit custom `div` grids und
  Flaechen wie `rounded-xl border border-slate-200 bg-white shadow-sm`.
- Data Display: Fuer alle tabellarischen Daten ist das shadcn/ui Data-Table-
  Pattern zu verwenden, also shadcn/ui `table` plus TanStack Table mit
  Sortierung, Filterung ueber shadcn/ui `input` und Pagination. Das betrifft
  u. a. Gebaeude, Raeume, Benutzer, Organisationen, Rollen, Buchungen,
  Warteliste, Benachrichtigungen, Abrechnung, Dokumente, Schaeden, No-Shows,
  Hallenuebergaben und Zutritt.
- Ausnahme: Tabellenzellen mit eingebetteten Server-Action-Formularen duerfen
  serverseitig als shadcn/ui `Table` bleiben, solange eine Client-DataTable die
  Server-Action-Stabilitaet oder Berechtigungslogik riskieren wuerde.
- New Bookings / Actions: shadcn/ui `dialog`, ausgeloest ueber shadcn/ui
  `button`.
- Time/Date Inputs: shadcn/ui `calendar` kombiniert mit shadcn/ui `popover`.
  Fuer Zeitraeume ein klares Date-/Time-Range-Pattern verwenden.
- Form Controls: shadcn/ui `form` fuer komplexe Client-Formulare, aufgebaut auf
  React Hook Form und Zod. Server Actions und Services muessen weiterhin
  unabhaengig validieren.
- Status Indicators: shadcn/ui `badge` mit semantischer Farbcodierung:
  emerald fuer bestaetigt/genehmigt, amber fuer pending/Option/in Pruefung,
  rose fuer blockiert/Sperre/Wartung, slate fuer storniert/inaktiv.
- Kalender und Hallenplanung sollen als echte Ressourcenansicht umgesetzt
  werden: Raeume/Hallen als Spalten, Zeitraster in 30-Minuten-Schritten,
  Status-Badges und Buchungsdialoge.
- shadcn/ui Select, Combobox/Command, Popover, Calendar/Date-Picker, Button,
  Card, Badge, Table, Tabs, Skeleton, Dialog und Form-Patterns sollen
  bevorzugt werden.
- Loading States: shadcn/ui `skeleton` fuer Tabellen, Statistik-Karten und
  datenreiche Panels verwenden, wenn Daten clientseitig oder ueber Suspense
  nachgeladen werden.
- Feedback: shadcn/ui Toast/Sonner fuer unmittelbare Rueckmeldungen nach
  erfolgreichen Mutationen verwenden. Bei Server Actions muss die
  Rueckmeldung sauber ueber Redirect-Query, Action-State oder Client-Bridge
  ausgeloest werden; kein reiner Frontend-Erfolg ohne serverseitigen Erfolg.
- Dark Mode: Keine manuellen Dark-Mode-Variablen erfinden. Falls Dark Mode
  spaeter umgesetzt wird, dann ueber Tailwind `dark:` Klassen und shadcn-
  Theme-Variablen.
- Corporate Identity & Color Tokens:
  - Primary Color (Gemeinde-Blau): `bg-primary` / `text-primary` fuer
    Hauptaktionen wie "+ Neue Buchung", aktive Sidebar-Zustaende,
    Navigationskoepfe und ausgewaehlte Kalenderdaten verwenden.
  - Accent/Warning Color (Gemeinde-Gelb): `bg-warning` / `text-warning` nur
    fuer offene oder schwebende Buchungsantraege, Warnbanner und gezielte
    Hervorhebungen verwenden. Gelb nicht als vollflaechigen Seitenhintergrund
    oder fuer normalen Haupttext einsetzen.
  - Card Styling: Bento-Grid-Module und Verwaltungs-Karten grundsaetzlich mit
    `bg-card border-border rounded-xl shadow-sm` aufbauen, damit eine moderne,
    ruhige Verwaltungssoftware-Anmutung entsteht.
- Drag-and-drop darf zunaechst nur lokal/visuell vorbereitet werden. Persistente
  Terminverschiebungen muessen weiterhin ueber die vorhandene
  Verschiebungs-/Genehmigungslogik laufen.
- FullCalendar Resource Timeline ist fachlich passend, aber erst nach
  Lizenzklaerung einsetzen. Ohne Lizenz wird eine eigene shadcn/Tailwind-
  Ressourcenraster-Komponente bevorzugt.
- Vor dem UI-Neuaufbau muessen fachliche Datenprobleme sichtbar korrigiert
  sein: Gebaeude/Raum-Relationen, Statusfilter und Demo-Daten duerfen keine
  falsche Bedienlogik vortaeuschen.

---

# Architektur

- Businesslogik nur in Services
- Keine Fachlogik in React-Komponenten
- Keine Fachlogik in API-Routen
- Prisma als einzige Datenzugriffsschicht
- Rollen- und Rechteprüfung serverseitig
- Keine sicherheitsrelevanten Entscheidungen im Frontend
- Keine Hardcodierung von Hallen, Vereinen, Rollen oder Tarifen
- Jede neue `/admin/*`-Seite muss selbst `requirePermission()` oder eine
  gleichwertige serverseitige PrÃ¼fung ausfÃ¼hren.

---

# Kritische Arbeitsweise und Codequalitaet

- Korrektheit, Stabilitaet, Sicherheit und Wartbarkeit haben Vorrang vor
  reinen Stilthemen.
- KI-Agenten muessen kritisch mitdenken und duerfen dem Entwickler nicht nur
  zustimmen. Wenn eine Anforderung, ein Loesungsvorschlag oder ein konkreter
  Umsetzungswunsch fachlich, technisch, architektonisch, sicherheitlich oder
  wartungsseitig problematisch ist, muss das klar ausgesprochen werden.
- Hoeflichkeit darf nicht wichtiger sein als eine korrekte Einschaetzung. Bei
  unsinnigen oder riskanten Wuenschen zuerst begruenden, warum der Vorschlag
  schlecht ist, und danach eine bessere Alternative nennen.
- Kritische Fehler aktiv vermeiden und pruefen, insbesondere:
  Memory Leaks, Endlosschleifen, Off-by-One-/Grenzfallfehler und
  Null-/Nil-Zugriffe.
- Lesbarkeit und Wartbarkeit sicherstellen: klare Struktur, nachvollziehbare
  Logik, sprechende Namen und moeglichst geringe versteckte Kopplung.
- Architekturregeln, Rollenmodell und Verzeichniszustaendigkeiten einhalten.
  Fuer dieses Projekt gelten die vorhandenen Next.js-/Service-Schichten statt
  eines klassischen MVC-Zwangs.
- Coding-Style, bestehende Projektmuster und lokale Konventionen einhalten.



# Karpathy-Arbeitsprinzipien

## Vor der Umsetzung

- Annahmen explizit benennen.
- Bei mehreren möglichen Interpretationen die Alternativen nennen.
- Einfachere Lösungen aktiv bevorzugen.
- Unklare Anforderungen nicht stillschweigend interpretieren.

## Einfachheit vor Abstraktion

- Nur umsetzen, was tatsächlich gefordert wurde.
- Keine vorsorglichen Erweiterungen.
- Keine Konfigurierbarkeit ohne fachlichen Bedarf.
- Keine Abstraktionen für Einmalverwendung.
- Die einfachste wartbare Lösung bevorzugen.

Prüffrage:

"Würde ein erfahrener Senior-Entwickler diese Lösung als unnötig komplex betrachten?"

## Chirurgische Änderungen

- Nur betroffene Bereiche ändern.
- Keine ungefragten Refactorings.
- Bestehende Projektmuster respektieren.
- Durch die Änderung entstandene ungenutzte Artefakte entfernen.
- Bereits vorhandenen Dead Code nur melden, nicht ungefragt löschen.

Jede geänderte Zeile muss direkt auf die Anforderung zurückführbar sein.

## Zielorientierte Umsetzung

Vor größeren Änderungen einen kurzen Plan erstellen:

1. Umsetzungsschritt
2. Verifikation
3. Erfolgskriterium

Fehlerbehebungen möglichst testgetrieben:

- Fehler reproduzieren
- Test erstellen
- Fehler beheben
- Test erfolgreich ausführen

Abschluss immer anhand überprüfbarer Kriterien bewerten.


---

# Mandantenfaehigkeit

- Version 1 ist Single-Tenant fuer St. Valentin.
- Mandantenfaehigkeit wird in Version 1 nicht umgesetzt.
- Die Architektur soll eine spaetere Erweiterung um Mandanten nicht absichtlich verhindern.

---

# Fachliche Kernregeln

## Buchungen

- Alle Buchungen benötigen Genehmigung.
- Buchungen werden niemals physisch gelöscht.
- Historisierung erfolgt über Statusänderungen.
- Standardweg der Verwaltung ist `REQUESTED -> APPROVED` oder `REQUESTED ->
  REJECTED`. `IN_REVIEW` bleibt optional, wenn ein Antrag intern vorgemerkt
  oder von einer Person zur Pruefung uebernommen werden soll.
- Terminverschiebungen laufen ueber `BookingChangeRequest`. Der bestehende
  genehmigte Termin wird bei Antragstellung nicht veraendert. Bei Genehmigung
  wird die alte Buchung auf `MOVED` gesetzt und ein neuer genehmigter
  Ersatztermin angelegt.
- Tauschantraege sind als eigener Aenderungsantrag vorbereitet, aber erst nach
  gesonderter fachlicher Umsetzung vollstaendig nutzbar.

Status:

- DRAFT
- REQUESTED
- IN_REVIEW
- APPROVED
- REJECTED
- CANCELLED
- MOVED
- ARCHIVED

## Warteliste

- Reihenfolge nach Eingangszeit
- Platz 1 zuerst
- Frist 48 Stunden
- Danach Platz 2 usw.

## Serienbuchungen

- Serienbuchungen erzeugen wiederkehrende Einzeltermine als normale
  Buchungsantraege im Status `REQUESTED`.
- Unterstuetzte Muster in Version 1: taeglich, woechentlich, monatlich und
  jaehrlich. Woechentliche Serien duerfen mehrere Wochentage enthalten.
- Jede erzeugte Einzelbuchung durchlaeuft den normalen Genehmigungsworkflow.
- Einzeltermine verschiebbar
- Ganze Serien nicht nachträglich änderbar
- Zukünftige Serientermine nicht gesammelt änderbar
- Geschlossene Ferien-/Feiertagszeitraeume (`CLOSED`) werden bei neuen Serien
  uebersprungen.
- Eingeschraenkte Ferien-/Feiertagszeitraeume (`RESTRICTED`) erzeugen einen
  Hinweis, verhindern den Antrag aber nicht automatisch.
- Einzelne Ausnahmedaten koennen bei der Serienanlage angegeben werden und
  werden uebersprungen.

## Hallenlogik

- Gesamtbereich blockiert Teilbereiche
- Teilbereich blockiert Gesamtbereich

## Ferienlogik

Ferien und Feiertage sind konfigurierbar.

Zustände:

- OPEN
- RESTRICTED
- CLOSED

## Hallensperren

- Hallensperren haben Vorrang vor Buchungen.
- Jede Sperre benötigt Grund, Beginn, Ende und Sichtbarkeit.
- Jede Sperre referenziert genau ein Gebaeude oder genau einen Raum, niemals beides oder keines.

## Abrechnung

Version 1:

- Keine automatische Rechnungslegung
- Nur Abrechnungsvorbereitung
- Excel- und PDF-Export

## Dokumente und Schaeden

- Dokumente werden in Version 1 als Metadaten mit `storageKey` verwaltet.
- `storageKey` wird serverseitig erzeugt und darf nicht aus Client-Eingaben
  uebernommen werden.
- Ein echter Datei-Storage darf spaeter ergaenzt werden, aber nicht durch
  lokale Pfad-Hardcodierung erzwungen werden.
- Schadensmeldungen haben Beschreibung, optionalen Foto-Storage-Key und Status.
- Schadensstatuswechsel muessen service-seitig validiert und auditiert werden.
- Hallenuebergabe und Zutrittsverwaltung sind vorbereitet, aber nicht Teil von
  Phase 16.

## No-Shows und Hallenwart-Workflows

- No-Shows werden fuer genehmigte, bereits beendete Buchungen protokolliert.
- No-Shows loesen keine automatische Sanktion, keine automatische Abrechnung
  und keine Buchungsstatusaenderung aus.
- Hallenwarte duerfen No-Shows nur fuer ihnen zugeordnete Raeume oder Gebaeude
  melden, sofern kein Verwaltungsrecht fuer Buchungen vorliegt.
- Die Hallenwart-Zuordnung soll primaer ueber `Caretaker.userId` erfolgen.
  `Caretaker.email` ist nur ein Fallback fuer vorhandene Stammdaten.
- No-Show-Meldungen werden auditiert und koennen als `NO_SHOW_REPORTED`
  benachrichtigt werden.
- Hallenuebergaben werden fuer genehmigte Buchungen ueber `Handover`
  protokolliert: Schluessel erhalten, Halle uebernommen, Halle retourniert.
- Hallenuebergabe-Schritte muessen atomar mit erwartetem Ausgangszustand
  gespeichert werden, damit doppelte oder parallele Erfassung nicht mehrfach
  auditiert wird.
- Hallenuebergaben veraendern den Buchungsstatus nicht und erzeugen keine
  automatische Abrechnung.
- Das Recht `MANAGE_HANDOVERS` erlaubt die Erfassung. Ohne `VIEW_BOOKINGS`
  duerfen Hallenwarte nur Buchungen ihrer zugeordneten Raeume oder Gebaeude
  bearbeiten.
- Zutrittsmedien werden ueber `AccessMedium` und `AccessAssignment`
  verwaltet. Pro Zutrittsmedium darf es maximal eine aktive Ausgabe ohne
  `returnedAt` geben.
- Zutrittsverwaltung nutzt `MANAGE_ACCESS`, schreibt Audit-Eintraege und ist
  in Version 1 nicht an ein externes Schliess- oder Tuerkontrollsystem
  gekoppelt.

---

# Erlaubte Standardbefehle

Codex darf folgende Befehle ohne Rückfrage ausführen:

```bash
npm install
npm ci
npm run lint
npm run build
npm test
npx tsc --noEmit
npx prisma validate
npx prisma generate
npx prisma format
npx prisma migrate dev
npx prisma db seed
docker compose config
docker compose build
git status
git branch
git log --oneline --decorate -20
git diff
git diff --stat
git remote -v
```

Auf Feature-Branches zusätzlich erlaubt:

```bash
git add .
git commit -m "..."
git push origin <feature-branch>
```

Voraussetzungen:

- niemals direkt auf main
- Build erfolgreich
- Prisma valide
- TypeScript fehlerfrei
- keine Secrets im Commit

---

# Verbotene oder rückfragepflichtige Befehle

Ohne ausdrückliche Freigabe verboten:

```bash
git reset --hard
git clean -fd
git push --force
git rebase
git checkout main
git merge main
npx prisma migrate reset
npx prisma db push --force-reset
rm -rf
del /s /q
rmdir /s /q
```

Ebenfalls verboten:

- `.env` committen
- Secrets committen
- Passwörter in Logs ausgeben
- Migrationen löschen
- Datenbank destruktiv leeren

---

# Git-Regeln

- Keine direkten Commits auf main
- Immer Feature-Branches verwenden
- Pull Request vor Merge
- Kleine nachvollziehbare Commits

Branch-Schema:

- feature/*
- bugfix/*
- docs/*
- refactor/*

---

# Qualitätsprüfungen

Vor jedem Commit ausführen:

```bash
npm run lint
npm run build
npx prisma validate
npx prisma generate
npx tsc --noEmit
```

Keine Commits mit fehlschlagenden Prüfungen.

---

# Entwicklungsreihenfolge

1. Projektsetup
2. Prisma & Datenmodell
3. Auth.js & RBAC
4. Stammdatenverwaltung
5. Buchungssystem
6. Genehmigungsworkflow
7. Warteliste
8. Kalender
9. Benachrichtigungen
10. Abrechnung
11. Öffentliche Ansicht

Spätere Phasen nicht vorziehen.

---

# Credit-/Sparmodus

Ziel: Credits und Laufzeit schonen, ohne Sicherheit, Architekturregeln oder
Commit-Qualität zu gefährden.

Standardverhalten ab sofort:

1. Aufgaben klein schneiden
   - Große Phasen möglichst in kleine Arbeitspakete aufteilen.
   - Beispiele: Analyse, Service, UI, Tests, Doku, Prüfungen getrennt
     bearbeiten, wenn der Nutzer keinen Komplettdurchlauf verlangt.

2. Prüfungen gezielt einsetzen
   - Während der Entwicklung bevorzugt gezielte Tests und `npx tsc --noEmit`
     verwenden.
   - Die volle Prüfmatrix erst vor Commit/Push ausführen oder wenn der Nutzer
     sie ausdrücklich verlangt.
   - Vor jedem Commit bleiben die unter "Qualitätsprüfungen" genannten
     Prüfungen verpflichtend.

3. Doppelarbeit vermeiden
   - Keine breite Architekturprüfung wiederholen, wenn unmittelbar danach nur
     konkrete bekannte Befunde umgesetzt werden sollen.
   - Bei Folgeaufgaben auf den letzten Review oder die letzte Zusammenfassung
     Bezug nehmen und nur betroffene Dateien erneut lesen.

4. Git sparsam verwenden
   - Nicht automatisch committen oder pushen, wenn der Nutzer nur Analyse,
     Entwurf oder lokale Änderungen verlangt.
   - Commit/Push erst nach erfolgreicher Abschlussprüfung und nur auf dem
     passenden Feature-Branch.

5. Sparmodus respektieren
   - Wenn der Nutzer "Sparmodus" nennt, nur notwendige Dateien lesen, keine
     breite Codebase-Analyse starten und keine vollen Tests ausführen, solange
     sie nicht für die Aufgabe oder einen Commit notwendig sind.
   - Sicherheits- und Datenintegritätsregeln dürfen dadurch nicht umgangen
     werden.

6. Phasen in Teilschritte planen
   - Bei großen Phasen zuerst eine knappe sinnvolle Zerlegung wählen.
   - Beispiel: Export-Service, Admin-UI, Tests, Doku, Abschlussprüfung.
   - Umsetzung dann Schritt für Schritt, statt alles gleichzeitig zu laden und
     zu prüfen.

---

# Arbeitsregeln für Tool-Laufzeiten und bekannte Umgebungsprobleme

- Für bekannte Langläufer nicht mit zu kurzen Timeouts starten.
- `npm run build`, `npm run lint`, `npm test`, `npx tsc --noEmit` und
  vergleichbare Abschlussprüfungen direkt mit großzügigem Timeout planen.
- Nicht erst einen erwartbaren Timeout produzieren und danach denselben Befehl
  mit mehr Zeit wiederholen.
- Richtwert: schnelle Datei-/Git-Befehle 30-60 Sekunden, gezielte Checks 2-4
  Minuten, volle Tests oder Build 6-10 Minuten.
- Bekannte, bereits gelöste oder eingegrenzte Umgebungsprobleme nicht jedes
  Mal neu diagnostizieren.
- Beim Next/SWC-Lockfile-Problem zuerst die zuletzt funktionierende Variante
  verwenden: `npm install`, Next-Version im Lockfile prüfen, dann
  Produktionsbuild mit direktem Node-/npm.cmd-Aufruf und ausreichend Timeout.
- `npm run dev` in der Codex-Windows-Umgebung nur als Smoke-Test bewerten,
  wenn Port 3000 stabil erreichbar bleibt. Bei erneutem
  `Found lockfile missing swc dependencies` plus `EACCES/fetch failed` nicht
  weiter experimentieren, sondern als bekanntes Umgebungsrisiko dokumentieren.

---

# Antwortstruktur für Codex

Nach jeder Aufgabe ausgeben:

- Geänderte Dateien
- Neue Dateien
- Durchgeführte Prüfungen
- Behobene Fehler
- Offene Punkte
- Nächste empfohlene Schritte

---

# Ziel

Professionelle, webbasierte Hallenverwaltungssoftware für Gemeinden mit Verwaltungsportal, Vereinsportal und öffentlicher Ansicht.
