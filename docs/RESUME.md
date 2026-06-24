# Resume

This file is a handoff for continuing BattleNess development on another computer or with another agent.

## Read First

Read these files before making changes:

- `docs/AGENT.md`: persistent instructions for future agents.
- `docs/PROJECT.md`: project summary, rules, glossary, proposed rules specification, and technical decisions.
- `docs/STATE.md`: change log for agent-assisted project modifications.

## Current Project State

- Project name: BattleNess.
- Current phase: planning and technical discussion before implementation.
- User intent: clean rebuild of an already-started game.
- No gameplay/application code has been implemented for the rebuild yet.
- The user handles commits and pushes to GitHub themselves.
- The `docs/` directory is currently untracked in git unless the user has staged it elsewhere.
- The first milestone is a local deterministic combat prototype focused on the combat engine.

## Persistent Documentation Rules

- Record all project modifications in `docs/STATE.md`.
- Record persistent agent instructions in `docs/AGENT.md`.
- Record project summary, game rules, and technical decisions in `docs/PROJECT.md`.
- Update `docs/PROJECT.md` whenever framework, architecture, database, deployment, or gameplay-rule decisions are made.
- Keep proposed ideas clearly marked as proposed until the user confirms them.

## Game Summary

BattleNess is a browser-based, mobile-first, turn-based one-versus-one combat game inspired by Hearthstone.

Rules source: https://battleness.com/rules.html

High-level rules:

- Each player controls one hero.
- Each hero can equip up to 10 rings.
- Heroes have speed, health, and energy.
- Speed determines the starting player.
- Health reaching 0 causes defeat.
- Energy refreshes each turn, starts at 1, increases by 1 each turn, and caps at 8.
- Rings are the main combat actions.
- Rings have energy cost, cooldown, damage, and 1 to 3 sockets.
- Gems go into ring sockets and add damage.
- Gems can be enchanted with monsters or spells.
- Ring use triggers socketed gem enchantments.
- Monsters fight alongside the hero and have damage, health, cooldown, elemental type, and optional skills.
- Spells have unique effects.
- The starting player cannot damage the opposing hero on the first turn, but can still summon monsters and cast spells.
- Items have rarity, quality, level, experience, speed points, and elemental properties.
- Elements are electric, fire, and ice: electric beats fire, fire beats ice, ice beats electric.
- Credits are the virtual currency.
- Combat rewards can include experience, credits, and materials.
- Solo campaign, PvP, forge, shop, and future player market are expected game systems.

See `docs/PROJECT.md` for the full proposed glossary and proposed game rules specification.

## Decided Technical Direction

The following are currently marked as decided in `docs/PROJECT.md`:

- BattleNess will run in the browser.
- The UI/UX should be mobile first.
- The project is a clean rebuild.
- Persistence should use SQL.
- Development database: SQLite.
- Production database: PostgreSQL.
- Use TypeScript across gameplay logic, frontend, backend, and tests where practical.
- Keep the combat engine pure, deterministic, and independent from UI, database, sockets, and framework code.
- Define early game content and test fixtures in JSON files.
- First milestone: local browser combat prototype where one local user can control both sides through a simple UI.
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
- Build live synchronous PvP first when multiplayer work starts, with asynchronous play left as a possible later addition.
- Live matches should be preserved during disconnects and allow players to reconnect.
- The first future PvP mode should support private matches by code before automatic matchmaking; ranked mode is desired later alongside solo/campaign.
- Prefer OAuth login first, especially Google and Facebook, then add email and password authentication.
- Build a localization module from the beginning. User-facing text must resolve through localization keys and translation JSON files, not hardcoded strings.
- Set up an organized asset pipeline from the beginning, even if early assets are AI-generated templates that may be replaced later.
- Plan for sound and music later.
- Persist match actions, deterministic seed, and result for replay/debug/history, similar in spirit to chess PGN.
- Keep versioned JSON content definitions as the source of truth and import them into the database if runtime querying, admin tooling, or production operations require it. Player-owned instances and progression data belong in the database.

## Proposed Technical Direction

The following are proposals, not final decisions:

- Use an authoritative server for multiplayer.
- Keep Nuxt as the likely main application frontend/backend candidate and introduce Phaser for the combat presentation once the local combat engine works and if the combat view needs canvas rendering, animation-heavy interactions, or game-scene tooling.

## Not Decided Yet

- Browser game framework or rendering approach.
- Frontend application framework.
- Backend framework.
- Long-term deployment platform. A classic Node server or VPS is currently preferred if feasible, but this should be confirmed when backend and multiplayer requirements are clearer.
- Combat UI direction beyond a simple prototype interface.
- Whether Phaser is needed for the combat presentation.

## Recent Discussion Flow

The user asked how to improve the agentic development approach. The agreed improvements being worked through are:

1. Make technical decisions explicit.
2. Define a glossary.
3. Separate game rules from implementation rules.
4. Decide the first milestone before picking tools.
5. Keep gameplay logic independent from UI.
6. Add agent workflow instructions.

Completed so far:

- Point 1: added `Technical Decisions` to `docs/PROJECT.md`.
- Point 2: added `Proposed Glossary` to `docs/PROJECT.md`.
- Point 3: added `Proposed Game Rules Specification` to `docs/PROJECT.md`.
- Point 4: decided that the first milestone is a local deterministic combat prototype.
- Point 5: decided that the combat engine should stay pure, deterministic, and independent from UI/database/network concerns.

Suggested next step:

- Resolve the core combat rule questions before implementing the combat engine.

## Rule Questions Still Open

These questions are listed in `docs/PROJECT.md` and should be resolved before implementing the combat engine:

- What are the exact formulas for level, quality, damage, health, energy cost, cooldown, experience, and rewards?

## Recent Combat Rule Decisions

- Speed determines the starting player. If speed is tied, the lower-level hero starts. If speed and level are tied, an element choice duel decides the starting player.
- Each player has their own energy progression: 1 on that player's first turn, then +1 per own turn, capped at 8.
- Cooldowns decrement at the start of the controller's turn before actions.
- Players can use as many ready rings and ready monsters as energy, cooldowns, and rules allow.
- Rings and monsters can target heroes or monsters by default.
- Taunt prevents the opponent from targeting non-Taunt targets controlled by the Taunt owner's side.
- Taunt blocks opposing rings, monsters, and direct-damage spells unless a rule or effect explicitly allows otherwise.
- Enemy Taunt does not restrict a player targeting their own hero or their own monsters.
- Each side can control up to 3 monsters.
- Monsters are removed immediately after the effect that reduces their health to 0.
- Duplicate monster summons create new monster instances if the board is not full.
- First-turn protection prevents all damage to the opposing hero during the starting player's first turn.
- All rings begin battle ready.
- Ring use resolves as: pay energy, put the ring on cooldown, apply ring and gem damage, trigger enchantments in socket order, then check win conditions.
- If the starting-player element duel results in both players choosing the same element, the duel repeats until there is a winner.
- Elemental advantage grants +10% damage, rounded down.
- If a summon effect would exceed the 3-monster board limit, the summon fails without cancelling the rest of the action.
- If the defending side has multiple Taunt monsters, the attacker may choose any Taunt monster as the target.
- If ring damage kills its target before enchantments trigger, only enchantments that specifically require the dead target fail.
- If both heroes reach 0 during the same resolution sequence, the battle result is a draw.
- A ring's current energy cost cannot be lower than 1.
- BattleNess should not include healing mechanics, to keep combat dynamic.
- The initial combat engine should support explicit spell effects and include three direct-damage test spells: Spark, Firebolt, and Ice Shard.
- The initial direct-damage spell can target heroes or monsters, allies or enemies, including self-damage or damaging allied monsters.
- Spells do not directly add damage to their triggering ring; they resolve after ring and gem damage and apply their own effects afterward.
- BattleNess does not have predefined hero classes. In combat, the hero is the logged-in player represented by account and progression data.
- In production, player identity, experience, equipped rings, inventory item instances, socket counts, socketed gems, gem enchantments, item levels, and item quality should come from the database.
- For the first combat prototype, fixture JSON files should simulate the database-owned player and inventory data.
- Health, damage, energy cost, cooldown, and similar combat values should be resolved from content definitions plus player-owned item instances.
- Initial content definitions should be split across separate JSON files under `packages/content/src/definitions/`, such as `rings.json`, `gems.json`, `monsters.json`, `spells.json`, and `materials.json`.
- Prototype fixtures should live under `packages/content/src/fixtures/` and include simulated players, inventories, and battle setups.
- The engine should keep a clear stat-input boundary so level, quality, and progression formulas can be added later without rewriting core combat resolution.
- Engine tests should include both focused unit tests and full combat scenario tests loaded from JSON fixtures.
- Win-condition checks happen after each complete action resolution. If a hero is at 0 health at that point, the battle ends immediately.
- Content objects should use readable camelCase string IDs, such as `spark`, `firebolt`, and `iceShard`.
- Ring definitions should describe the base ring type only. Socket count, socketed gems, item level, quality, ownership, and equipped state belong to player-owned ring instances.
- Gem definitions should describe the base gem type only. Gem enchantments, item level, quality, and ownership belong to player-owned gem instances.
- Monster and spell definitions describe reusable content. Player-owned monster or spell instances should be introduced only when those objects need to exist as owned inventory items.
- The combat engine should not read JSON files directly. It should receive validated `BattleSetup` objects prepared from definitions, player fixtures or database rows, and inventory instances.
- `BattleSetup` should contain the two players, resolved combat stats, equipped ring instances, socketed gem instances, referenced definitions, and any deterministic seed required for the battle.
- Player actions sent to the combat engine should be represented as typed command objects, such as `{ type: "useRing", actorId, ringId, targetId }`.
- The combat engine should produce a detailed event log after each action for debugging, UI rendering, and future replay support.
- Randomness should be allowed only through deterministic seeded state. The initial rules do not require much randomness, but this protects future AI decisions, randomized rewards, shuffled/generated content, or random tie-breakers.
- Scenario test fixtures should support both single-action expectations and multi-action sequences.
- JSON content should be validated with a TypeScript-friendly schema validation library such as Zod.
- Initial implementation files should include content definitions under `packages/content/src/definitions/`, prototype fixtures under `packages/content/src/fixtures/`, and locale files under `packages/content/src/locales/`.
- Initial battle actions should include `chooseElement`, `useRing`, `useMonster`, `endTurn`, and `concede`.
- Initial event log types should include battle start/end, first-player choice, turn start/end, cooldown changes, ring use, energy spend, damage, spell cast, monster summon/use/destruction, and battle result.
- Initial scenario fixtures should include `basicRingAttack`, `summonAndTaunt`, and `spellSelfTargeting`.

## Elemental Design Direction

- Fire is oriented toward high damage and high cooldown time. Its associated special skills include Pierce and Rage.
- Electric is oriented toward low energy cost, high speed points, and low damage. Its associated special skills include Haste and MultiHit.
- Ice is oriented toward high health, low cooldown time, high energy cost, and low speed points. Its associated special skills include Taunt and Shield.

## Visual Color Reference

- Object colors: Ring uses pink, Gem uses cyan, Monster uses green, Spell uses magenta, and Material uses blue.
- Element colors: Electric uses yellow, Fire uses pink-red, and Ice uses light cyan.
- Rarity colors: Normal uses white or light gray, Magic uses blue, Rare uses orange, and Legendary uses purple.
- Stat colors: Damage uses pink-red, Health uses red, Energy uses green, Energy Penalty uses pale green, Cooldown uses light cyan, Cooldown Penalty uses cyan, Quality uses orange, Speed uses yellow, Skill uses magenta, and Rarity uses purple.

## Important Agent Behavior

- Do not implement code unless the user asks to move from discussion into implementation.
- Do not assume old code should be preserved.
- Prefer documenting proposals and asking the user to confirm/correct them during the planning phase.
- When implementation starts, keep the combat rules engine deterministic and separate from UI/framework/database concerns unless the user decides otherwise.
