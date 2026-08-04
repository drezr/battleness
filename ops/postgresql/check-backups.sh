#!/usr/bin/env bash
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/battleness/postgresql}"
MAX_LOCAL_AGE_SECONDS="${MAX_LOCAL_AGE_SECONDS:-108000}"
MAX_OFFSITE_AGE_SECONDS="${MAX_OFFSITE_AGE_SECONDS:-108000}"
OFFSITE_SSH_KEY="${OFFSITE_SSH_KEY:-/etc/battleness/postgresql-backup/offsite_ed25519}"
OFFSITE_SSH_TARGET="${OFFSITE_SSH_TARGET:-deploy@145.239.72.77}"
OFFSITE_REMOTE_DIR="${OFFSITE_REMOTE_DIR:-/var/backups/battleness/postgresql-offhost}"
SSH_KNOWN_HOSTS="${SSH_KNOWN_HOSTS:-/etc/battleness/postgresql-backup/known_hosts}"

failures=()

add_failure() {
  failures+=("$1")
}

require_nonnegative_integer() {
  local name="$1"
  local value="$2"

  if ! [[ "$value" =~ ^[0-9]+$ ]]; then
    echo "Configuration error: ${name} must be a non-negative integer." >&2
    exit 2
  fi
}

check_service_result() {
  local unit="$1"
  local properties

  if ! properties="$(systemctl show "$unit" --property=LoadState --property=Result --property=ExecMainStatus)"; then
    add_failure "unable_to_read_${unit//[^a-zA-Z0-9]/_}"
    return
  fi

  if ! grep -qx 'LoadState=loaded' <<<"$properties"; then
    add_failure "unit_not_loaded_${unit//[^a-zA-Z0-9]/_}"
  fi
  if ! grep -qx 'Result=success' <<<"$properties"; then
    add_failure "unit_failed_${unit//[^a-zA-Z0-9]/_}"
  fi
  if ! grep -qx 'ExecMainStatus=0' <<<"$properties"; then
    add_failure "unit_exit_nonzero_${unit//[^a-zA-Z0-9]/_}"
  fi
}

case "$BACKUP_ROOT" in
  /var/backups/battleness/postgresql | /var/backups/battleness/postgresql/*) ;;
  *)
    echo "Refusing unsafe BACKUP_ROOT: ${BACKUP_ROOT}" >&2
    exit 2
    ;;
esac

case "$OFFSITE_REMOTE_DIR" in
  /var/backups/battleness/postgresql-offhost | /var/backups/battleness/postgresql-offhost/*) ;;
  *)
    echo "Refusing unsafe OFFSITE_REMOTE_DIR: ${OFFSITE_REMOTE_DIR}" >&2
    exit 2
    ;;
esac

require_nonnegative_integer MAX_LOCAL_AGE_SECONDS "$MAX_LOCAL_AGE_SECONDS"
require_nonnegative_integer MAX_OFFSITE_AGE_SECONDS "$MAX_OFFSITE_AGE_SECONDS"

check_service_result battleness-postgresql-backup.service
check_service_result battleness-postgresql-offhost.service

latest="$(readlink -f "${BACKUP_ROOT}/latest" 2>/dev/null || true)"
timestamp=""
local_age_seconds=-1
offsite_age_seconds=-1

if [[ -z "$latest" || ! -d "$latest" ]]; then
  add_failure latest_local_backup_missing
else
  case "$latest" in
    "${BACKUP_ROOT}"/*) ;;
    *)
      echo "Refusing latest backup outside BACKUP_ROOT: ${latest}" >&2
      exit 2
      ;;
  esac

  timestamp="$(basename "$latest")"
  if ! [[ "$timestamp" =~ ^20[0-9]{6}T[0-9]{6}Z$ ]]; then
    add_failure invalid_local_backup_timestamp
  else
    backup_epoch="$(date -u -d "${timestamp:0:4}-${timestamp:4:2}-${timestamp:6:2} ${timestamp:9:2}:${timestamp:11:2}:${timestamp:13:2} UTC" +%s)"
    now_epoch="$(date -u +%s)"
    local_age_seconds=$((now_epoch - backup_epoch))

    if ((local_age_seconds < 0)); then
      add_failure local_backup_timestamp_in_future
    elif ((local_age_seconds > MAX_LOCAL_AGE_SECONDS)); then
      add_failure local_backup_too_old
    fi
  fi

  for required_file in battleness_staging.dump battleness_production.dump SHA256SUMS; do
    if [[ ! -s "${latest}/${required_file}" ]]; then
      add_failure "local_backup_file_missing_${required_file//[^a-zA-Z0-9]/_}"
    fi
  done

  if [[ -s "${latest}/SHA256SUMS" ]] && ! (cd "$latest" && sha256sum --check --status SHA256SUMS); then
    add_failure local_backup_checksum_failed
  fi
fi

for required_file in "$OFFSITE_SSH_KEY" "$SSH_KNOWN_HOSTS"; do
  if [[ ! -f "$required_file" ]]; then
    add_failure "monitor_file_missing_$(basename "$required_file" | tr -c 'a-zA-Z0-9' '_')"
  fi
done

if [[ -n "$timestamp" && -f "$OFFSITE_SSH_KEY" && -f "$SSH_KNOWN_HOSTS" ]]; then
  remote_archive="${OFFSITE_REMOTE_DIR}/${timestamp}.tar.gz.cms"
  remote_checksum="${remote_archive}.sha256"
  ssh_options=(
    -i "$OFFSITE_SSH_KEY"
    -o BatchMode=yes
    -o ConnectTimeout=15
    -o IdentitiesOnly=yes
    -o StrictHostKeyChecking=yes
    -o UserKnownHostsFile="$SSH_KNOWN_HOSTS"
  )

  if remote_epoch="$(ssh "${ssh_options[@]}" "$OFFSITE_SSH_TARGET" "test -s '${remote_archive}' && test -s '${remote_checksum}' && cd '${OFFSITE_REMOTE_DIR}' && sha256sum --check --status '$(basename "$remote_checksum")' && stat -c %Y '${remote_archive}'")"; then
    if [[ "$remote_epoch" =~ ^[0-9]+$ ]]; then
      now_epoch="$(date -u +%s)"
      offsite_age_seconds=$((now_epoch - remote_epoch))
      if ((offsite_age_seconds < 0)); then
        add_failure offsite_backup_timestamp_in_future
      elif ((offsite_age_seconds > MAX_OFFSITE_AGE_SECONDS)); then
        add_failure offsite_backup_too_old
      fi
    else
      add_failure invalid_offsite_backup_mtime
    fi
  else
    add_failure matching_offsite_backup_or_checksum_missing_invalid_or_unreachable
  fi
fi

if ((${#failures[@]} > 0)); then
  for failure in "${failures[@]}"; do
    printf 'CRITICAL backup_monitor issue=%s\n' "$failure" >&2
  done
  exit 1
fi

printf 'OK backup_monitor local_timestamp=%s local_age_seconds=%d offsite_age_seconds=%d\n' \
  "$timestamp" "$local_age_seconds" "$offsite_age_seconds"
