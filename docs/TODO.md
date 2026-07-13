# BattleNess TODO

This is the centralized working TODO for BattleNess. It focuses on what remains to build from the current state, not on historical decisions.

## Current Focus

The current recommended focus is to connect finished authoritative live battles to reward settlement and action-based item experience while preserving `apps/prototype` as the Dev Lab.

## Phase 1 - Game App Data Foundation

- [x] Replace the temporary direct `node:sqlite` bootstrap store with a formal persistence layer.
- [x] Add a durable database schema for players, material stock, inventory item instances, ring socket state, gem enchantments, equipped rings, saved loadouts, rewards, and battle records.
- [x] Introduce Prisma migrations for SQLite development persistence.
- [x] Add bootstrap seed data for the development player.
- [x] Add an intentional development reset flow for the Prisma-backed player state.
- [ ] Extend Prisma persistence for PostgreSQL production readiness.
- [ ] Add content import/version tracking so database rows know which content version created or resolved them.
- [x] Add backend validation for inventory ownership, socket rules, enchantment uniqueness, equipment limits, and loadout limits.
- [x] Add focused API tests for player state, crafting, inventory reads, and invalid ownership/reference cases.

## Phase 2 - Inventory And Equipment

- [x] Add Nuxt route mockups for inventory sections.
- [x] Render item and material artwork in Nuxt inventory views.
- [x] Show persisted inventory items and material stock from the development SQLite store.
- [x] Implement `/inventory/equipment` with real equipped-ring state.
- [x] Enforce the 10-ring equipment limit in the backend.
- [x] Show resolved equipment metrics: speed, rough damage, energy costs, cooldowns, socketed gems, and enchantments.
- [x] Implement `/inventory/loadouts` with persistent saved loadouts.
- [x] Add loadout activation so battle setup can use the selected loadout.
- [x] Add reusable item detail side panels for stats, progression, usage state, sockets, enchantments, material metadata, and source IDs.

## Phase 3 - Forge

- [x] Implement `/forge/craft` against the local development store.
- [x] Render craft output and material artwork.
- [x] Implement `/forge/socket` using the Dev Lab socketing rules.
- [x] Prevent one gem from being socketed into more than one ring.
- [x] Implement gem enchantment management for spell or monster instances.
- [x] Prevent one spell or monster instance from being reused as multiple gem enchantments.
- [x] Implement `/forge/quality` with credit costs and quality improvement.
- [x] Implement ring socket-count improvement under `/forge/socket`.
- [x] Add API tests for crafting, socketing, unsocketing, enchanting, unenchanting, quality improvement, credit costs, and invalid operations.

## Phase 4 - Battle App Integration

- [x] Add Nuxt route mockups for battle, campaign, PvP, battle history, and active battle.
- [x] Build a Game App battle setup pipeline from database-owned player inventory. The first live implementation snapshots the active loadout against a temporary training fixture opponent.
- [x] Add active loadout validation before creating a persisted development battle result.
- [x] Implement `/battle` as a real mode hub that reads the active loadout.
- [x] Implement `/battle/live/:battleId` with player-facing battle state.
- [x] Hide opponent rings in the player-facing battle UI unless a future reveal rule explicitly exposes them.
- [x] Reuse the pure combat engine on the server side to validate live actions, enforce the server-owned player identity, reject stale clients, and persist the resulting action journal atomically.
- [x] Add player-facing live controls for element choice, rings, monsters, target selection, turn ending, and concession.
- [ ] Replace the passive training-opponent turn pass with mode-owned opponent behavior when campaign opponents are implemented.
- [x] Persist verified development battle action history, deterministic seed, result, and final-state checksum. The future live server lifecycle must reuse this record model.
- [x] Add a player-facing result/reward screen separate from Dev Lab diagnostics.
- [x] Keep Dev Lab replay/debug tools out of the player-facing battle UI.

## Phase 5 - Campaign

- [ ] Define campaign opponent data format.
- [ ] Define campaign progression: unlock order, completion state, repeatability, and recommended level.
- [ ] Define fixed first-clear and repeat rewards for each opponent.
- [ ] Build campaign content validation.
- [ ] Implement `/battle/campaign` opponent selection.
- [ ] Generate battle setups for campaign opponents.
- [ ] Persist campaign progress and reward claims.
- [ ] Add campaign tests for opponent references, unlocks, rewards, and battle start.

## Phase 6 - Rewards And Progression

- [x] Implement account-backed hero XP in the Prisma player state.
- [x] Implement initial deterministic Game App hero XP reward formulas for development results. Campaign and PvP formulas remain mode-specific future work.
- [x] Move participation item XP rewards from Dev Lab localStorage behavior into Game App persistence. Action-based item XP remains dependent on the live server action pipeline.
- [x] Persist material and credit rewards.
- [x] Prevent duplicate reward claims with an atomic claim transition.
- [x] Add reward history to profile and battle history views.
- [ ] Add progression UI for hero level, item level, XP to next level, and quality bonuses.

## Phase 7 - Game Market

- [x] Add Nuxt route mockups for market sections.
- [x] Confirm the initial material price formulas. Buy prices are 10/25/60/150 credits for
      common/refined/rare/epic materials, and sell prices are 50% of buy prices rounded down.
- [ ] Confirm whether items can be sold to the game and how item prices are computed.
- [x] Implement `/market/game` for buying materials.
- [x] Implement `/market/game` for selling materials. Item selling remains undecided.
- [x] Add transaction previews and persistent backend market transaction logs.
- [x] Add tests for insufficient credits, insufficient stock, atomic updates, and idempotent requests.

## Phase 8 - Profile And Settings

- [x] Add Nuxt route mockups for profile sections.
- [ ] Implement localization support in the Nuxt Game App.
- [ ] Replace hardcoded Nuxt UI text with localization keys.
- [ ] Add language selection.
- [ ] Add account/profile persistence fields.
- [x] Add match history and reward history views.
- [ ] Add display and audio preference placeholders, even if audio remains deferred.

## Phase 9 - Authentication

- [ ] Decide the first auth provider implementation order.
- [ ] Add OAuth login, starting with Google if provider setup is available.
- [ ] Add account linking model for future Facebook and email/password.
- [ ] Protect player-owned API routes.
- [ ] Ensure local development can still use a seeded dev player without external OAuth.
- [ ] Add session handling and logout.

## Phase 10 - PvP And Multiplayer

- [ ] Design authoritative server battle lifecycle.
- [ ] Design private match creation and join-by-code flow.
- [ ] Persist server-side match state for reconnects.
- [ ] Add abandonment timeout rules.
- [ ] Implement `/battle/pvp/private` before casual matchmaking.
- [ ] Add WebSocket event model for live turn-based PvP.
- [ ] Add casual matchmaking after private matches work.
- [ ] Define ranked rating, seasons, rewards, and matchmaking before implementing ranked mode.

## Phase 11 - Player Market

- [ ] Defer until authentication, ownership validation, and transaction logs exist.
- [ ] Define which items can be listed.
- [ ] Define listing fees, price bounds, expiration, cancellation, and sold-state behavior.
- [ ] Implement browse listings.
- [ ] Implement create listing.
- [ ] Implement buy listing with atomic ownership and currency transfer.
- [ ] Add moderation or anti-abuse hooks if needed.

## Phase 12 - Combat Presentation

- [ ] Decide whether Nuxt DOM is enough for battle presentation or whether Phaser is needed.
- [ ] If Phaser is chosen, isolate it to the battle view and keep the combat engine framework-independent.
- [ ] Build mobile-first battle controls.
- [ ] Improve target selection ergonomics.
- [ ] Add animations only after the action/state model is stable.
- [ ] Preserve accessibility and readable combat state.

## Phase 13 - Production And Operations

- [ ] Decide deployment platform.
- [ ] Decide PostgreSQL hosting.
- [ ] Add production environment configuration.
- [ ] Add database backup strategy.
- [ ] Extend CI to cover the Nuxt Game App and future migration checks.
- [ ] Add basic observability for server errors and match failures.

## Open Design Questions

- [ ] What exact campaign opponents should exist first?
- [ ] What fixed rewards should campaign opponents grant?
- [x] What initial hero XP rewards should development battles grant? Win grants 100 XP, draw grants 60 XP, and loss grants 25 XP. Campaign and PvP formulas remain open within their respective modes.
- [x] Should ring socket-count improvement live under `/forge/socket`, `/forge/quality`, or a separate improvement view? Decided and implemented under `/forge/socket`.
- [ ] Should spell and monster gem enchantment be managed in inventory, forge, or both?
- [ ] Should the Game Market sell only materials at first?
- [ ] What data should be public in player-facing PvP before and during battle?
- [ ] When should ranked mode become visible as more than a locked mock?

## Keep Explicitly

- [ ] Keep `apps/prototype` as the Dev Lab.
- [ ] Keep the pure combat engine independent from UI, database, sockets, and framework code.
- [ ] Keep JSON content definitions as source of truth unless a later explicit decision changes that.
- [ ] Keep all new documentation content in English.
