#!/usr/bin/env bash
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/battleness/postgresql}"
ENCRYPTION_CERT="${ENCRYPTION_CERT:-/etc/battleness/postgresql-backup/recipient.pem}"
OFFSITE_SSH_KEY="${OFFSITE_SSH_KEY:-/etc/battleness/postgresql-backup/offsite_ed25519}"
OFFSITE_SSH_TARGET="${OFFSITE_SSH_TARGET:-deploy@145.239.72.77}"
OFFSITE_REMOTE_DIR="${OFFSITE_REMOTE_DIR:-/var/backups/battleness/postgresql-offhost}"
OFFSITE_RETENTION_DAYS="${OFFSITE_RETENTION_DAYS:-30}"
SSH_KNOWN_HOSTS="${SSH_KNOWN_HOSTS:-/etc/battleness/postgresql-backup/known_hosts}"
PULL_EXPORT_ROOT="${PULL_EXPORT_ROOT:-/var/backups/battleness/postgresql-export}"
PULL_EXPORT_RETENTION_DAYS="${PULL_EXPORT_RETENTION_DAYS:-30}"

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

case "$PULL_EXPORT_ROOT" in
  /var/backups/battleness/postgresql-export | /var/backups/battleness/postgresql-export/*) ;;
  *)
    echo "Refusing unsafe PULL_EXPORT_ROOT: ${PULL_EXPORT_ROOT}" >&2
    exit 2
    ;;
esac

for retention in OFFSITE_RETENTION_DAYS PULL_EXPORT_RETENTION_DAYS; do
  if ! [[ "${!retention}" =~ ^[0-9]+$ ]]; then
    echo "${retention} must be an integer." >&2
    exit 2
  fi
done

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
checksum="${encrypted}.sha256"
remote_tmp="${OFFSITE_REMOTE_DIR}/${timestamp}.tar.gz.cms.tmp"
remote_final="${OFFSITE_REMOTE_DIR}/${timestamp}.tar.gz.cms"
remote_checksum_tmp="${remote_final}.sha256.tmp"
remote_checksum_final="${remote_final}.sha256"

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

(cd "$workdir" && sha256sum "$(basename "$encrypted")" >"$(basename "$checksum")")

echo "Publishing encrypted backup for the read-only pull target."
export_tmp="${PULL_EXPORT_ROOT}/${timestamp}.tar.gz.cms.tmp"
export_final="${PULL_EXPORT_ROOT}/${timestamp}.tar.gz.cms"
export_checksum_tmp="${export_final}.sha256.tmp"
export_checksum_final="${export_final}.sha256"
cp "$encrypted" "$export_tmp"
cp "$checksum" "$export_checksum_tmp"
chmod 0640 "$export_tmp" "$export_checksum_tmp"
mv "$export_tmp" "$export_final"
mv "$export_checksum_tmp" "$export_checksum_final"
(cd "$PULL_EXPORT_ROOT" && sha256sum --check --status "$(basename "$export_checksum_final")")
find "$PULL_EXPORT_ROOT" -maxdepth 1 -type f \
  \( -name '20??????T??????Z.tar.gz.cms' -o -name '20??????T??????Z.tar.gz.cms.sha256' \) \
  -mtime "+${PULL_EXPORT_RETENTION_DAYS}" -delete

ssh_options=(
  -i "$OFFSITE_SSH_KEY"
  -o BatchMode=yes
  -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=yes
  -o UserKnownHostsFile="$SSH_KNOWN_HOSTS"
)

echo "Uploading encrypted backup to ${OFFSITE_SSH_TARGET}:${remote_final}."
scp "${ssh_options[@]}" "$encrypted" "${OFFSITE_SSH_TARGET}:${remote_tmp}"
scp "${ssh_options[@]}" "$checksum" "${OFFSITE_SSH_TARGET}:${remote_checksum_tmp}"
ssh "${ssh_options[@]}" "$OFFSITE_SSH_TARGET" \
  "mv '${remote_tmp}' '${remote_final}' && mv '${remote_checksum_tmp}' '${remote_checksum_final}' && cd '${OFFSITE_REMOTE_DIR}' && sha256sum --check --status '$(basename "$remote_checksum_final")' && find '${OFFSITE_REMOTE_DIR}' -maxdepth 1 -type f \( -name '20??????T??????Z.tar.gz.cms' -o -name '20??????T??????Z.tar.gz.cms.sha256' \) -mtime +${OFFSITE_RETENTION_DAYS} -delete"

echo "Encrypted off-host backup copy complete: ${remote_final}"
