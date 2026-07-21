#!/usr/bin/env bash
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/battleness/postgresql}"
ENCRYPTION_CERT="${ENCRYPTION_CERT:-/etc/battleness/postgresql-backup/recipient.pem}"
OFFSITE_SSH_KEY="${OFFSITE_SSH_KEY:-/etc/battleness/postgresql-backup/offsite_ed25519}"
OFFSITE_SSH_TARGET="${OFFSITE_SSH_TARGET:-deploy@145.239.72.77}"
OFFSITE_REMOTE_DIR="${OFFSITE_REMOTE_DIR:-/var/backups/battleness/postgresql-offhost}"
OFFSITE_RETENTION_DAYS="${OFFSITE_RETENTION_DAYS:-30}"
SSH_KNOWN_HOSTS="${SSH_KNOWN_HOSTS:-/etc/battleness/postgresql-backup/known_hosts}"

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

if ! [[ "$OFFSITE_RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  echo "OFFSITE_RETENTION_DAYS must be an integer." >&2
  exit 2
fi

latest="$(readlink -f "${BACKUP_ROOT}/latest")"
if [[ -z "$latest" || ! -d "$latest" ]]; then
  echo "Latest backup directory does not exist: ${BACKUP_ROOT}/latest" >&2
  exit 1
fi

timestamp="$(basename "$latest")"
case "$timestamp" in
  20??????T??????Z) ;;
  *)
    echo "Refusing unexpected backup timestamp: ${timestamp}" >&2
    exit 2
    ;;
esac

for required_file in "$ENCRYPTION_CERT" "$OFFSITE_SSH_KEY" "$SSH_KNOWN_HOSTS"; do
  if [[ ! -f "$required_file" ]]; then
    echo "Required file missing: ${required_file}" >&2
    exit 1
  fi
done

workdir="$(mktemp -d)"
cleanup() {
  rm -rf "$workdir"
}
trap cleanup EXIT

archive="${workdir}/${timestamp}.tar.gz"
encrypted="${archive}.cms"
remote_tmp="${OFFSITE_REMOTE_DIR}/${timestamp}.tar.gz.cms.tmp"
remote_final="${OFFSITE_REMOTE_DIR}/${timestamp}.tar.gz.cms"

echo "Archiving latest backup ${timestamp}."
tar -C "$BACKUP_ROOT" -czf "$archive" "$timestamp"

echo "Encrypting backup archive for off-host copy."
openssl cms -encrypt \
  -binary \
  -aes-256-cbc \
  -outform DER \
  -in "$archive" \
  -out "$encrypted" \
  "$ENCRYPTION_CERT"

ssh_options=(
  -i "$OFFSITE_SSH_KEY"
  -o BatchMode=yes
  -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=yes
  -o UserKnownHostsFile="$SSH_KNOWN_HOSTS"
)

echo "Uploading encrypted backup to ${OFFSITE_SSH_TARGET}:${remote_final}."
scp "${ssh_options[@]}" "$encrypted" "${OFFSITE_SSH_TARGET}:${remote_tmp}"
ssh "${ssh_options[@]}" "$OFFSITE_SSH_TARGET" \
  "mv '${remote_tmp}' '${remote_final}' && find '${OFFSITE_REMOTE_DIR}' -maxdepth 1 -type f -name '20??????T??????Z.tar.gz.cms' -mtime +${OFFSITE_RETENTION_DAYS} -delete"

echo "Encrypted off-host backup copy complete: ${remote_final}"
