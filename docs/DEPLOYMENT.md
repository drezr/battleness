# Deployment

This document records the first production deployment direction for BattleNess.

## Target Architecture

- Hosting provider: OVH.
- Operating system: Debian stable on both servers.
- Application host: one VPS running the Nuxt/Nitro Node server behind Nginx.
- Database host: one separate self-managed PostgreSQL server.
- Network boundary: public database IP protected by firewall rules that allow only the application
  server address and administrative access.
- First public topology: one Game App instance. Do not horizontally scale the application until the
  process-local WebSocket invalidation hub is replaced by shared pub/sub.
- Staging domain: `staging.battleness.com`.
- Production domain: `battleness.com`.

Debian is acceptable for this project. The app should run from the repository build output through a
systemd service, while Nginx owns HTTPS termination, reverse proxying, request-size limits, and
static HTTP hardening.

## Environment Model

The Game App distinguishes runtime environments with `BATTLENESS_APP_ENV`:

- `local`: developer machine; SQLite and explicit development login may be used.
- `staging`: public pre-production; PostgreSQL, HTTPS public origin, OAuth, and disabled development
  authentication are required.
- `production`: public production; the same strict requirements as staging.

For `staging` and `production`, the server validates these variables at startup:

- `BATTLENESS_PUBLIC_ORIGIN`
- `BATTLENESS_DATABASE_URL`
- `BATTLENESS_DEV_AUTH=disabled`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`

`BATTLENESS_DATABASE_URL` must use PostgreSQL in public environments. `BATTLENESS_PUBLIC_ORIGIN`
must be an HTTPS origin with no path, query, or fragment.

Example templates live in:

- `apps/web/.env.staging.example`
- `apps/web/.env.production.example`

## Health Checks

The app exposes unauthenticated deployment health endpoints:

- `GET /api/health/live`: confirms the Node process can answer HTTP.
- `GET /api/health/ready`: validates the deployment environment and checks database connectivity.

The readiness response intentionally exposes only coarse check names and boolean state. It does not
return database URLs, OAuth secrets, stack traces, migration details, or other diagnostics.

## HTTP Security Baseline

Public environments apply an application-level HTTP security baseline before route handlers run:

- coarse browser security headers: `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`, and public-environment HSTS;
- `Cache-Control: no-store` for API responses;
- trusted-origin enforcement for state-changing API requests using `BATTLENESS_PUBLIC_ORIGIN`;
- content-length caps before JSON body parsing for mutating API routes;
- process-local rate limits for authentication, matchmaking, market mutations, combat commands, and
  other mutating API requests.

These checks are intentionally conservative and fit the first single-instance deployment. Nginx
should still enforce HTTPS, WebSocket upgrades, maximum body size, security headers at the edge, and
its own coarse request throttling. If the Game App is horizontally scaled later, move rate limiting
and WebSocket invalidation fan-out to shared infrastructure.

## Google OAuth

Use separate Google OAuth clients for staging and production:

- Staging redirect URI: `https://staging.battleness.com/api/auth/google/callback`
- Production redirect URI: `https://battleness.com/api/auth/google/callback`

Development login must remain disabled on both public environments. If staging access needs to be
restricted before public testing, prefer a temporary reverse-proxy allowlist or a future authenticated
allowlist rather than enabling local development authentication.

## Initial OVH Runbook Outline

1. Provision two Debian VPS instances: one app server and one database server.
2. Create DNS records for `staging.battleness.com` and `battleness.com` pointing at the app server.
3. Install PostgreSQL on the database server, create separate staging and production databases, and
   bind PostgreSQL only as narrowly as the firewall plan allows.
4. Configure firewall rules so PostgreSQL accepts traffic only from the app server public IP and
   administrative IPs.
5. Install Node.js matching the root `engines.node` requirement and install the pnpm version from
   `packageManager` on the app server.
6. Build the public PostgreSQL app with `pnpm --filter @battleness/web build:postgres`. Do not use
   the plain `build` script for public deployments because it intentionally generates the default
   local SQLite Prisma client through `prebuild`.
7. Deploy PostgreSQL migrations with the PostgreSQL Prisma schema before starting the app.
8. Run the Nitro output under systemd with the correct environment file.
9. Configure Nginx for HTTPS, reverse proxying, WebSocket upgrades, and request-size limits.
10. Verify `/api/health/live`, `/api/health/ready`, Google login, and a small smoke path before
    promoting production traffic.

The executable manual release, migration, rollback, database recovery, and emergency containment
procedures are defined in `docs/OPERATIONS_RUNBOOK.md`. Production monitoring, rate limits, and HTTP
security edge configuration remain follow-up Phase 14 work.

## PostgreSQL Backups

The database host should run daily local PostgreSQL custom-format dumps through systemd:

- Script: `ops/postgresql/backup-postgresql.sh`
- Restore drill script: `ops/postgresql/restore-check.sh`
- Encrypted off-host copy script: `ops/postgresql/replicate-offhost.sh`
- Backup health script: `ops/postgresql/check-backups.sh`
- Service: `ops/postgresql/battleness-postgresql-backup.service`
- Timer: `ops/postgresql/battleness-postgresql-backup.timer`
- Off-host service: `ops/postgresql/battleness-postgresql-offhost.service`
- Off-host timer: `ops/postgresql/battleness-postgresql-offhost.timer`
- Monitor service: `ops/postgresql/battleness-postgresql-monitor.service`
- Monitor timer: `ops/postgresql/battleness-postgresql-monitor.timer`
- Operational cleanup script: `ops/postgresql/cleanup-operational-data.sh`
- Operational cleanup service: `ops/postgresql/battleness-operational-cleanup.service`
- Operational cleanup timer: `ops/postgresql/battleness-operational-cleanup.timer`

The default backup target is `/var/backups/battleness/postgresql`. Each run creates one timestamped
directory containing `battleness_staging.dump`, `battleness_production.dump`, and `SHA256SUMS`, then
updates the `latest` symlink. The initial local retention target is 14 days.

As of 2026-07-21, this local backup service and timer are installed on `bndb`. A manual run produced
both staging and production dumps, checksum verification passed, and the staging dump was restored
into an isolated `battleness_restore_check*` database before the throwaway database was dropped.

`bndb` also encrypts the latest timestamped backup archive with the public recipient certificate in
`/etc/battleness/postgresql-backup/recipient.pem` and copies it to `bnapp` under
`/var/backups/battleness/postgresql-offhost`. The off-host copy uses a dedicated SSH key owned by the
`postgres` user on `bndb`, accepted only by the `deploy` account on `bnapp`. The off-host retention
target is 30 days. The private decryption key is intentionally kept outside the repository and off
the servers at
`C:\Users\dumon\Desktop\bn\battleness-postgresql-backup-private-key.pem`.

Install on the database host as root:

```sh
install -o postgres -g postgres -m 0750 -d /var/backups/battleness/postgresql
install -o root -g root -m 0755 ops/postgresql/backup-postgresql.sh \
  /usr/local/sbin/battleness-postgresql-backup
install -o root -g root -m 0755 ops/postgresql/restore-check.sh \
  /usr/local/sbin/battleness-postgresql-restore-check
install -o root -g root -m 0644 ops/postgresql/battleness-postgresql-backup.service \
  /etc/systemd/system/battleness-postgresql-backup.service
install -o root -g root -m 0644 ops/postgresql/battleness-postgresql-backup.timer \
  /etc/systemd/system/battleness-postgresql-backup.timer
systemctl daemon-reload
systemctl enable --now battleness-postgresql-backup.timer
```

Install the encrypted off-host copy service on the database host after provisioning the recipient
certificate, SSH key, known-hosts file, and remote directory:

```sh
apt-get install rsync
getent group battleness-backup-read >/dev/null || groupadd --system battleness-backup-read
id battleness-backup-pull >/dev/null 2>&1 || \
  useradd --system --create-home --home-dir /var/lib/battleness-backup-pull \
    --shell /bin/bash battleness-backup-pull
usermod -a -G battleness-backup-read postgres
usermod -a -G battleness-backup-read battleness-backup-pull
passwd -l battleness-backup-pull
install -o postgres -g battleness-backup-read -m 2750 -d \
  /var/backups/battleness/postgresql-export
install -o postgres -g postgres -m 0750 -d /etc/battleness/postgresql-backup
install -o postgres -g postgres -m 0640 recipient.pem \
  /etc/battleness/postgresql-backup/recipient.pem
install -o root -g root -m 0755 ops/postgresql/replicate-offhost.sh \
  /usr/local/sbin/battleness-postgresql-replicate-offhost
install -o root -g root -m 0644 ops/postgresql/battleness-postgresql-offhost.service \
  /etc/systemd/system/battleness-postgresql-offhost.service
install -o root -g root -m 0644 ops/postgresql/battleness-postgresql-offhost.timer \
  /etc/systemd/system/battleness-postgresql-offhost.timer
systemctl daemon-reload
systemctl enable --now battleness-postgresql-offhost.timer
```

The Raspberry Pi owns a dedicated Ed25519 key at
`/home/drezr/.ssh/battleness_backup_pull_ed25519`. Its public key is the only authorized key for the
locked `battleness-backup-pull` account on `bndb` and must use this restriction:

```text
restrict,command="/usr/bin/rrsync -ro /var/backups/battleness/postgresql-export" ssh-ed25519 ...
```

This forced command rejects interactive commands, writes, forwarding, and access outside the
encrypted export directory. The Pi pins the `bndb` host key in
`/home/drezr/.ssh/battleness_backup_known_hosts`.

Install the pull job on the Raspberry Pi:

```sh
install -o drezr -g drezr -m 0700 -d /home/drezr/bn/postgresql
install -o root -g root -m 0755 ops/raspberry-pi/pull-postgresql-backups.sh \
  /usr/local/sbin/battleness-postgresql-pull
install -o root -g root -m 0644 ops/raspberry-pi/battleness-postgresql-pull.service \
  /etc/systemd/system/battleness-postgresql-pull.service
install -o root -g root -m 0644 ops/raspberry-pi/battleness-postgresql-pull.timer \
  /etc/systemd/system/battleness-postgresql-pull.timer
systemctl daemon-reload
systemctl enable --now battleness-postgresql-pull.timer
systemctl start battleness-postgresql-pull.service
systemctl show battleness-postgresql-pull.service --property=Result --property=ExecMainStatus
```

The Pi pulls at `05:30 UTC` with up to ten minutes of randomized delay, accepts backups no older
than 36 hours, validates every SHA-256 sidecar, stores only encrypted CMS archives under
`/home/drezr/bn/postgresql`, and retains them for 90 days. It never mirrors deletions from `bndb`.
The decryption key is not present on the Pi.

Install the backup watchdog after the local and off-host services:

```sh
install -o root -g root -m 0755 ops/postgresql/check-backups.sh \
  /usr/local/sbin/battleness-postgresql-check-backups
install -o root -g root -m 0644 ops/postgresql/battleness-postgresql-monitor.service \
  /etc/systemd/system/battleness-postgresql-monitor.service
install -o root -g root -m 0644 ops/postgresql/battleness-postgresql-monitor.timer \
  /etc/systemd/system/battleness-postgresql-monitor.timer
systemctl daemon-reload
systemctl enable --now battleness-postgresql-monitor.timer
systemctl start battleness-postgresql-monitor.service
systemctl show battleness-postgresql-monitor.service --property=Result --property=ExecMainStatus
```

Install and activate the approved staging operational cleanup policy:

```sh
install -o root -g root -m 0755 ops/postgresql/cleanup-operational-data.sh \
  /usr/local/sbin/battleness-operational-cleanup
install -o root -g root -m 0644 ops/postgresql/battleness-operational-cleanup.service \
  /etc/systemd/system/battleness-operational-cleanup.service
install -o root -g root -m 0644 ops/postgresql/battleness-operational-cleanup.timer \
  /etc/systemd/system/battleness-operational-cleanup.timer
systemctl daemon-reload
systemctl enable --now battleness-operational-cleanup.timer
systemctl start battleness-operational-cleanup.service
systemctl show battleness-operational-cleanup.service --property=Result --property=ExecMainStatus
```

Install the journald retention policy on both VPS:

```sh
install -o root -g root -m 0755 -d /etc/systemd/journald.conf.d
install -o root -g root -m 0644 ops/systemd/journald-battleness.conf \
  /etc/systemd/journald.conf.d/90-battleness-retention.conf
systemctl restart systemd-journald.service
systemd-analyze cat-config systemd/journald.conf
journalctl --disk-usage
```

Run and verify a manual backup:

```sh
systemctl start battleness-postgresql-backup.service
systemctl status battleness-postgresql-backup.service --no-pager
sudo -u postgres sh -c \
  'cd /var/backups/battleness/postgresql/latest && sha256sum -c SHA256SUMS'
```

Prove restore into an isolated throwaway database:

```sh
sudo -u postgres battleness-postgresql-restore-check \
  /var/backups/battleness/postgresql/latest/battleness_staging.dump
```

Verify the encrypted off-host copy by decrypting the newest archive with the private key and listing
the archive contents:

```sh
openssl cms -decrypt -inform DER \
  -in /path/to/20YYYYMMDDTHHMMSSZ.tar.gz.cms \
  -recip battleness-postgresql-backup-recipient.pem \
  -inkey battleness-postgresql-backup-private-key.pem |
  tar -tzf -
```

The restore-check script only creates databases named `battleness_restore_check*` and drops the
throwaway database after validation unless `KEEP_RESTORE_DATABASE=1` is set. It validates that the
restored database contains public tables and Prisma migration history.

The app VPS remains the first off-host target. A Raspberry Pi at the operator's home is the second,
provider-independent target. `bndb` retains a 30-day encrypted export with SHA-256 sidecars, and the
Pi initiates the read-only transfer and keeps 90 days. On 2026-08-02, the first Pi copy passed its
ciphertext checksum, was decrypted with the off-server private key, and restored into an isolated
PostgreSQL database; the restore contained 33 public tables and 17 Prisma migrations before the
throwaway database was dropped.

The database host also runs `battleness-postgresql-monitor.timer` after the daily local and off-host
jobs. It checks that both oneshot services last succeeded, the newest local backup is at most 30
hours old, both database dumps and the checksum manifest are present, all checksums pass, and a
non-empty encrypted archive with the same timestamp exists on the app VPS and is at most 30 hours
old. Failures produce `CRITICAL backup_monitor` records in journald and a failed systemd unit. This
local watchdog is installed and verified. External notification delivery is now required Phase 14
work. The selected channel must report watchdog failures and use an external heartbeat or equivalent
mechanism that can also detect a missing timer or a completely unavailable VPS. Test the complete
operator delivery path before production promotion. The user chose not to add that external service
during the Raspberry Pi backup implementation, so this notification work remains pending.

The operational cleanup job runs daily in apply mode after the backup window. It targets only
`battleness_staging` until the production schema is deployed. The approved retention policy is seven
days after session expiry or revocation, immediate removal of expired OAuth attempts, and 30 days for
terminal casual/ranked queue entries, cancelled private lobbies without a battle, and inactive
ranked queue-discipline state. Matched queue entries are eligible only after their linked battle is
finished. Permanent battle records, rating adjustments, market transactions, player-market listings
and mutation idempotency journals, reward grants, season history, and player data are never cleanup
targets. `CLEANUP_MODE=verify` executes the deletion statements inside a transaction that is always
rolled back. Add `battleness_production` only after its migrations are deployed and report/verify
checks pass against that database.

Both VPS use a journald retention drop-in from `ops/systemd/journald-battleness.conf`. Persistent
system journals are limited to 30 days and 512 MiB per server. These limits apply to operational
logs only and do not alter permanent gameplay or market records.

## Production Item Cutover: Staging Gameplay Reset

The `production-items-v1` cutover intentionally keeps OAuth accounts, player identity/profile
fields, sessions, preferences, and registered content releases while removing staging gameplay
state. The guarded command refuses any database whose URL path is not exactly
`battleness_staging`. It does not run as part of deployment.

Before applying the reset:

1. Create a fresh staging PostgreSQL backup and record its immutable timestamp or archive name.
2. Verify checksums and restore that exact backup into the isolated restore-check database.
3. Deploy the release and apply its migrations, but stop `battleness-staging.service` before the
   reset so no gameplay mutation can race the transaction.
4. In a shell containing the staging `BATTLENESS_DATABASE_URL`, inspect the no-op plan:

```sh
pnpm --filter @battleness/web staging:reset-gameplay
```

5. Apply only after replacing the backup identifier with the verified archive name:

```sh
BATTLENESS_STAGING_BACKUP_ID="verified-backup-identifier" \
BATTLENESS_STAGING_RESET_CONFIRMATION="RESET battleness_staging FOR production-items-v1" \
pnpm --filter @battleness/web staging:reset-gameplay -- --apply
```

The transaction clears inventory, sockets/enchantments, equipment/loadouts, materials, rewards,
campaign progress, battles and queues, ranked state/seasons, cosmetics, and both markets. It resets
player experience, credits, item sequence, active loadout, and onboarding version so the next
authenticated request grants the v2 starter set. Restart the service, verify health, sign in with a
preserved account, and confirm that `ashenLoop`, `emberShard`, and `firebolt` are granted exactly
once. If any verification fails, keep the service stopped and restore the recorded backup.

## Current OVH Bootstrap Status

As of 2026-07-20, the first two clean OVH VPS instances have been bootstrapped outside the repo:

- App host `bnapp`: Debian 13, Nginx, UFW, fail2ban, unattended upgrades, PostgreSQL client,
  Node.js `v24.18.0`, and pnpm `10.14.0`.
- App firewall: default-deny incoming, default-allow outgoing, with inbound SSH, HTTP, and HTTPS.
- Database host `bndb`: Debian 13, PostgreSQL 17, UFW, fail2ban, and unattended upgrades.
- Database firewall: default-deny incoming, default-allow outgoing, with inbound SSH and PostgreSQL
  only from the app VPS public address.
- PostgreSQL has separate `battleness_staging` and `battleness_production` databases with separate
  login roles. Connectivity from the app VPS to the staging database has been verified.
- The first staging release has been installed under `/opt/battleness`, PostgreSQL migrations have
  been applied to `battleness_staging`, the systemd service `battleness-staging.service` is active,
  and Nginx proxies HTTP traffic for `staging.battleness.com` to the local Nitro process.
- `staging.battleness.com` now points at the app VPS and has a Let's Encrypt certificate installed
  through Certbot's Nginx integration. HTTP redirects to HTTPS.
- Local, HTTP proxy, and public HTTPS checks return ready health: `/api/health/live` and
  `/api/health/ready`.
- The staging Google OAuth client secret is installed in the server environment, and the public
  `/api/auth/google` route starts a Google redirect with the staging HTTPS callback URI.
- Certbot installed its systemd renewal timer. A simulated renewal succeeded on 2026-07-21 with
  `certbot renew --dry-run --non-interactive --no-random-sleep-on-renew`. The extra flag only skips
  Certbot's normal randomized renewal delay, which caused the earlier bootstrap check to time out.
- The database host runs `battleness-postgresql-backup.timer`, which creates daily local custom-format
  dumps for `battleness_staging` and `battleness_production` under
  `/var/backups/battleness/postgresql` with 14-day local retention. The first manual staging restore
  drill passed on 2026-07-21.
- The database host also runs `battleness-postgresql-offhost.timer`, which encrypts the latest local
  backup archive and copies it to the app VPS under
  `/var/backups/battleness/postgresql-offhost` with 30-day off-host retention. The first encrypted
  copy and decrypt/list verification passed on 2026-07-21.
- A Raspberry Pi outside the OVH VPS pair pulls the encrypted export from `bndb` through a forced
  read-only `rrsync` account and stores it under `/home/drezr/bn/postgresql` for 90 days. The first
  pull, checksum, decryption, and isolated restore drill passed on 2026-08-02.

Generated deployment secrets and database URLs are intentionally kept outside the repository. Do not
commit real environment files, database passwords, OAuth credentials, SSH passwords, or private keys.

The next external prerequisites are OAuth and smoke testing:

- `battleness.com` currently does not point to the app VPS and should not be changed until staging is
  proven.
- A production Google OAuth client and redirect URI are still required before production promotion.
- Staging Google login has been verified with a real allowed Google account.
