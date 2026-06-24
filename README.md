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
