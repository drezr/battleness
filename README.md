# BattleNess

BattleNess is a browser-based, mobile-first, turn-based combat game.

## Development

This repository uses a TypeScript monorepo with pnpm workspaces.

```sh
corepack enable
pnpm install
pnpm typecheck
pnpm test
pnpm lint
pnpm dev
```

## Workspaces

- `packages/engine`: deterministic combat engine contract and rules.
- `packages/content`: versioned content definitions, prototype fixtures, localization files, and Zod schemas.
- `apps/prototype`: first local browser prototype for validating engine and content behavior.
- `apps/web`: Nuxt Game App, server API, and Prisma persistence.

## Google OAuth

Google sign-in uses the server-side authorization-code flow with browser-bound state and PKCE S256.
Create a Google Cloud OAuth client of type **Web application** and register this local redirect URI:

```text
http://127.0.0.1:3000/api/auth/google/callback
```

Copy `apps/web/.env.oauth.example` to the ignored file `apps/web/.env.oauth.local`, replace the
placeholder client ID and secret, then start the Game App with:

```sh
pnpm dev:web:oauth
```

Production and staging must each use their own HTTPS redirect URI and injected environment secrets.
Never commit the Google client secret. BattleNess stores Google `sub` as the stable provider account
identifier and does not automatically merge accounts by matching email addresses.

## PostgreSQL Readiness

SQLite remains the default local database. PostgreSQL uses a generated mirror of the canonical
Prisma model and an independent migration history under `apps/web/prisma/postgresql/`.

Start the optional local PostgreSQL service with Docker:

```sh
docker compose -f compose.postgres.yml up -d
```

Set `BATTLENESS_DATABASE_URL` to
`postgresql://battleness:battleness@localhost:5432/battleness?schema=public`, then run:

```sh
pnpm --filter @battleness/web prisma:postgres:generate
pnpm --filter @battleness/web prisma:postgres:migrate:deploy
pnpm --filter @battleness/web prisma:postgres:drift:check
pnpm --filter @battleness/web prisma:postgres:smoke
pnpm dev:web
```

After using the PostgreSQL client locally, restore the default SQLite Prisma client with:

```sh
pnpm --filter @battleness/web prisma:generate
```

When the canonical Prisma model changes, create the SQLite migration first, run
`prisma:postgres:prepare`, and create the corresponding PostgreSQL migration with
`prisma:postgres:migrate:dev`. The CI PostgreSQL job deploys all PostgreSQL migrations to a clean
PostgreSQL service, checks schema drift, and runs a transactional persistence smoke test.
