#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE="${1:-}"
RESTORE_DATABASE="${2:-battleness_restore_check_$(date -u +%Y%m%d%H%M%S)}"
KEEP_RESTORE_DATABASE="${KEEP_RESTORE_DATABASE:-0}"

if [[ -z "$BACKUP_FILE" || ! -f "$BACKUP_FILE" ]]; then
  echo "Usage: $0 /path/to/database.dump [battleness_restore_check_name]" >&2
  exit 2
fi

case "$RESTORE_DATABASE" in
  battleness_restore_check*) ;;
  *)
    echo "Refusing unsafe restore database name: ${RESTORE_DATABASE}" >&2
    exit 2
    ;;
esac

cleanup() {
  if [[ "$KEEP_RESTORE_DATABASE" == "1" ]]; then
    echo "Keeping restore database ${RESTORE_DATABASE} because KEEP_RESTORE_DATABASE=1."
    return
  fi

  if psql --dbname=postgres --tuples-only --no-align --command \
    "select 1 from pg_database where datname = '${RESTORE_DATABASE}'" | grep -q 1; then
    dropdb --if-exists "$RESTORE_DATABASE"
  fi
}
trap cleanup EXIT

echo "Creating isolated restore database ${RESTORE_DATABASE}."
dropdb --if-exists "$RESTORE_DATABASE"
createdb "$RESTORE_DATABASE"

echo "Restoring ${BACKUP_FILE} into ${RESTORE_DATABASE}."
pg_restore --dbname="$RESTORE_DATABASE" --no-owner --no-acl "$BACKUP_FILE"

table_count="$(psql --dbname="$RESTORE_DATABASE" --tuples-only --no-align --command \
  "select count(*) from information_schema.tables where table_schema = 'public';")"
migration_count="$(psql --dbname="$RESTORE_DATABASE" --tuples-only --no-align --command \
  "select count(*) from public._prisma_migrations;")"

if [[ "$table_count" -le 0 || "$migration_count" -le 0 ]]; then
  echo "Restore check failed: table_count=${table_count}, migration_count=${migration_count}." >&2
  exit 1
fi

echo "Restore check passed: table_count=${table_count}, migration_count=${migration_count}."
