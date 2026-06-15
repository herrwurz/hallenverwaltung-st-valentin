# Hetzner-Testserver Deployment - Phase 41

Diese Anleitung beschreibt die technische Einrichtung des eigenen
Testservers:

| Feld | Wert |
| --- | --- |
| Anbieter | Hetzner |
| IP-Adresse | `116.203.141.156` |
| Subdomain | `hallenverwaltung.hofreither.at` |
| Betriebsstufe | eigener Testserver |
| Environment-Datei | `.env.test` |

Der Testserver ist kein Gemeinde-Produktivserver. Er dient als realistische
Testumgebung vor der spaeteren Uebergabe an die Gemeinde-IT.

## Voraussetzungen

Vor Beginn benoetigt:

- SSH-Zugang zum Server.
- DNS-A-Record `hallenverwaltung.hofreither.at -> 116.203.141.156`.
- Ubuntu- oder Debian-basierter Server.
- GitHub-Zugriff auf das Repository.
- Entscheidung, ob TLS-Zertifikate manuell bereitgestellt oder zunaechst mit
  einem externen Reverse Proxy erzeugt werden.

DNS ist bereits vorbereitet:

```text
hallenverwaltung.hofreither.at A 116.203.141.156
```

## 1. Server-Basis vorbereiten

Auf dem Server:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl git ufw
```

Firewall minimal:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

## 2. Docker installieren

Empfohlener Weg fuer Ubuntu/Debian:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
```

Danach neu einloggen und pruefen:

```bash
docker --version
docker compose version
```

## 3. Projekt ausrollen

Beispielpfad:

```bash
sudo mkdir -p /srv/hallenverwaltung
sudo chown "$USER":"$USER" /srv/hallenverwaltung
cd /srv/hallenverwaltung
git clone https://github.com/herrwurz/hallenverwaltung-st-valentin.git .
git checkout feature/phase-40-3-operations-monitoring
```

Sobald ein stabiler Release- oder Main-Stand freigegeben ist, soll der
Testserver auf diesen Branch/Tag umgestellt werden.

## 4. Test-Environment anlegen

```bash
cp .env.test.example .env.test
```

Pflichtwerte in `.env.test` setzen:

```env
POSTGRES_DB=hallenverwaltung_test
POSTGRES_USER=hallenverwaltung
POSTGRES_PASSWORD=<sicheres-test-db-passwort>

APP_ENV=test
PUBLIC_BASE_URL=https://hallenverwaltung.hofreither.at
AUTH_URL=https://hallenverwaltung.hofreither.at
AUTH_SECRET=<langes-zufaelliges-test-secret>
AUTH_TRUST_HOST=true
PUBLIC_AREA_ENABLED=false

SERVER_NAME=hallenverwaltung.hofreither.at
TLS_CERT_DIR=./deploy/certs-test

WORKER_INTERVAL_SECONDS=300

MAIL_DELIVERY_MODE=disabled
```

Wichtig:

- `.env.test` nicht committen.
- Test- und Produktiv-Secrets getrennt halten.
- `MAIL_DELIVERY_MODE=disabled` lassen, bis ein Testpostfach bereitsteht.

## 5. TLS-Zertifikate bereitstellen

Die bestehende Production-Compose erwartet:

```text
deploy/certs-test/fullchain.pem
deploy/certs-test/privkey.pem
```

Minimaler Zielzustand:

```bash
mkdir -p deploy/certs-test
chmod 700 deploy/certs-test
```

Die Zertifikate koennen je nach Betriebsentscheidung manuell kopiert oder ueber
einen vorgeschalteten Zertifikatsprozess erzeugt werden. Private Keys duerfen
nicht in Git, Tickets oder Chats kopiert werden.

Ohne Zertifikate startet der Nginx-Reverse-Proxy nicht korrekt fuer HTTPS.

## 6. Konfiguration pruefen

```bash
ENV_FILE=.env.test npm run production:check
docker compose --env-file .env.test -f docker-compose.production.yml config
```

Erwartung:

- keine Platzhalterfehler
- `APP_ENV=test`
- `PUBLIC_BASE_URL=https://hallenverwaltung.hofreither.at`
- `AUTH_URL=https://hallenverwaltung.hofreither.at`
- `MAIL_DELIVERY_MODE=disabled` ist im Test erlaubt

## 7. Testserver starten

```bash
docker compose --env-file .env.test -f docker-compose.production.yml up --build -d
```

Dienste pruefen:

```bash
docker compose --env-file .env.test -f docker-compose.production.yml ps
docker compose --env-file .env.test -f docker-compose.production.yml logs --tail=100 web
docker compose --env-file .env.test -f docker-compose.production.yml logs --tail=100 worker
```

## 8. Initialdaten

Die Migration laeuft ueber den Compose-Dienst `migrate`.

Stammdaten-Seed und Demo-Seed muessen fuer den Testserver bewusst entschieden
werden:

```bash
docker compose --env-file .env.test -f docker-compose.production.yml run --rm web npm run db:seed
docker compose --env-file .env.test -f docker-compose.production.yml run --rm web npm run demo:seed
```

Demo-Zugaenge duerfen nur fuer diesen Testserver genutzt werden und muessen vor
einem echten Produktivbetrieb entfernt oder deaktiviert werden.

## 9. Smoke-Test

Nach dem Start:

```bash
curl -I https://hallenverwaltung.hofreither.at/login
```

Manuell pruefen:

- `/login`
- Admin-Login mit Testadmin
- `/admin`
- `/admin/calendar`
- `/admin/bookings`
- Portal-Login mit Testverein
- `/portal/bookings`
- `/portal/calendar`
- `/admin/system/jobs`
- `/admin/notifications`

## 10. Betrieb

Regelmaessig pruefen:

```bash
docker compose --env-file .env.test -f docker-compose.production.yml ps
docker compose --env-file .env.test -f docker-compose.production.yml logs --tail=50 web
docker compose --env-file .env.test -f docker-compose.production.yml logs --tail=50 worker
df -h
```

Backup fuer Testdaten:

```bash
ENV_FILE=.env.test deploy/scripts/backup-postgres.sh
```

Wenn echte Testdaten verwendet werden, ist vorher
`docs/testdata-release-template.md` auszufuellen.

## 11. Update-Ablauf

```bash
cd /srv/hallenverwaltung
git fetch origin
git checkout <freigegebener-branch-oder-tag>
git pull --ff-only
ENV_FILE=.env.test npm run production:check
docker compose --env-file .env.test -f docker-compose.production.yml up --build -d
docker compose --env-file .env.test -f docker-compose.production.yml ps
```

Danach Smoke-Test wiederholen.

## Offene Punkte vor erstem externen Test

| Punkt | Status |
| --- | --- |
| SSH-Zugang eingerichtet | offen |
| Docker installiert | offen |
| Repository geklont | offen |
| `.env.test` mit echten Test-Secrets erstellt | offen |
| TLS-Zertifikate bereitgestellt | offen |
| Compose-Konfiguration erfolgreich | offen |
| Migration erfolgreich | offen |
| Seed/Demo-Seed bewusst ausgefuehrt | offen |
| HTTPS-Smoke-Test erfolgreich | offen |
| Testzugang an Tester kommuniziert | offen |

