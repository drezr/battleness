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

Backups, restore drills, release rollback, production monitoring, rate limits, and HTTP security
edge configuration remain follow-up Phase 14 work.

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
- Certbot installed its systemd renewal timer, but `certbot renew --dry-run --non-interactive`
  timed out during this bootstrap and should be rechecked before relying on unattended renewal.

Generated deployment secrets and database URLs are intentionally kept outside the repository. Do not
commit real environment files, database passwords, OAuth credentials, SSH passwords, or private keys.

The next external prerequisites are OAuth and smoke testing:

- `battleness.com` currently does not point to the app VPS and should not be changed until staging is
  proven.
- A production Google OAuth client and redirect URI are still required before production promotion.
- The staging Google login callback still needs a browser smoke test with a real allowed Google
  account.
