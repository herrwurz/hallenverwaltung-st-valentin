#!/bin/sh
set -eu

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"

read_env_value() {
  key="$1"
  if [ -f "$ENV_FILE" ]; then
    sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1 | sed 's/^"//; s/"$//'
  fi
}

POSTGRES_USER="${POSTGRES_USER:-$(read_env_value POSTGRES_USER)}"

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${BACKUP_FILE:?BACKUP_FILE is required}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

test_db="restore_test_$(date -u +%Y%m%d%H%M%S)"

cleanup() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T db \
    dropdb -U "$POSTGRES_USER" --if-exists "$test_db" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T db \
  createdb -U "$POSTGRES_USER" "$test_db"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T db \
  pg_restore -U "$POSTGRES_USER" -d "$test_db" --no-owner --no-acl \
  < "$BACKUP_FILE"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T db \
  psql -U "$POSTGRES_USER" -d "$test_db" -c "select count(*) as restored_tables from information_schema.tables where table_schema = 'public';"
