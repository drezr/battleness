# State

This file records modifications made to the project during agent-assisted work.

## Current State

- BattleNess is being restarted as a clean rebuild.
- A TypeScript monorepo skeleton is in place with `packages/engine`, `packages/content`, and `apps/prototype`.
- The first deterministic local combat prototype is implemented with JSON-backed content, scenario fixtures, localization files, and a Vite browser UI.
- The combat engine now resolves the starting player from hero speed, lower hero level, or repeated element duels when speed and level are tied.
- The prototype event log now renders localized event titles and descriptions while preserving compact technical IDs for debugging.
- The prototype target selector now disables Taunt-protected enemy targets, auto-selects a legal fallback target, and displays Taunt skill badges on monsters.
- The prototype now opens on a battle setup screen that previews the selected scenario, seed, players, computed stats, rings, gems, and enchantments before launching combat.
- Additional prototype setups now cover lower-level-start and element-duel-start rules from the setup screen.
- The user's battle layout sketch is documented as future UI direction, while the current prototype remains an engine/debug interface.
- The prototype combat screen now includes a first sketch-inspired battle board with heroes, monster rows, active rings, selectable targets, an end-turn control, and top/bottom energy tracks.
- The battle board now supports explicit ring or monster preparation followed by target selection, with visual states for ready, selected, cooldown, insufficient energy, legal targets, and blocked targets.
- The battle board temporarily displays both players' rings for development testing, while only the active player's available rings can be prepared and used.
- Battle board monster cards now display current/base cooldown beside damage and health.
- Battle board monster cards are wider for stat readability, and board ring cards now display current/base cooldown.
- The prototype now has DOM interaction tests for board ring use, Taunt target restrictions, and summoned-monster attacks on a later ready turn.
- Ring definitions and battle setups now enforce a minimum resolved ring cooldown of 1.
- The rules for Shield, Pierce, Haste, Rage, and MultiHit are decided, and monsters are limited to one skill each.
- Shield, Pierce, Haste, Rage, and MultiHit are implemented in the deterministic engine with dedicated replay events and localized prototype rendering.
- A development-only `skillShowcase` scenario preloads ready monsters for manual skill testing.
- Successful combat commands are recorded in `actionHistory`, and the prototype supports versioned battle-record JSON export, import, step replay, full replay, and deterministic result/state verification.
- GitHub Actions CI now installs pnpm before configuring the Node cache and uses Node 24-compatible action runtimes.
- The BattleNess logo and application icon are stored in the prototype brand assets and used in the header, favicon, and Apple touch icon metadata.
- Progression and stat formulas are now decided for experience-derived levels, quality and level scaling, hero health, fixed turn energy, equipment speed, spell penalty reduction, and campaign reward configuration.
- The content/setup layer now implements those formulas, derives levels from total experience, and resolves owned item progression before combat.
- Monster and spell enchantments now reference explicit owned inventory instances with independent experience and quality.
- Content startup validation now checks cross-file references, ownership, uniqueness, equipment, sockets, enchantments, and battle setup consistency after Zod shape validation.
- A complete prototype content collection proposal now covers rings, gems, monsters, direct-damage spells, materials, elemental roles, base statistics, and development-only fixtures.
- The confirmed prototype collection is implemented as content version `prototype-3` with `common`, `refined`, `rare`, and `legendary` rarity tiers.
- Combat instances now retain rarity, and the prototype frames rings, gems, and monsters with their rarity color across board, setup, detail, and manual-action views.
- Rings, gems, and monsters now show localized top-right elemental badges, and compact gem sockets combine elemental fill with rarity borders.

## Change Log

### 2026-06-30

- Added Happy DOM-backed prototype interaction tests that exercise the rendered battle board instead of calling the combat engine directly.
- Covered ring preparation and targeting, Taunt-protected targets, monster cooldown readiness, and the summon-then-attack regression path.
- Raised all zero-cooldown sample rings to cooldown 1 and added content and engine validation that rejects ring cooldowns below 1.
- Documented the confirmed single-skill monster model and the complete Shield, Pierce, Haste, Rage, MultiHit, resolution-order, and replay-event rules.
- Migrated monster definitions and combat instances from `skills[]` to one optional `skill`, with explicit Shield and Rage runtime state.
- Implemented Shield, Pierce overflow, Haste summon readiness, threshold-based Rage, and side-wide MultiHit resolution.
- Added dedicated localized skill events, positive monster cooldown validation, two missing skill content definitions, a skill showcase fixture, and engine/content/DOM regression tests.
- Added versioned `BattleRecord` generation, JSON serialization and parsing, action-shape validation, deterministic replay, result verification, and canonical final-state checksums.
- Added localized prototype controls for battle-record export, import, step replay, and full replay, with manual combat locked while a replay is incomplete.
- Added engine and DOM regression tests for successful-action history, invalid-action exclusion, serialization, replay equivalence, tamper detection, and replay controls.
- Fixed GitHub Actions CI startup failures by using `pnpm/action-setup@v6` before `actions/setup-node@v6`, upgrading checkout to v6, and removing the obsolete Corepack activation step.
- Added the provided BattleNess logo and icon under `apps/prototype/public/assets/brand/` and integrated them into the prototype UI and HTML metadata.
- Documented the confirmed progression formulas: `100 * level^2` total experience thresholds, additive level and quality item scaling, level-based hero health, unscaled equipped-ring speed, fixed turn energy progression, and spell penalty reduction.
- Defined solo campaign rewards as opponent-owned content data and deferred PvP and ranked reward formulas until matchmaking and ranking design.
- Added the progression resolver with experience thresholds, capped level derivation, item scaling, hero health, and spell penalty calculations.
- Migrated player, ring, and gem fixtures from persisted levels to total experience, and added owned monster and spell fixture instances.
- Resolved progressed monster and spell instances into battle-scoped definitions while preserving stable content IDs in engine actions, events, and summoned-monster IDs.
- Bumped the fixture/content format to `prototype-2` and added focused formula, schema-migration, setup-resolution, and runtime-enchantment tests.
- Added aggregated relational content validation with focused tests for unknown definitions and owners, invalid equipment and sockets, missing or reused enchantments, duplicate instance IDs, and invalid battle setups.
- Recorded that solo campaign opponents and reward records remain intentionally deferred.
- Added `docs/CONTENT_COLLECTION_PROPOSAL.md` as a non-executable balance proposal for confirmation before JSON and locale implementation.
- Replaced the initial 12-material proposal with a 70-material model derived from the historical SQLite `mats` table and real-world chemistry.
- Added `docs/MATERIAL_COLLECTION_PROPOSAL.md` with crafting families, rarity prices, English and French names, chemical metadata, real-world material classifications, and historical recipe ID migrations.
- Implemented 13 ring definitions, 13 gem definitions, 18 monster definitions, 6 direct-damage spell definitions, and 70 material definitions with complete English and French localization.
- Replaced the `normal` and `magic` rarity identifiers with `common` and `refined` across schemas, definitions, tests, and documentation.
- Extended material validation to enforce atomic metadata, unique chemical symbols and atomic numbers, rarity prices, and required localization keys.
- Propagated rarity through engine monster definitions and combat instances, added shared rarity border styles, and preserved separate hover, selection, targeting, and blocked-state feedback.
- Added DOM tests for common and refined rings, refined gems, and rare monsters.
- Added DOM assertions for Electric ring and Ice monster badges while preserving localized element labels.

### 2026-06-25

- Added ring detail display to `apps/prototype`, including total ring damage, current/base cooldown, socketed gems, gem penalties, and resolved spell or monster enchantments.
- Added localized UI labels for gem, damage, penalty, spell, monster, enchantment, and empty-gem display terms to the English and French locale files.
- Added focused engine tests for Taunt target blocking, first-turn opposing hero damage protection across ring and spell effects, full-board summon failure, simultaneous hero defeat draws, and cooldown decrement timing.
- Implemented combat-start resolution in `packages/engine`: speed chooses the first player, tied speed falls back to lower level, and tied speed plus tied level enters repeated fire/ice/electric element duels until one player wins.
- Moved first-player selection out of `packages/content`, so fixture builders now create unresolved battle setup data and the engine initializes turn energy and active player state.
- Added prototype controls and locale labels for element choices during first-player duel states.
- Updated engine/content tests for speed, level, repeated element-duel resolution, and engine-owned first-player initialization.
- Replaced the raw JSON event-log display in `apps/prototype` with localized event titles, human-readable event messages, and compact technical detail fields.
- Added localized English and French event-log labels and message templates for all current engine event types.
- Improved manual target selection in `apps/prototype` by disabling enemy targets protected by Taunt, showing a localized Taunt notice, auto-correcting illegal selected targets, and displaying localized monster skill badges.
- Added a battle setup screen to `apps/prototype` with scenario selection, setup metadata, player stat previews, equipped ring and gem details, and an explicit start-battle action before entering combat controls.
- Added prototype battle setup fixtures and scenario fixtures for lower-level starting priority and speed/level-tied element duel resolution.
- Added prototype player and inventory fixtures plus a training fire ring definition to support equal-speed element-duel testing.
- Documented the user's battle layout sketch direction in `docs/PROJECT.md` and `docs/RESUME.md`.
- Added the first sketch-inspired battle board view to `apps/prototype`, keeping the existing debug panels below it for inspection and scenario replay.
- Improved the battle board interaction model so board rings and ready active-player monsters are prepared first and then executed by clicking a legal target, with localized hints and clearer visual availability states.
- Updated the development battle board to show both players' ring rows, with inactive or unavailable rings still disabled.
- Added current/base cooldown display to monster cards on the battle board.
- Widened battle board monster cards and added current/base cooldown display to board ring cards.
- Added manual combat controls to `apps/prototype`, allowing the active player to select a target, use available rings, use ready monsters, end the turn, or concede while keeping scenario replay controls and the event log.
- Added localized UI labels for manual combat controls to the English and French locale files.

### 2026-06-24

- Connected `apps/prototype` to the combat engine so JSON scenarios can be selected, reset, stepped through, or executed fully from the browser UI, with player state, rings, monsters, remaining actions, errors, and event logs displayed through localized UI labels.
- Implemented the first executable combat-engine slice: fixture-to-`BattleSetup` building, battle state creation, `useRing`, `useMonster`, `endTurn`, `concede`, energy spending, cooldown updates, ring and gem damage, direct-damage spells, monster summons, Taunt targeting, first-turn hero damage protection, monster destruction, battle end checks, and JSON scenario execution tests.
- Added the initial TypeScript monorepo skeleton with pnpm workspaces, shared TypeScript config, ESLint, Prettier, GitHub Actions CI, `packages/content`, `packages/engine`, and `apps/prototype`.
- Added initial content definitions, prototype fixtures, localization files, Zod schemas, engine contract types, basic setup validation, starter tests, and a Vite prototype preview.
- Added the initial implementation contract to `docs/PROJECT.md` and `docs/RESUME.md`, covering definition files, prototype fixtures, locale files, initial data shapes, `BattleSetup`, battle actions, event log types, and first scenario fixtures.
- Corrected the content and player-data model in `docs/PROJECT.md`, `docs/RESUME.md`, and `docs/AGENT.md`: BattleNess has no predefined hero classes, JSON files hold reusable content definitions, prototype fixtures simulate database-owned player and inventory data, item sockets/enchantments/levels/quality belong to player-owned instances, and the combat engine receives validated `BattleSetup` objects instead of reading JSON directly.
- Added remaining product and platform decisions to `docs/PROJECT.md`, `docs/RESUME.md`, and `docs/AGENT.md`: static prototype deployment, GitHub Actions CI, Node LTS with Corepack, initial workspace layout, WebSocket multiplayer, live PvP first, reconnectable matches, private match codes before matchmaking, OAuth-first authentication, localization from the beginning, organized asset pipeline, future audio, action-log match history, and JSON content as source of truth with optional database import.
- Added technical stack decisions to `docs/PROJECT.md`, `docs/RESUME.md`, and `docs/AGENT.md`: TypeScript monorepo, Vite DOM prototype app, pnpm, Vitest, ESLint, Prettier, no backend for the first prototype, Prisma for future persistence work, and Nuxt plus Phaser as a proposed long-term application shape.
- Added the visual color reference from the color code image to `docs/PROJECT.md` and `docs/RESUME.md`.
- Added engine and content format decisions to `docs/PROJECT.md`, `docs/RESUME.md`, and `docs/AGENT.md`: readable camelCase string IDs, typed action commands, detailed event logs, deterministic seeded randomness, single-action and multi-action scenario fixtures, and Zod-style JSON validation.
- Added combat and tooling decisions to `docs/PROJECT.md`, `docs/RESUME.md`, and `docs/AGENT.md`: three direct-damage test spells, Taunt applying to direct-damage spells, self-targeting ignoring enemy Taunt, immediate monster removal on death, rings starting ready, split JSON content files, and both unit and JSON scenario tests for the engine.
- Added spell and prototype-stat decisions to `docs/PROJECT.md` and `docs/RESUME.md`: no healing mechanics, a direct-damage test spell, broad spell targeting including self-damage, post-ring spell resolution, direct JSON combat values for the first prototype, a future stat-formula boundary, and immediate battle end after complete action resolution.
- Added additional combat rule decisions to `docs/PROJECT.md` and `docs/RESUME.md`, including repeated element duels on ties, floor rounding for elemental advantage, summon failure on full boards, multiple-Taunt targeting, enchantment behavior after target death, draw results, minimum ring cost, and the initial spell-effect scope.
- Added elemental design direction from the elemental features reference image to `docs/PROJECT.md` and `docs/RESUME.md`.
- Updated combat rule decisions in `docs/PROJECT.md` and `docs/RESUME.md`, including speed tie-breakers, per-player energy progression, cooldown timing, action count, targeting, Taunt, monster board size, duplicate summons, first-turn protection, ring resolution order, and elemental advantage.
- Updated `docs/PROJECT.md`, `docs/RESUME.md`, and `docs/AGENT.md` with newly confirmed technical direction: TypeScript across the stack, a pure deterministic combat engine, JSON prototype content, and a local combat prototype as the first milestone.
- Added a documentation language rule to `docs/AGENT.md`: all new information added to files in `docs/` should be written in English.
- Added `docs/RESUME.md` as a handoff document for continuing BattleNess planning and development on another computer or with another agent.
- Rewrote `docs/RESUME.md` after the file was moved into the documentation directory.

### 2026-06-05

- Added a proposed game rules specification to `docs/PROJECT.md`, separating executable combat rules and unresolved rule questions from implementation decisions.
- Added a proposed BattleNess glossary to `docs/PROJECT.md` covering combat, actors, items, stats, elements, progression, and economy.
- Added explicit technical decision tracking to `docs/PROJECT.md`, separating decided, proposed, and undecided topics.
- Replaced the previous unrelated state history with a clean BattleNess baseline.
- Added persistent agent instructions in `docs/AGENT.md`.
- Added the initial project summary, rules summary, and technical baseline in `docs/PROJECT.md`.
