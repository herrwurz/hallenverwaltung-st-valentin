# Hallenverwaltung St. Valentin

Technisches Grundgeruest fuer eine Hallenverwaltungssoftware auf Basis von
Next.js, TypeScript, Tailwind CSS, Prisma und PostgreSQL.

## Stand: Phase 1

Enthalten sind:

- Next.js mit App Router und TypeScript
- Tailwind CSS fuer das UI-Grundgeruest
- Prisma mit PostgreSQL-Anbindung
- Docker-Setup fuer Webanwendung, Migrationen und PostgreSQL
- Initialmigration und Seed-Entry-Point ohne fachliche Daten

Nicht enthalten sind Geschaeftslogik, Buchungen oder Kalenderfunktionen.

## Voraussetzungen

- Node.js 22 oder neuer und npm fuer die lokale Entwicklung
- Docker Desktop mit Docker Compose fuer den containerisierten Start

## Lokale Entwicklung

1. Umgebungsdatei erstellen:

   ```bash
   cp .env.example .env
   ```

   Unter Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   Vor gemeinsam genutzten oder bereitgestellten Umgebungen muss
   `AUTH_SECRET` durch ein langes zufaelliges Secret ersetzt werden.
   `AUTH_TRUST_HOST=true` erlaubt Auth.js den konfigurierten lokalen bzw.
   Docker-Host.

2. PostgreSQL starten:

   ```bash
   docker compose up -d db
   ```

3. Abhaengigkeiten installieren und Prisma vorbereiten:

   ```bash
   npm install
   npm run db:generate
   npm run db:deploy
   npm run db:seed
   ```

   Fuer Benachrichtigungen per SMTP muessen zusaetzlich die
   `SMTP_*`-Variablen in der `.env` gepflegt werden. Die Verarbeitung
   der Benachrichtigungsqueue kann ueber `/admin/notifications` manuell
   angestossen werden; Event-Schalter werden dort als `SystemSetting`
   gespeichert.
   Die Abrechnungsvorbereitung ist unter `/admin/billing` verfuegbar und
   erzeugt nur Exportgrundlagen, keine Rechnungen oder Zahlungen. CSV-, XLSX-
   und PDF-Exporte koennen dort fuer gefilterte Zeitraeume erstellt werden.
   Der Zugriff ist ueber das Recht `BILLING_EXPORT` geschuetzt.

4. Entwicklungsserver starten:

   ```bash
   npm run dev
   ```

Die Anwendung ist unter [http://localhost:3000](http://localhost:3000)
erreichbar.

### Hinweis zu Codex auf Windows

In einzelnen Codex-Windows-Sessions koennen `npm test`, `npm run lint`
oder `npm run build` mit einem allgemeinen `Zugriff verweigert`
scheitern, obwohl das Projekt selbst in Ordnung ist. In diesem Fall
koennen die direkten Node-CLI-Aufrufe verwendet werden:

```powershell
node ./node_modules/tsx/dist/cli.mjs --test tests/*.test.ts
node ./node_modules/eslint/bin/eslint.js .
node ./node_modules/next/dist/bin/next build --webpack
node ./node_modules/prisma/build/index.js validate
node ./node_modules/prisma/build/index.js generate
node ./node_modules/typescript/bin/tsc --noEmit
```

Der Webpack-Buildpfad ist fuer dieses Projekt bewusst als robuster
Produktionsbuild hinterlegt.

## Start mit Docker Compose

Nach dem Anlegen einer `.env`-Datei kann die gesamte Anwendung gestartet
werden:

```bash
docker compose up --build
```

Der Dienst `migrate` fuehrt die vorhandenen Prisma-Migrationen aus, bevor
der Webcontainer startet. PostgreSQL-Daten werden im Volume `postgres_data`
gespeichert.

## Datenbank

Das Prisma-Schema befindet sich in `prisma/schema.prisma`. In Phase 1
enthaelt es bewusst noch keine fachlichen Tabellen. Die Initialmigration
stellt nur den Migrationsstand des Projekts her.

Wichtige Befehle:

```bash
npm run db:generate
npm run db:migrate -- --name beschreibung
npm run db:deploy
npm run db:seed
```

## Projektstruktur

```text
app/                    Next.js App Router und globale Styles
prisma/                 Prisma-Schema, Migrationen und Seed-Script
prisma.config.ts        Prisma-CLI- und Seed-Konfiguration
public/                 Statische Dateien
Dockerfile              Produktions-Build der Webanwendung
docker-compose.yml      Web, Migrationen und PostgreSQL
.env.example            Beispielkonfiguration
```
