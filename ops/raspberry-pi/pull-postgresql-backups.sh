#!/usr/bin/env bash
set -euo pipefail
umask 077

BACKUP_ROOT="${BACKUP_ROOT:-/home/drezr/bn/postgresql}"
REMOTE_TARGET="${REMOTE_TARGET:-battleness-backup-pull@51.91.159.196}"
REMOTE_PATH="${REMOTE_PATH:-/}"
SSH_KEY="${SSH_KEY:-/home/drezr/.ssh/battleness_backup_pull_ed25519}"
SSH_KNOWN_HOSTS="${SSH_KNOWN_HOSTS:-/home/drezr/.ssh/battleness_backup_known_hosts}"
RETENTION_DAYS="${RETENTION_DAYS:-90}"
MAX_BACKUP_AGE_SECONDS="${MAX_BACKUP_AGE_SECONDS:-129600}"

case "$BACKUP_ROOT" in
  /home/drezr/bn/postgresql | /home/drezr/bn/postgresql/*) ;;
  *)
    echo "Refusing unsafe BACKUP_ROOT: ${BACKUP_ROOT}" >&2
    exit 2
    ;;
esac

for setting in RETENTION_DAYS MAX_BACKUP_AGE_SECONDS; do
  if ! [[ "${!setting}" =~ ^[0-9]+$ ]]; then
    echo "${setting} must be a non-negative integer." >&2
    exit 2
  fi
done

for required_file in "$SSH_KEY" "$SSH_KNOWN_HOSTS"; do
  if [[ ! -f "$required_file" ]]; then
    echo "Required file missing: ${required_file}" >&2
    exit 1
  fi
done

mkdir -p "$BACKUP_ROOT"

exec 9>"${BACKUP_ROOT}/.pull.lock"
chmod 0600 "${BACKUP_ROOT}/.pull.lock"
if ! flock -n 9; then
  echo "Another BattleNess backup pull is already running." >&2
  exit 1
fi

ssh_command="ssh -i ${SSH_KEY} -o BatchMode=yes -o ConnectTimeout=20 -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=${SSH_KNOWN_HOSTS}"

echo "Pulling encrypted BattleNess PostgreSQL backups."
rsync \
  --archive \
  --no-owner \
  --no-group \
  --ignore-existing \
  --delay-updates \
  --partial-dir=.rsync-partial \
  --chmod=D700,F600 \
  --include='20??????T??????Z.tar.gz.cms' \
  --include='20??????T??????Z.tar.gz.cms.sha256' \
  --exclude='*' \
  -e "$ssh_command" \
  "${REMOTE_TARGET}:${REMOTE_PATH%/}/" \
  "${BACKUP_ROOT}/"

shopt -s nullglob
archives=("${BACKUP_ROOT}"/20??????T??????Z.tar.gz.cms)
if ((${#archives[@]} == 0)); then
  echo "No encrypted backup archive is available after the pull." >&2
  exit 1
fi

for archive in "${archives[@]}"; do
  checksum="${archive}.sha256"
  if [[ ! -s "$archive" || ! -s "$checksum" ]]; then
    echo "Archive or checksum is missing or empty: $(basename "$archive")" >&2
    exit 1
  fi
  (cd "$BACKUP_ROOT" && sha256sum --check --status "$(basename "$checksum")")
done

latest_archive="$(printf '%s\n' "${archives[@]}" | sort | tail -n 1)"
latest_timestamp="$(basename "$latest_archive" .tar.gz.cms)"
if ! [[ "$latest_timestamp" =~ ^20[0-9]{6}T[0-9]{6}Z$ ]]; then
  echo "Unexpected latest backup timestamp: ${latest_timestamp}" >&2
  exit 2
fi

latest_epoch="$(date -u -d "${latest_timestamp:0:4}-${latest_timestamp:4:2}-${latest_timestamp:6:2} ${latest_timestamp:9:2}:${latest_timestamp:11:2}:${latest_timestamp:13:2} UTC" +%s)"
now_epoch="$(date -u +%s)"
latest_age_seconds=$((now_epoch - latest_epoch))
if ((latest_age_seconds < 0 || latest_age_seconds > MAX_BACKUP_AGE_SECONDS)); then
  echo "Latest backup age is outside the accepted range: ${latest_age_seconds} seconds." >&2
  exit 1
fi

while IFS= read -r -d '' expired_archive; do
  rm -f -- "$expired_archive" "${expired_archive}.sha256"
done < <(find "$BACKUP_ROOT" -maxdepth 1 -type f -name '20??????T??????Z.tar.gz.cms' -mtime "+${RETENTION_DAYS}" -print0)

printf 'BattleNess backup pull complete: latest=%s age_seconds=%d archives=%d retention_days=%d\n' \
  "$latest_timestamp" "$latest_age_seconds" "${#archives[@]}" "$RETENTION_DAYS"
