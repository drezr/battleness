# Operations Runbook

This runbook defines the manual release, migration, rollback, and emergency procedures for the
first single-instance BattleNess deployment. It applies to the current OVH architecture described
in `docs/DEPLOYMENT.md`.

The staging values used below are:

- app host: `bnapp`;
- app root: `/opt/battleness`;
- environment file: `/etc/battleness/staging.env`;
- systemd service: `battleness-staging.service`;
- public origin: `https://staging.battleness.com`;
- database: `battleness_staging` on `bndb`.

Production must use a separate environment file, service, database, OAuth client, and domain. Do
not copy staging credentials into production.

## Release Safety Rules

1. Deploy only an exact committed revision whose CI checks passed. Do not deploy a dirty working
   tree or an unreviewed source archive.
2. Keep every release immutable under `/opt/battleness/releases/<release-id>`. Build in the new
   directory and never overwrite the active release.
3. Keep `/opt/battleness/current` as an atomic symbolic link to the active release.
4. Run and verify a fresh database backup before applying migrations.
5. Treat Prisma migrations as forward-only. BattleNess does not have automatic down migrations.
6. Prefer expand-and-contract database changes so the previous application release can run against
   the migrated schema during an application rollback.
7. Do not delete the active release, the immediately previous release, or the pre-release database
   backup until the deployment has been stable for an agreed observation period.

## Release Record

Before starting, record these values in the deployment ticket or operator notes:

- environment and operator;
- UTC start time;
- Git commit SHA and CI run;
- release ID;
- current and previous release paths;
- newest verified backup path;
- migration names included in the release;
- smoke-test result and UTC completion time;
- rollback decision and incident notes, if applicable.

Use a release ID containing UTC time and the short commit SHA, for example
`20260721T140000Z-a2e35f8`.

## Pre-Deployment Gate

On the operator workstation, confirm the exact revision and run the same validation classes as CI:

```powershell
git status --short
git rev-parse HEAD
git rev-parse origin/main
pnpm install --frozen-lockfile
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @battleness/web build
```

`git status --short` must be empty in the clean checkout used to create the release. Confirm that
the expected GitHub Actions run passed for the same commit, including the PostgreSQL job.

Review every new file under `apps/web/prisma/migrations`. Classify the release before continuing:

- `no schema change`: application-only rollback is safe;
- `backward compatible`: the previous app can run against the new schema;
- `incompatible or destructive`: requires a maintenance window and a tested database restoration
  plan; do not use the normal zero-downtime procedure.

Confirm that the target service is healthy before changing it:

```sh
systemctl status battleness-staging.service --no-pager
curl --fail --silent --show-error http://127.0.0.1:3000/api/health/ready
curl --fail --silent --show-error https://staging.battleness.com/api/health/ready
```

## Pre-Release Backup

On `bndb`, start a fresh backup and verify its checksums:

```sh
sudo systemctl start battleness-postgresql-backup.service
sudo systemctl show battleness-postgresql-backup.service \
  -p Result -p ExecMainStatus -p ActiveState
sudo -u postgres sh -c \
  'cd /var/backups/battleness/postgresql/latest && sha256sum -c SHA256SUMS'
sudo readlink -f /var/backups/battleness/postgresql/latest
```

For the successful `oneshot` service, require `Result=success` and `ExecMainStatus=0`;
`ActiveState=inactive` is expected after completion. Record the resolved backup directory. Do not
continue if the service or checksum verification fails. The normal release procedure does not
require restoring this backup; it is the recovery point for an incompatible migration or data
incident.

## Build A Release

Create an archive from the exact commit on the operator workstation. The following PowerShell
example does not include uncommitted files:

```powershell
$commitSha = (git rev-parse HEAD).Trim()
$releaseId = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ') + '-' + $commitSha.Substring(0, 8)
$archivePath = Join-Path $env:TEMP "$releaseId.tar"
git archive --format=tar --output=$archivePath $commitSha
scp -i C:\Users\dumon\.ssh\battleness_deploy_ed25519 $archivePath deploy@145.239.72.77:/tmp/
```

On `bnapp`, unpack, install, and build in a new immutable release directory. Replace `RELEASE_ID`
with the recorded value:

```sh
set -eu
RELEASE_ID=RELEASE_ID
RELEASE_PATH="/opt/battleness/releases/$RELEASE_ID"
test ! -e "$RELEASE_PATH"
mkdir -m 0755 "$RELEASE_PATH"
tar -xf "/tmp/$RELEASE_ID.tar" -C "$RELEASE_PATH"
rm "/tmp/$RELEASE_ID.tar"
cd "$RELEASE_PATH"
pnpm install --frozen-lockfile
set -a
. /etc/battleness/staging.env
set +a
pnpm --filter @battleness/web prisma:postgres:check
pnpm --filter @battleness/web prisma:postgres:validate
pnpm --filter @battleness/web build:postgres
test -f apps/web/.output/server/index.mjs
```

Failure in this section does not affect the running release. Leave `current` unchanged, inspect the
failure, and remove the failed directory only after verifying its exact resolved path.

## Apply Migrations

From the new release directory on `bnapp`, load the target environment and inspect migration status
before deployment:

```sh
set -eu
RELEASE_PATH="/opt/battleness/releases/RELEASE_ID"
cd "$RELEASE_PATH"
set -a
. /etc/battleness/staging.env
set +a
pnpm --filter @battleness/web prisma:postgres:migrate:status
pnpm --filter @battleness/web prisma:postgres:migrate:deploy
pnpm --filter @battleness/web prisma:postgres:migrate:status
```

Do not switch the application if migration deployment or the final status check fails. Stop and
assess whether the migration made any changes. Never edit an already-applied migration or use
`prisma migrate reset` on staging or production.

## Activate The Release

Capture the old target, replace `current` atomically, and restart the service:

```sh
set -eu
RELEASE_PATH="/opt/battleness/releases/RELEASE_ID"
PREVIOUS_RELEASE=$(readlink -f /opt/battleness/current)
test -f "$RELEASE_PATH/apps/web/.output/server/index.mjs"
ln -s "$RELEASE_PATH" /opt/battleness/current.next
mv -Tf /opt/battleness/current.next /opt/battleness/current
sudo systemctl restart battleness-staging.service
printf 'previous=%s\ncurrent=%s\n' "$PREVIOUS_RELEASE" "$(readlink -f /opt/battleness/current)"
```

If the restart command fails, use the application rollback procedure immediately when the migration
classification permits it.

## Post-Deployment Verification

Run these checks in order:

```sh
sudo systemctl status battleness-staging.service --no-pager
sudo journalctl -u battleness-staging.service --since '-5 minutes' --no-pager
curl --fail --silent --show-error http://127.0.0.1:3000/api/health/live
curl --fail --silent --show-error http://127.0.0.1:3000/api/health/ready
curl --fail --silent --show-error https://staging.battleness.com/api/health/live
curl --fail --silent --show-error https://staging.battleness.com/api/health/ready
```

Then perform an authenticated browser smoke test:

1. Sign in with Google.
2. Open Home, Battle, Inventory, Forge, and Market.
3. Confirm the Battle hub data loads without server errors or unexpected latency.
4. Exercise one low-risk read/write flow appropriate to the release.
5. Check recent service logs for `operational_error`, repeated restarts, database errors, and secret
   leakage.

Record the result. Keep the previous release and pre-release backup during the observation period.

## Application Rollback

Use this path when there was no migration or the deployed migration is explicitly backward
compatible with the previous application.

List releases and identify the exact previous target; do not assume alphabetical order alone:

```sh
readlink -f /opt/battleness/current
find /opt/battleness/releases -mindepth 1 -maxdepth 1 -type d -printf '%TY-%Tm-%Td %TH:%TM %p\n' | sort -r
```

Switch atomically to the recorded previous release:

```sh
set -eu
ROLLBACK_RELEASE="/opt/battleness/releases/RECORDED_PREVIOUS_RELEASE"
test -f "$ROLLBACK_RELEASE/apps/web/.output/server/index.mjs"
ln -s "$ROLLBACK_RELEASE" /opt/battleness/current.next
mv -Tf /opt/battleness/current.next /opt/battleness/current
sudo systemctl restart battleness-staging.service
curl --fail --silent --show-error http://127.0.0.1:3000/api/health/ready
curl --fail --silent --show-error https://staging.battleness.com/api/health/ready
```

Run the authenticated smoke test again and preserve the failed release for investigation. An app
rollback does not roll back database migrations.

## Database Recovery Rollback

Database restoration is destructive and is not part of a routine application rollback. Use it only
when an incompatible migration or data incident prevents recovery with a forward fix. Keep the app
offline, preserve the failed database under a quarantine name, and have a second operator review
the exact database, owner, dump, and commands before execution.

The recovery sequence is:

1. Stop the target application service on `bnapp`.
2. Run one final backup of the failed state on `bndb` for investigation.
3. Select and checksum the recorded pre-release dump.
4. Terminate target-database connections.
5. Rename the failed database to a timestamped quarantine name.
6. Create a replacement database with the original owner.
7. Restore with `pg_restore --exit-on-error`.
8. Point `current` to the application release matching that backup's schema.
9. Start the service and run all health and authenticated smoke checks.

Example database-host commands are intentionally parameterized:

```sh
DATABASE_NAME=battleness_staging
DATABASE_OWNER=REVIEWED_DATABASE_OWNER
QUARANTINE_NAME="${DATABASE_NAME}_failed_$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_PATH=/var/backups/battleness/postgresql/RECORDED_BACKUP/battleness_staging.dump

test -f "$DUMP_PATH"
sudo -u postgres sh -c \
  'cd "$1" && sha256sum -c SHA256SUMS' sh "$(dirname "$DUMP_PATH")"
sudo -u postgres psql -v ON_ERROR_STOP=1 -v db="$DATABASE_NAME" \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = :'db' AND pid <> pg_backend_pid();"
sudo -u postgres psql -v ON_ERROR_STOP=1 -v db="$DATABASE_NAME" -v quarantine="$QUARANTINE_NAME" \
  -c 'ALTER DATABASE :"db" RENAME TO :"quarantine";'
sudo -u postgres createdb --owner="$DATABASE_OWNER" "$DATABASE_NAME"
sudo -u postgres pg_restore --exit-on-error --no-owner --dbname="$DATABASE_NAME" "$DUMP_PATH"
```

Do not delete the quarantined database until restoration has been verified and the incident review
is complete. If restoration fails, keep the app stopped and preserve both database copies.

## Emergency Maintenance

For an active integrity, security, or runaway-load incident, stop writes first:

```sh
sudo systemctl stop battleness-staging.service
sudo systemctl status battleness-staging.service --no-pager
sudo journalctl -u battleness-staging.service --since '-30 minutes' --no-pager
```

Nginx will remain online but the proxied application will be unavailable until the service is
started. This is containment, not a polished maintenance page. Do not re-enable the app until the
cause is understood, database integrity is checked, and the selected release passes local readiness.

To restore service after remediation:

```sh
sudo systemctl start battleness-staging.service
curl --fail --silent --show-error http://127.0.0.1:3000/api/health/ready
curl --fail --silent --show-error https://staging.battleness.com/api/health/ready
```

For suspected credential exposure, keep the app stopped while rotating affected OAuth, database,
SSH, and deployment credentials. Revoke active sessions if session confidentiality may be affected.

## Production Promotion

Promote only the exact commit already validated on staging. Repeat the full procedure against the
production service and environment; do not reuse staging's database backup, environment file, OAuth
client, or smoke-test account assumptions. Production DNS and certificate issuance happen only
after the production service is ready locally and the promotion window has been approved.

The first production promotion remains blocked until the production Google OAuth client, production
environment, systemd service, Nginx virtual host, DNS cutover plan, and monitoring are ready.

## Release Retention

Keep at least the current release and two known-good previous releases. Review disk use before every
deployment with `du -sh /opt/battleness/releases/*`. Remove older release directories only after:

- resolving the exact path under `/opt/battleness/releases`;
- proving it is not the `current` target;
- proving it is not the recorded rollback release;
- confirming its observation and incident-retention periods have ended.

Database backup retention is managed separately by the PostgreSQL backup timers described in
`docs/DEPLOYMENT.md`.
