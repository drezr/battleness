#!/usr/bin/env bash
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/battleness/postgresql}"
BACKUP_DATABASES="${BACKUP_DATABASES:-battleness_staging battleness_production}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="${BACKUP_TIMESTAMP:-$(date -u +%Y%m%dT%H%M%SZ)}"
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"

case "$BACKUP_ROOT" in
  /var/backups/battleness/postgresql | /var/backups/battleness/postgresql/*) ;;
  *)
    echo "Refusing unsafe BACKUP_ROOT: ${BACKUP_ROOT}" >&2
    exit 2
    ;;
esac

if ! [[ "$BACKUP_RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  echo "BACKUP_RETENTION_DAYS must be an integer." >&2
  exit 2
fi

install -d -m 0750 "$BACKUP_DIR"

echo "Starting BattleNess PostgreSQL backup at ${TIMESTAMP}."

for database in $BACKUP_DATABASES; do
  case "$database" in
    battleness_staging | battleness_production) ;;
    *)
      echo "Refusing unexpected database name: ${database}" >&2
      exit 2
      ;;
  esac

  output="${BACKUP_DIR}/${database}.dump"
  echo "Dumping ${database} to ${output}."
  pg_dump --format=custom --compress=9 --no-owner --no-acl --file="$output" "$database"
done

(
  cd "$BACKUP_DIR"
  sha256sum ./*.dump > SHA256SUMS
)

ln -sfn "$BACKUP_DIR" "${BACKUP_ROOT}/latest"

find "$BACKUP_ROOT" \
  -mindepth 1 \
  -maxdepth 1 \
  -type d \
  -name '20??????T??????Z' \
  -mtime +"$BACKUP_RETENTION_DAYS" \
  -exec rm -rf {} +

echo "BattleNess PostgreSQL backup complete: ${BACKUP_DIR}"
