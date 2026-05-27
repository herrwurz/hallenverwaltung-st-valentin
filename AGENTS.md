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

- Einzeltermine verschiebbar
- Ganze Serien nicht nachträglich änderbar
- Zukünftige Serientermine nicht gesammelt änderbar

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
