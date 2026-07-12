# BattleNess TODO

This is the centralized working TODO for BattleNess. It focuses on what remains to build from the current state, not on historical decisions.

## Current Focus

The current recommended focus is to turn the Nuxt Game App from route mockups into a persistence-backed application while preserving `apps/prototype` as the Dev Lab.

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
- [ ] Show resolved equipment metrics: speed, rough damage, energy costs, cooldowns, socketed gems, and enchantments.
- [ ] Implement `/inventory/loadouts` with persistent saved loadouts.
- [ ] Add loadout activation so battle setup can use the selected loadout.
- [ ] Add item detail views or side panels for stats, progression, usage state, and source IDs.

## Phase 3 - Forge

- [x] Implement `/forge/craft` against the local development store.
- [x] Render craft output and material artwork.
- [ ] Implement `/forge/socket` using the Dev Lab socketing rules.
- [ ] Prevent one gem from being socketed into more than one ring.
- [ ] Implement gem enchantment management for spell or monster instances.
- [ ] Prevent one spell or monster instance from being reused as multiple gem enchantments.
- [ ] Implement `/forge/quality` with credit costs and quality improvement.
- [ ] Implement ring socket-count improvement, or decide whether it belongs under `/forge/socket` or a separate improvement view.
- [ ] Add API tests for crafting, socketing, unsocketing, enchanting, unenchanting, quality improvement, credit costs, and invalid operations.

## Phase 4 - Battle App Integration

- [x] Add Nuxt route mockups for battle, campaign, PvP, battle history, and active battle.
- [ ] Build a Game App battle setup pipeline from database-owned player inventory.
- [ ] Add active loadout validation before starting a battle.
- [ ] Implement `/battle` as a real mode hub that reads the active loadout.
- [ ] Implement `/battle/live/:battleId` with player-facing battle state.
- [ ] Hide opponent rings in the player-facing battle UI unless a future reveal rule explicitly exposes them.
- [ ] Reuse the pure combat engine on the server side to validate actions.
- [ ] Persist battle action history, deterministic seed, result, and final-state verification data.
- [ ] Add a player-facing result/reward screen separate from Dev Lab diagnostics.
- [ ] Keep Dev Lab replay/debug tools out of the player-facing battle UI.

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

- [ ] Implement account-backed hero XP.
- [ ] Decide and implement hero XP reward formulas.
- [ ] Move item XP rewards from Dev Lab localStorage behavior into Game App persistence.
- [ ] Persist material and credit rewards.
- [ ] Prevent duplicate reward claims.
- [ ] Add reward history to profile and battle history views.
- [ ] Add progression UI for hero level, item level, XP to next level, and quality bonuses.

## Phase 7 - Game Market

- [x] Add Nuxt route mockups for market sections.
- [ ] Confirm buy and sell price formulas for materials.
- [ ] Confirm whether items can be sold to the game and how item prices are computed.
- [ ] Implement `/market/game` for buying materials.
- [ ] Implement `/market/game` for selling materials and possibly items.
- [ ] Add transaction previews and backend transaction logs.
- [ ] Add tests for insufficient credits, insufficient stock, and atomic transaction behavior.

## Phase 8 - Profile And Settings

- [x] Add Nuxt route mockups for profile sections.
- [ ] Implement localization support in the Nuxt Game App.
- [ ] Replace hardcoded Nuxt UI text with localization keys.
- [ ] Add language selection.
- [ ] Add account/profile persistence fields.
- [ ] Add match history and reward history views.
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
- [ ] What hero XP rewards should battles grant?
- [ ] Should ring socket-count improvement live under `/forge/socket`, `/forge/quality`, or a separate improvement view?
- [ ] Should spell and monster gem enchantment be managed in inventory, forge, or both?
- [ ] Should the Game Market sell only materials at first?
- [ ] What data should be public in player-facing PvP before and during battle?
- [ ] When should ranked mode become visible as more than a locked mock?

## Keep Explicitly

- [ ] Keep `apps/prototype` as the Dev Lab.
- [ ] Keep the pure combat engine independent from UI, database, sockets, and framework code.
- [ ] Keep JSON content definitions as source of truth unless a later explicit decision changes that.
- [ ] Keep all new documentation content in English.
