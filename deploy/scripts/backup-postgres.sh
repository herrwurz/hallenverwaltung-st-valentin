#!/bin/sh
set -eu

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
BACKUP_DIR="${BACKUP_DIR:-backups}"

read_env_value() {
  key="$1"
  if [ -f "$ENV_FILE" ]; then
    sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1 | sed 's/^"//; s/"$//'
  fi
}

POSTGRES_DB="${POSTGRES_DB:-$(read_env_value POSTGRES_DB)}"
POSTGRES_USER="${POSTGRES_USER:-$(read_env_value POSTGRES_USER)}"

: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"

mkdir -p "$BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="$BACKUP_DIR/${POSTGRES_DB}_${timestamp}.dump"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl \
  > "$backup_file"

echo "$backup_file"
