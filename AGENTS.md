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

- docs/project-status.md  (nur kontextabhängig verpflichtend lesen; nicht bei jeder Änderung als Standarddokument)

---

# Technologie

- Next.js
- TypeScript
- PostgreSQL
- Prisma
- Auth.js
- Tailwind CSS
- Docker

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

- Serienbuchungen erzeugen woechentliche Einzeltermine als normale
  Buchungsantraege im Status `REQUESTED`.
- Jede erzeugte Einzelbuchung durchlaeuft den normalen Genehmigungsworkflow.
- Einzeltermine verschiebbar
- Ganze Serien nicht nachträglich änderbar
- Zukünftige Serientermine nicht gesammelt änderbar
- Geschlossene Ferien-/Feiertagszeitraeume (`CLOSED`) werden bei neuen Serien
  uebersprungen.
- Eingeschraenkte Ferien-/Feiertagszeitraeume (`RESTRICTED`) erzeugen einen
  Hinweis, verhindern den Antrag aber nicht automatisch.

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
