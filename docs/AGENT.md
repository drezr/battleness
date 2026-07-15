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
- Use `common`, `refined`, `rare`, and `epic` as the rarity identifiers; the previous `normal` and `magic` identifiers are obsolete.
- The combat engine should not read JSON files directly. It should receive validated `BattleSetup` objects prepared from definitions, player fixtures or database rows, and inventory instances.
- Combat engine actions should be typed command objects, and engine results should include detailed event logs.
- Randomness should go through deterministic seeded state only.
- JSON content should be validated with a TypeScript-friendly schema validation library such as Zod.
- Run relational validation after schema validation so cross-file IDs, ownership, equipment, sockets, enchantments, and battle setup references fail before combat starts.
- Use a TypeScript monorepo with separate workspaces for the combat engine, game content, Dev Lab prototype app, and Nuxt Game App.
- Use Vite with a simple DOM interface for the first local combat prototype.
- Use pnpm as the package manager.
- Use Vitest for engine unit tests and JSON scenario tests.
- Use ESLint and Prettier for linting and formatting.
- Do not build a backend for the first combat prototype.
- Use Prisma as the ORM/database migration tool for the Nuxt Game App durable schema. The current development datasource is local SQLite, with PostgreSQL still targeted for production.
- Keep `apps/web/prisma/schema.prisma` as the canonical SQLite development model. Generate the PostgreSQL mirror with `prisma:postgres:prepare`, maintain its migrations separately under `apps/web/prisma/postgresql/migrations`, and require PostgreSQL migration deployment, drift detection, and transactional smoke coverage in CI.
- Keep the Nuxt Game App on Prisma 6.x for now. Prisma 7 requires a SQLite driver adapter in application runtime, and the current Windows development environment should not depend on native `better-sqlite3` build tooling until that upgrade is intentionally planned.
- The first combat prototype should be deployable as a simple static build after it becomes playable.
- Use GitHub Actions for install, typecheck, lint, and tests.
- Use the active Node.js LTS version at setup time and manage pnpm through Corepack.
- Use `packages/engine`, `packages/content`, `apps/prototype`, and `apps/web` as the current workspace layout.
- Keep `apps/prototype` as a permanent Dev Lab. Do not replace or remove its debug-heavy interface when building the player-facing Game App.
- Use `apps/web` as the Nuxt Game App scaffold for player-facing UI, backend routes, and persistence integration.
- Use authenticated WebSocket invalidation events as the primary multiplayer transport. Keep HTTP APIs and Prisma authoritative, and retain polling as a fallback.
- Prefer OAuth login first, especially Google and Facebook, then add email and password authentication.
- Resolve every player-owned Nuxt API through the request-scoped authenticated player context. Store only SHA-256 hashes of opaque session tokens, keep the raw token in an HttpOnly SameSite cookie, and preserve the explicit local development login without enabling it in production.
- Keep OAuth client secrets outside Git. Google login must use the server-side authorization-code flow, browser-bound hashed state, PKCE S256, a one-time expiring login attempt, and Google `sub` as the stable provider identifier. Never merge accounts automatically from email equality alone.
- Persist the account-facing display name and public/private profile visibility separately from the technical username. Persist locale, theme, interface density, reduced-motion, mute, and volume preferences in a one-to-one player preference record.
- Build localization from the beginning: user-facing text should resolve through localization keys and translation JSON files, not hardcoded strings.
- Set up an organized asset pipeline from the beginning, even if early assets are AI-generated templates.
- Keep versioned JSON content definitions as the source of truth and import them into the database if runtime querying, admin tooling, or production operations require it. Player-owned instances and progression data belong in the database.
- Prototype forge recipes use exactly three quantity-1 materials from the matching crafting family. Ingredient rarity pattern is common/common/common for common outputs, refined/common/common for refined outputs, rare/refined/common for rare outputs, and epic/rare/refined for epic outputs. Crafted prototype items start at level 1 and quality 0; crafted rings start with one socket.
- Item stat scaling is conservative: item level adds +2% per level after level 1, quality adds a linear bonus from 0% at quality 0 to +25% at quality 100, and resolved values floor after applying the combined multiplier. Rings and gems scale damage, spells scale direct-damage effect amounts, and monsters scale health and damage. Energy, cooldown, speed, and penalties do not scale for now.
- Keep the content balance report available for development balancing. It compares rings, gems, spells, and monsters across base (`level 1`, `quality 0`), mid (`level 10`, `quality 50`), and max (`level 50`, `quality 100`) progression profiles, and flags high primary-metric outliers within each item type and rarity group.
- The prototype development inventory is browser-local and versioned JSON-backed. It persists prototype credits, forge material stock, crafted item instances, and the next crafted-instance sequence. Battle Lab can use either free-edit definitions or crafted development inventory instances as its item source.
- Development inventory starts with 1000 prototype credits. Quality improvement adds 5 quality points to a crafted item up to 100. Ring socket improvement increases crafted rings up to 3 sockets. Improvement costs scale by rarity and current item state.
- The setup screen should keep exposing the complete development inventory: total counters, all material quantities, crafted item cards, and type, rarity, and element filters.
- Development inventory socketing rules: a ring can socket crafted gems up to its socket count, a gem can be socketed in only one ring, a gem can have at most one spell or monster enchantment, and each crafted spell or monster can be used as only one enchantment.
- Battle Lab inventory-backed ring selection should import the selected ring's socketed gems and those gems' enchantments automatically.
- The development loadout builder is browser-local and should keep saving named sets of up to 10 crafted ring instance IDs, previewing resolved combat metrics, and sending the selected ring set to either Battle Lab player.
- Prototype post-battle rewards are deterministic and claimable once per non-replay finished battle. Winner rewards are 150 credits plus `aluminium`, `hydrogen`, `pearl`, and `sand`; draw rewards are 90 credits plus `aluminium` and `pearl`.
- Prototype item XP rewards apply only to crafted development inventory instances referenced by Battle Lab source IDs. Equipped source-backed items gain 8 XP, and each actual ring use, socketed gem use, spell trigger, monster summon, or monster attack adds 20 XP to the matching crafted item instance. Hero XP remains deferred.
- Finished battles should show a deterministic result summary derived from the battle log: result, turns, actions played, damage by player, rings used, spells cast, monsters summoned or used, item XP generated, and reward claim status. Replays may show the summary but must not make rewards claimable.
- Development inventory cards and loadout builder ring summaries should keep showing derived level, current XP, next-level XP, and visual XP progress.
- Keep a full starter development loop DOM test before campaign work: craft a ring, gem, and spell; improve quality; socket and enchant; send the inventory-backed ring to Battle Lab; use it in combat; claim rewards; and verify persisted credits, materials, item XP, quality, and combat summary output.
- Multiplayer should eventually use an authoritative server, matchmaking, and turn-based real-time interaction.
- Preserve the implemented private PvP authority boundary: invitation membership, owned loadout locking, battle creation, action validation, and persisted outcomes are server-owned. WebSocket messages only invalidate client state; clients reload authoritative HTTP resources, and polling remains a fallback. Replace the process-local event hub with shared pub/sub before horizontal server scaling.
- Preserve the private PvP active-turn timeout rule: an active player has five minutes, the deadline persists and continues through disconnects, every accepted action transfers and resets it for the next active player, and expiration is settled by the server as that player's concession.
- Preserve the private PvP opening-duel timeout rule: the separate 90-second deadline starts with battle creation and continues through disconnects; choices are hidden, locked, and immutable; each tied duel resets the full deadline; one missing choice is a journaled concession; no choices produce a journaled draw without rewards; and three ties use a deterministic seed-based tiebreaker recorded in the event log.

## Current Discussion Status

- The initial Game App framework is Nuxt in `apps/web`.
- The architecture keeps the pure engine and content packages separate from the Dev Lab and Game App.
- Phaser can be introduced later for the combat view after the Nuxt app shell and engine integration are stable.
- The long-term deployment platform has not been selected yet; a classic Node server or VPS is preferred if feasible.
- The combat UI direction has not been selected yet; a simple UI is enough for the first prototype.
- Tooling choices such as bundler, tests, linting, and asset pipeline have not been finalized yet.
