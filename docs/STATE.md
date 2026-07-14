# State

This file records modifications made to the project during agent-assisted work.

## Current State

- Private PvP now uses an authenticated Nitro WebSocket channel for lobby and battle invalidation events. HTTP APIs and Prisma remain authoritative, clients refresh server state when an event arrives, heartbeat/reconnect behavior is automatic, multiple tabs per player are supported, and slower HTTP polling remains as a fallback. The initial event hub is process-local and must move to shared pub/sub before horizontal server scaling.
- Private PvP active turns now have a persisted five-minute server deadline. Each accepted action resets the deadline for the next active player, disconnecting does not pause it, polling or action submission settles an expired turn as a server-side concession, and the live view displays a local countdown backed by the authoritative timestamp. The opening element duel remains untimed until it determines an active player.
- Private PvP now has a persistent Prisma-backed lobby and authoritative battle lifecycle. Authenticated players can create a two-hour invitation code, join as the guest, independently lock an owned non-empty loadout, and enter the same engine-backed battle when both are ready. Lobby and live battle views poll the server for updates, reconnect through the player session, hide opponent rings, and persist the final winner and history outcome without PvP rewards yet.
- Local development authentication now exposes two explicitly allowed players so the private-match flow can be tested sequentially without external OAuth. Production still disables local authentication.
- The Nuxt Game App now has a request-scoped authentication foundation. Prisma stores provider identities and revocable expiring sessions, raw opaque tokens remain only in HttpOnly SameSite cookies, player-owned APIs resolve the session player instead of a global development constant, and a localized development login/logout flow preserves local work without enabling local authentication in production.
- Google sign-in is implemented behind environment configuration. It uses a server-side code exchange, browser-bound hashed state, PKCE S256, one-time expiring OAuth attempts, the Google `sub` claim as the stable identity key, and a localized login/error flow. Google tokens are not persisted, email equality never silently merges accounts, and an ignored local OAuth environment template prevents committing secrets.
- `/profile/settings` is now backed by Prisma and a validated atomic API. It edits the player display name and profile visibility, shows account metadata, persists account locale, applies system/dark/light themes, comfortable/compact density and reduced motion to the Game App shell, and stores mute plus master/music/effects volumes for the future audio system.
- PostgreSQL is now a verified parallel Prisma target. The SQLite schema remains canonical for local development; a checked generated PostgreSQL mirror has its own baseline migration, Docker Compose service, migration and drift commands, transactional smoke test, and dedicated GitHub Actions PostgreSQL job.
- Prisma now registers every active JSON content release with a SHA-256 definition checksum and manifest. Persisted inventory, rewards, material stock, market transactions, campaign progress, and battle records expose their originating or latest resolving content version; pre-tracking nullable rows are normalized to `legacy-unversioned`, and startup rejects reuse of a version identifier with different definitions.
- The Nuxt Game App now uses `@nuxtjs/i18n` with lazy English and French JSON catalogues, stable unprefixed routes, browser-cookie locale persistence, a real language selector under `/profile/settings`, and automated catalogue-key parity tests. Shared navigation plus the dashboard and progression/profile surfaces use technical English localization keys; remaining workflow text is tracked for migration in `docs/TODO.md`.
- Battle Hub, Campaign, Battle History, live battle controls and statuses, result verification, combat summaries, reward previews, and shared ring stat labels now read from the English/French Game App catalogues. Campaign and reward item names resolve directly from the shared content package catalogues.
- Craft, Socket, Quality, Inventory, Equipment, Loadouts, Game Market, application hubs, and mock routes now use the Game App catalogues for commands, statuses, filters, feedback, and accessible labels. Persisted item and material names resolve from the shared content catalogues.
- A Nuxt localization guard scans every page, component, and layout template and rejects new static user-facing text or literal accessible labels. English and French catalogue parity and non-empty-value tests remain active.
- The Nuxt Game App now has a real `/profile/progression` view backed by persisted player and inventory data. It shows hero and item level thresholds, XP remaining, campaign completion, collection metrics, quality values, total scalable-stat bonuses, and the exact level/quality stat formula. Inventory cards and item detail panels reuse the same progression meters.
- Ring actions now prevalidate attached spell targets. A spell expires cleanly when earlier ring and gem damage destroys its valid target during the same action, preventing campaign monster-target actions from failing after the monster is removed.
- Campaign content version `prototype-6` defines a validated linear starter track with three game-owned opponents, nested ring/gem/enchantment loadouts, explicit visibility, recommended levels, prerequisites, repeatability, and fixed first-clear and repeat-victory rewards. The Nuxt `/battle/campaign` view reads this catalogue from `/api/campaign`, starts authoritative campaign battles from the active Prisma loadout, and displays persisted completion state.
- Campaign battles resolve game-owned content loadouts into deterministic engine instances, hide opponent rings in the live player view, execute a deterministic server-side opponent that respects energy, cooldown, and Taunt, and atomically persist victory count plus the correct first-clear or repeat reward. Clearing an opponent unlocks the next content record immediately; defeats preserve only the normal participation and usage item XP.
- The Nuxt Game App can now start a persistent live training battle from the development player's active Prisma loadout. The server snapshots owned rings, sockets, gems, and enchantments into an engine setup, reconstructs current state from the persisted setup and action log, and exposes a player-facing live view without opponent ring details.
- The Nuxt Game App now persists verified development battle records and deterministic reward grants. Battle and profile history views expose replay metadata and atomic reward claims that update credits, materials, hero XP, and active-loadout item XP exactly once.
- The Nuxt Game Market now supports persistent material buying and selling with rarity-based fixed
  prices, quantity and credit previews, stock validation, atomic Prisma updates, persistent
  transaction history, and idempotent request IDs that prevent duplicate economic operations.
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
- Progression and stat formulas are now decided for experience-derived levels, quality and level scaling, hero health, fixed turn energy, equipment speed, fixed spell penalties, spell direct-damage scaling, and campaign reward configuration.
- The content/setup layer now implements those formulas, derives levels from total experience, and resolves owned item progression before combat.
- Monster and spell enchantments now reference explicit owned inventory instances with independent experience and quality.
- Content startup validation now checks cross-file references, ownership, uniqueness, equipment, sockets, enchantments, and battle setup consistency after Zod shape validation.
- A complete prototype content collection proposal now covers rings, gems, monsters, direct-damage spells, materials, elemental roles, base statistics, and development-only fixtures.
- The confirmed prototype collection is implemented as content version `prototype-5` with `common`, `refined`, `rare`, and `epic` rarity tiers.
- Combat instances now retain rarity, and the prototype frames rings, gems, and monsters with their rarity color across board, setup, detail, and manual-action views.
- Rings, gems, and monsters now show localized top-right elemental badges, and compact gem sockets combine elemental fill with rarity borders.
- The content package now includes 48 forge recipes for the collectible rings, gems, monsters, and spells. Development-only `trainingFlameBand` and `plainQuartz` stay outside the recipe pool.
- Prototype recipes always use exactly three quantity-1 materials from the matching crafting family. Material rarities scale by crafted item rarity: common uses three common materials, refined uses one refined and two common materials, rare uses one rare, one refined, and one common material, and epic uses one epic, one rare, and one refined material.
- Crafted prototype items are created at level 1 and quality 0. Crafted rings start with one socket.
- The setup screen now includes a development forge panel with recipe selection, required material stock controls, real material consumption, restock, and a list of crafted instances.
- The development forge now persists credits, material stock, crafted item instances, and next crafted-instance sequence in browser `localStorage`.
- Development inventory starts with 1000 prototype credits. Quality improvement raises one crafted item by 5 quality points up to 100, and ring socket improvement raises crafted rings up to 3 sockets. Improvement costs scale by rarity and current item state.
- The setup screen supports development inventory export, import, and reset through a versioned JSON format.
- Battle Lab now supports a development-inventory item source mode. In that mode, rings, gems, and spell or monster enchantments can be selected from crafted inventory instances, and level, quality, and ring socket count are derived from the selected instances.
- The setup screen now includes a complete development inventory view with total counters, all material stock quantities, crafted item cards, and type, rarity, and element filters.
- Development inventory crafted rings can now socket crafted gems up to their socket count, and socketed gems can be removed.
- Development inventory crafted gems can now be enchanted with one crafted spell or monster, and enchantments can be removed.
- The prototype prevents reusing a gem in multiple rings and prevents reusing the same spell or monster as multiple gem enchantments.
- Battle Lab inventory-backed ring selection now imports the selected ring's socketed gems and gem enchantments automatically.
- The setup screen now includes a development loadout builder that selects up to 10 crafted rings, summarizes resolved speed, damage, energy, and cooldown efficiency, saves named loadouts in browser `localStorage`, and can send the selected loadout to either Battle Lab player.
- Finished non-replay battles now show deterministic prototype rewards. Claiming rewards adds credits, common materials, and item XP to the browser-local development inventory. Winner rewards grant 150 credits plus one common material from each crafting family; draw rewards grant 90 credits plus two common materials. Source-backed equipped items gain 8 XP, and each ring use, socketed gem use, spell trigger, monster summon, or monster attack adds 20 XP to the matching crafted item instance.
- Finished battles now show a result summary derived from the battle log, including result, turn count, actions played, damage by player, rings used, spells cast, monsters summoned or used, item XP generated, and reward claim status.
- Crafted item cards now show derived level, current XP, next-level XP, and a progress bar. Loadout builder ring rows and selected-ring summaries also show level and XP progress.
- Scaled combat stats now render in green in the prototype when their resolved value is above the base definition value.
- Added a content balance report that compares rings, gems, spells, and monsters across base, mid, and max progression profiles and flags high primary-metric outliers by item type and rarity. The setup screen now exposes this report for development review.
- Added a full starter development loop DOM regression test covering craft, quality improvement, socketing, enchanting, Battle Lab inventory-backed combat, reward claiming, persisted credits and materials, item XP, and combat summary output.
- The Vite prototype in `apps/prototype` is now treated as the permanent Dev Lab for engine, content, inventory, and combat diagnostics.
- Added a separate Nuxt Game App scaffold in `apps/web` for the future player-facing application, keeping it parallel to the Dev Lab instead of replacing it.
- The Nuxt app currently includes a Prisma-backed local SQLite development player state, player API, forge craft API, inventory view, material view, and basic forge UI.
- BattleNess brand assets are copied into the Nuxt app so the new Game App can run independently from the prototype asset directory.
- The root workspace now includes `dev:web` for starting the Nuxt app separately from the existing prototype `dev` script.
- Added technical, non-visual UI wireframes for the current Dev Lab and Game App views in `docs/UI_WIREFRAMES.md`.
- Added a proposed player-facing Game App view structure in `docs/GAME_APP_VIEW_PROPOSAL.md`, including route hierarchy, section responsibilities, market/PvP staging, and recommended implementation order.
- The Nuxt Game App now implements the proposed player-facing route structure with a shared shell, main navigation, live craft/items/materials views, and mock UI views for battle, campaign, PvP, socketing, quality improvement, equipment, loadouts, market, and profile sections.
- The Nuxt Game App now reuses the item artwork atlases from the Dev Lab and renders item/material artwork in forge, inventory item, and material views.
- Added a centralized project TODO in `docs/TODO.md` covering Game App persistence, inventory, forge, battle integration, campaign, rewards, market, profile, authentication, PvP, player market, presentation, production, and open design questions.

## Change Log

### 2026-07-14

- Added account identity and hashed session persistence for SQLite and PostgreSQL, fixed PostgreSQL migration ordering, protected all player-owned API routes with request-scoped identity, added sliding session renewal and revocation, preserved an explicit local development login, and added cross-player isolation regression coverage.
- Added configurable Google OAuth login with browser-bound state, PKCE S256, one-time Prisma login attempts, server-side token exchange, stable Google identity mapping, localized login controls, SQLite/PostgreSQL migrations, and mocked end-to-end provider regression coverage.

### 2026-07-13

- Added persistent player profile metadata and one-to-one preferences in SQLite and PostgreSQL, validated profile settings APIs, localized responsive settings controls, globally applied display preferences, audio preference storage, and API/browser regression coverage.
- Added PostgreSQL readiness infrastructure: generated schema parity checks, a provider-specific migration baseline, optional PostgreSQL 17 Docker Compose service, migration drift detection, a relational transaction smoke test, CI service coverage, and operator documentation.
- Added the `ContentRelease` Prisma registry, content provenance for material stock, market transactions, and campaign progress, explicit legacy backfill, API version metadata, migration coverage, and collision regression tests.
- Added the first authoritative Game App live battle slice: database-owned active-loadout setup generation, persistent training battle creation, idempotent start requests, server-side state reconstruction, `/battle/live/:battleId`, hidden opponent rings, and API regression coverage.
- Added authoritative live action submission for element choice, rings, monsters, turn ending, and concession. The server assigns the authenticated development-player identity, validates every command through the pure engine, rejects stale action counts, uses optimistic journal writes, and persists final results plus replay checksums.
- Added target selection and action controls to the live Nuxt battle view, with server event feedback and disabled states for energy, cooldown, turn ownership, and finished battles.
- Added a temporary passive training-opponent adapter that chooses deterministic duel elements when required and otherwise only ends its turn. This keeps the training loop testable without defining campaign opponent AI early.
- Added atomic live battle settlement. The action that finishes a battle now creates its deterministic credits, hero XP, materials, and item XP grant in the same transaction as the final action journal and replay checksum.
- Ported action-based item XP to Prisma-backed live battles: participating rings, gems, and enchantments receive 8 XP, while effective ring/gem/spell use, monster summons, and monster attacks add 20 XP to their source inventory instances.
- Added live-view reward details and idempotent claim controls, with integration coverage for an enchanted ring granting and claiming XP for its ring, gem, and spell instances exactly once.
- Added reusable authoritative combat summaries derived from replayed actions and engine events. Live and historical result views now show turns, actions, player damage and contribution counts, rings used, spells cast, monsters summoned, monster attacks, item XP, and reward claim status.
- Added Prisma-backed development battle settlement with engine-generated and replay-verified battle records, deterministic win/loss rewards, atomic duplicate-safe claims, persistent hero and item XP, battle history, profile history, and player-facing result views.
- Fixed the Nuxt API test database setup so it runs cross-platform in GitHub Actions. The test now uses `cmd.exe` only on Windows and calls `pnpm` directly on Linux and macOS, with an explicit Vitest hook timeout for Prisma setup.
- Extended the Nuxt Equipment API and `/inventory/equipment` view with resolved equipment metrics, including item level and quality scaling, socketed gem damage, spell or monster enchantment damage, energy and cooldown penalties, and loadout damage breakdowns.
- Implemented the real Nuxt `/inventory/loadouts` view backed by Prisma `Loadout` and `LoadoutRing` rows, with save-from-current-equipment, activation, deletion, resolved loadout summaries, and API regression coverage.
- Implemented the real Nuxt `/battle` hub so it reads the active persisted loadout, displays resolved readiness metrics and ring details, and redirects players without an active loadout toward loadout selection before campaign or PvP entry.
- Implemented the real Nuxt `/forge/socket` view backed by Prisma `RingSocket` rows, with socket and unsocket APIs, one-ring-per-gem enforcement, socket-capacity checks, legacy socket JSON synchronization, and API regression coverage.
- Extended the Nuxt `/forge/socket` view with Prisma-backed gem enchantment management for spell and monster item instances, including enchant and unenchant APIs, one-gem-per-target enforcement, resolved target previews, and API regression coverage.
- Implemented the real Nuxt `/forge/quality` view with Prisma-backed item quality improvement, credit spending, resolved before/after stat previews, maximum-quality handling, insufficient-credit handling, and API regression coverage.
- Extended the Nuxt `/forge/socket` view with Prisma-backed ring socket-count improvement, credit spending, maximum-socket handling, insufficient-credit handling, and API regression coverage.
- Raised the Nuxt development player's starting credits to 1,000,000 so manual forge, socket, and quality testing is not blocked by early economy limits.
- Added a reusable Nuxt item detail side panel and integrated it into Battle Hub, Forge Craft, Forge Socket, Forge Quality, Inventory Items, Inventory Materials, Inventory Equipment, and Inventory Loadouts for inspecting stats, progression, sockets, enchantments, material metadata, usage state, and technical IDs.

### 2026-07-12

- Added Prisma to the Nuxt Game App with a SQLite development datasource, `Player`, `MaterialStock`, and `InventoryItem` models, and the initial migration under `apps/web/prisma/migrations/`.
- Replaced the direct `node:sqlite` Nuxt bootstrap store with Prisma-backed server utilities for `/api/player` and `/api/forge/craft`.
- Added Prisma generation and migration scripts to `apps/web`.
- Pinned the Nuxt Game App to Prisma 6.x for now because Prisma 7 requires a SQLite runtime adapter, which introduced native `better-sqlite3` binding requirements on the current Windows development environment.
- Added durable Prisma models for normalized ring sockets, gem enchantments, equipped rings, saved loadouts, reward grants, reward materials, reward item XP, and battle records while preserving the current flat inventory fields for UI compatibility.
- Added a reusable Nuxt server-side player game state validator for inventory ownership, item definitions, material stock, normalized ring sockets, gem enchantments, equipped rings, loadouts, and reward references. Existing player APIs now validate the Prisma-backed dev player state before returning it.
- Added an isolated Nuxt API test suite for `/api/player`, `/api/forge/craft`, and the development reset route using a temporary Prisma SQLite database.
- Added a development-only `/api/dev/reset` route that deletes and reseeds the Prisma-backed development player state.
- Implemented the real Nuxt `/inventory/equipment` view backed by Prisma `EquippedRing` rows, with equip/unequip APIs, a 10-ring backend limit, owned-ring cards, equipped slots, and basic equipment summary metrics.

### 2026-07-11

- Added `docs/UI_WIREFRAMES.md` with technical wireframes for the proposed Game App shell, current Nuxt dashboard, Dev Lab setup modes, Battle Lab editor, forge, inventory, loadout builder, balance report, content collection, battle screen, rewards, and replay controls.
- Added `docs/GAME_APP_VIEW_PROPOSAL.md` with a proposed Game App navigation and route model covering Home, Battle, Campaign, PvP, Forge, Inventory, Market, Profile, and staged implementation priorities.
- Implemented the proposed Nuxt Game App route structure in `apps/web`, including a shared layout shell, top-level navigation, route-level section navigation, functional `/forge/craft`, `/inventory/items`, and `/inventory/materials` views, plus mock UI routes for the remaining battle, forge, inventory, market, and profile sections.
- Copied the generated item artwork atlases into `apps/web/public/assets/items/`, added a Nuxt `ItemArtwork` component and atlas mapping utility, and rendered artwork on craft outputs, craft ingredients, inventory items, and material cards.
- Renamed the top rarity tier from `legendary` to `epic` across schemas, content definitions, recipe validation, localization, UI classes, tests, docs, and content version `prototype-5`.
- Added `docs/TODO.md` as the centralized working TODO list for upcoming BattleNess implementation phases and open design questions.

### 2026-07-10

- Added `apps/web` as a Nuxt workspace package for the future Game App while preserving `apps/prototype` as the Dev Lab.
- Added a server-side local SQLite bootstrap store under the Nuxt app for the development player, material stock, and player-owned inventory item instances.
- Added `/api/player` and `/api/forge/craft` server routes that reuse `packages/content` definitions and forge logic.
- Added a first Game App page with BattleNess branding, player summary, persistent material stock, craftable recipes, and crafted inventory cards.
- Copied the BattleNess logo and icon into `apps/web/public/assets/brand/`.
- Added `dev:web` to the root package scripts and updated the workspace lockfile with Nuxt dependencies.
- Verified the Nuxt scaffold with typecheck, lint, tests, content validation, web build, and full monorepo build.

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
- Documented the confirmed progression formulas: `100 * level^2` total experience thresholds, additive level and quality item scaling, level-based hero health, unscaled equipped-ring speed, fixed turn energy progression, fixed penalties, and spell direct-damage scaling.
- Defined solo campaign rewards as opponent-owned content data and deferred PvP and ranked reward formulas until matchmaking and ranking design.
- Added the progression resolver with experience thresholds, capped level derivation, item scaling, hero health, and fixed spell penalty behavior.
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
- Generated and integrated sprite atlases covering all 13 rings, 13 gems, 18 monsters, 6 spells, and 70 materials.
- Added a typed item artwork manifest with startup coverage validation and rendered ring, gem, and monster artwork in the current prototype cards.
- Added a localized, collapsible setup-screen collection that displays artwork for all 120 current content definitions.
- Added an editable Battle Lab mode with configurable players, rings, gems, levels, qualities, and spell or monster enchantments.
- Added a content-layer Battle Lab builder that creates temporary inventory instances and reuses the regular progression and battle setup pipeline.
- Added validation for player identity, ring and socket limits, levels, and qualities, plus content and DOM workflow tests.
- Added strict Battle Lab JSON parsing and serialization with reference resolution before import.
- Added named browser-local presets with save, load, overwrite, and delete behavior.
- Added resolved loadout comparisons for health, speed, damage, energy, and cooldown efficiency, with explicit relative-difference warnings.
- Added two-variant deterministic Battle Lab batch simulation with a bounded greedy policy, Taunt-aware targeting, and result, action, turn, starting-player, and final-health reporting.
- Added executable forge recipe definitions and validation for output references, material references, matching crafting families, fixed three-material inputs, and rarity-tier ingredient patterns.
- Added a content forge service that consumes material stock and creates typed player-owned item instances.
- Added a setup-screen development forge panel and DOM coverage for crafting an item through the UI.
- Added browser-local development inventory persistence for forge stock and crafted item output.
- Added development inventory JSON export, import, reset, and DOM regression coverage.
- Added an inventory-backed Battle Lab source mode for selecting crafted ring, gem, spell, and monster instances while preserving the existing free-edit mode.
- Added a complete development inventory UI and DOM coverage for material quantities, crafted item display, and filtering.
- Added inventory socketing and gem-enchantment actions with persisted development inventory updates.
- Updated Battle Lab inventory-backed selection so configured ring instances bring their socketed gems and enchantments into combat setup.
- Added a browser-local development loadout builder for selecting crafted rings, saving named ring sets, previewing resolved metrics, and sending them to Battle Lab.
- Added development forge improvement actions for spending prototype credits on item quality and ring socket upgrades.
- Added claimable deterministic post-battle rewards that feed credits and materials back into the development inventory.
- Added source-backed item XP rewards for equipped and used crafted items in Battle Lab development battles.
- Added visible item XP progression on development inventory cards and loadout builder ring summaries.

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
