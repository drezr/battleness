# Agent Instructions

These instructions are persistent project context for future agents working on BattleNess.

## Documentation

- For all future discussions and implementation work, record project modifications in `docs/STATE.md`.
- `docs/STATE.md` should track changes made to code, docs, configuration, data files, tests, and other project artifacts.
- Keep `docs/STATE.md` concise and ordered by date, with newest entries easy to find.
- Write all new information added to files in `docs/` in English.
- Record persistent project instructions in `docs/AGENT.md`.
- Record the project summary, game rules, and technical decisions in `docs/PROJECT.md`.
- Update `docs/PROJECT.md` when framework, architecture, database, deployment, or gameplay-rule decisions are made.

## Project Direction

- The game is called BattleNess.
- The current effort is a clean rebuild.
- Do not assume the old implementation should be preserved unless the user explicitly asks to reuse something.
- The game targets the browser with a mobile-first experience.
- The game is a turn-based one-versus-one combat game inspired by Hearthstone.
- Persistence should use SQL, with SQLite for development and PostgreSQL for production.
- The first milestone is a local deterministic browser combat prototype focused on the combat engine.
- The first prototype should let one local user control both combat sides through a simple UI.
- Use TypeScript across gameplay logic, frontend, backend, and tests where practical.
- Define early game content and test fixtures in JSON files.
- BattleNess does not have predefined hero classes. In combat, the hero is the logged-in player represented by account and progression data.
- Initial content definitions should be split across separate JSON files under `packages/content/src/definitions/`, such as `rings.json`, `gems.json`, `monsters.json`, `spells.json`, and `materials.json`.
- Prototype fixtures should live under `packages/content/src/fixtures/` and simulate database-owned player and inventory data.
- Engine tests should include focused unit tests and full combat scenario tests loaded from JSON fixtures.
- Content objects should use readable camelCase string IDs.
- Ring and gem definitions should describe base item types only; socketing, enchantments, total experience, quality, ownership, and equipped state belong to player-owned item instances. Levels are derived from total experience.
- Monster and spell progression belongs to explicit player-owned instances referenced by gem enchantments and resolved before combat.
- Use `common`, `refined`, `rare`, and `legendary` as the rarity identifiers; the previous `normal` and `magic` identifiers are obsolete.
- The combat engine should not read JSON files directly. It should receive validated `BattleSetup` objects prepared from definitions, player fixtures or database rows, and inventory instances.
- Combat engine actions should be typed command objects, and engine results should include detailed event logs.
- Randomness should go through deterministic seeded state only.
- JSON content should be validated with a TypeScript-friendly schema validation library such as Zod.
- Run relational validation after schema validation so cross-file IDs, ownership, equipment, sockets, enchantments, and battle setup references fail before combat starts.
- Use a TypeScript monorepo with separate workspaces for the combat engine, game content, and first prototype app.
- Use Vite with a simple DOM interface for the first local combat prototype.
- Use pnpm as the package manager.
- Use Vitest for engine unit tests and JSON scenario tests.
- Use ESLint and Prettier for linting and formatting.
- Do not build a backend for the first combat prototype.
- Use Prisma as the ORM/database migration tool when persistence work begins.
- The first combat prototype should be deployable as a simple static build after it becomes playable.
- Use GitHub Actions for install, typecheck, lint, and tests.
- Use the active Node.js LTS version at setup time and manage pnpm through Corepack.
- Use `packages/engine`, `packages/content`, and `apps/prototype` as the initial workspace layout.
- Use WebSocket as the primary future multiplayer transport.
- Prefer OAuth login first, especially Google and Facebook, then add email and password authentication.
- Build localization from the beginning: user-facing text should resolve through localization keys and translation JSON files, not hardcoded strings.
- Set up an organized asset pipeline from the beginning, even if early assets are AI-generated templates.
- Keep versioned JSON content definitions as the source of truth and import them into the database if runtime querying, admin tooling, or production operations require it. Player-owned instances and progression data belong in the database.
- Multiplayer should eventually use an authoritative server, matchmaking, and turn-based real-time interaction.

## Current Discussion Status

- The framework/engine has not been selected yet.
- The architecture has not been selected yet.
- The long-term frontend/backend framework choice has not been selected yet; Nuxt is the likely main app candidate and Phaser can be introduced for the combat view after the local engine works.
- The long-term deployment platform has not been selected yet; a classic Node server or VPS is preferred if feasible.
- The combat UI direction has not been selected yet; a simple UI is enough for the first prototype.
- Tooling choices such as bundler, tests, linting, and asset pipeline have not been finalized yet.
