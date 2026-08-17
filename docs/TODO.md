# BattleNess TODO

This is the centralized working TODO for BattleNess. It focuses on what remains to build from the current state, not on historical decisions.

## Current Focus

- [x] Replace the prototype ring, gem, and monster collection with `production-items-v1`, import the
      TexturePacker atlases, retain test spells, generate stable three-unit recipes, migrate
      fixtures/onboarding, and archive the former `prototype-6` content.
- [x] Refocus `apps/prototype` as a stateless internal Dev Lab for deterministic combat, Battle Lab
      configuration, replay diagnostics, simulations, balance analysis, content, and assets. Remove
      its fake player inventory, forge, loadout, progression, and reward loops.

The game-wide visual iteration is complete, and Phase 14 production and operations work is active
again. Its remaining acceptance, backup resilience, external notification, monitoring, hardening,
and production-promotion work is consolidated in the resume checklist at the end of the Phase 14
section.

## Production Spell Collection

- [x] Preserve and validate the supplied 42-spell proposal catalogue, source artwork, and
      TexturePacker atlas as dormant production artifacts without changing active gameplay or public
      asset mappings.
- [x] Approve the `production-items-v2` cutover, existing per-gem target map, preparation effects,
      status timing, multi-skill, cooldown-reset, Taunt, scaling, Shield, destruction, copy, and
      transformation contracts.
- [x] Implement the inactive Slice A engine and schema foundation for Burn, Shock, Freeze, Stomp,
      Carbonize, Electroshock, Deep Freezing, Rime Lock, and Cleanse, including one scenario per
      spell and interaction coverage. The production catalogue and atlas remain inactive.
- [x] Implement the inactive Slice B foundation for the five Skill gifts, Crystal Skin, Quick Pulse,
      Short Circuit, Zero Interval, and Refresh. Granted skills and Shields retain source provenance,
      cooldown zero restores same-turn readiness, and Refresh selection is deterministic and logged.
- [x] Implement the inactive Slice C foundation for the three supported-ring kill triggers,
      action-prepared Pierce and Funeral Brand, Bloodflame, and Last Breath. Trigger ownership,
      lifetime, capture timing, first-turn protection, deterministic targeting, and non-recursive
      destruction settlement are covered by focused scenarios.
- [x] Implement the inactive Slice D foundation for Devotion, Sacrifice, Destruction, Chain
      Explosion, Copy, Transmute, Arc Relay, and Zerakai Protocol. Direct destruction reuses trigger
      settlement, random choices are deterministic and logged, copy inheritance is explicit, and
      temporary runtime identities remain unique through end-of-turn expiration.
- [x] Implement the production spell collection by following
      `docs/SPELLS_IMPLEMENTATION_INSTRUCTIONS.md`, including target-contract approval, typed effect
      primitives, deterministic engine behavior, localization, recipes, migration, atomic atlas
      activation, and complete local validation. A catalogue-driven acceptance suite additionally
      executes all 42 active definitions and guards every live selected-target contract.
- [ ] Perform the coordinated staging backup/restore verification, guarded gameplay reset,
      authenticated smoke tests, log review, and rollback drill before production promotion. The
      backup, isolated restore, v2 deployment/reset, and authenticated route/content sweep passed on
      2026-08-11. Commit, CI-validate, and redeploy the impossible-spell-target hotfix found during
      training combat. The equivalent local no-target and legal-target browser smokes now pass,
      including Burn's delayed damage, expiration, and localized presentation. Commit, CI-validate,
      redeploy, repeat the staging action smoke, and complete the rollback drill.

## Phase 1 - Game App Data Foundation

- [x] Replace the temporary direct `node:sqlite` bootstrap store with a formal persistence layer.
- [x] Add a durable database schema for players, material stock, inventory item instances, ring socket state, gem enchantments, equipped rings, saved loadouts, rewards, and battle records.
- [x] Introduce Prisma migrations for SQLite development persistence.
- [x] Add bootstrap seed data for the development player.
- [x] Add an intentional development reset flow for the Prisma-backed player state.
- [x] Extend Prisma persistence for PostgreSQL production readiness.
- [x] Add content import/version tracking so database rows know which content version created or resolved them.
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
- [x] Implement gem enchantment management in a dedicated Forge > Enchant view with independent selection, confirmed atomic replacement, free non-destructive removal, equipped-ring support, and read-only Inventory handoff.
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
- [x] Add deterministic mode-owned campaign opponent behavior. The separate development training opponent remains passive by design.
- [x] Persist verified development battle action history, deterministic seed, result, and final-state checksum. The future live server lifecycle must reuse this record model.
- [x] Add a player-facing result/reward screen separate from Dev Lab diagnostics.
- [x] Create and deliver deterministic live battle rewards atomically with the finishing action, with no separate player claim step.
- [x] Derive a verified combat summary from persisted actions and engine events, and reuse it in live and historical result views.
- [x] Keep Dev Lab replay/debug tools out of the player-facing battle UI.

## Phase 5 - Campaign

- [x] Define campaign opponent data format.
- [x] Define campaign progression: unlock order, completion state, repeatability, and recommended level. The initial track is linear; persistent completion state remains below.
- [x] Define fixed first-clear and repeat rewards for each opponent.
- [x] Build campaign content validation.
- [x] Implement `/battle/campaign` opponent selection from the server catalogue.
- [x] Generate battle setups for campaign opponents from validated game-owned content loadouts.
- [x] Persist campaign progress and deliver first-clear or repeat-victory rewards atomically when a battle ends.
- [x] Add campaign tests for opponent references, unlocks, setup conversion, rewards, deterministic opponent turns, and battle start.

## Phase 6 - Rewards And Progression

- [x] Implement account-backed hero XP in the Prisma player state.
- [x] Implement initial deterministic Game App hero XP reward formulas for development results. Campaign and PvP formulas remain mode-specific future work.
- [x] Move participation and action-based item XP rewards from Dev Lab localStorage behavior into Game App persistence. Live settlement grants 8 participation XP and 20 XP for each effective ring, gem, spell, summon, or monster use.
- [x] Persist material and credit rewards.
- [x] Prevent duplicate reward delivery with an atomic transition and reconcile legacy pending battle grants automatically.
- [x] Add reward history to profile and battle history views.
- [x] Add progression UI for hero level, item level, XP to next level, and quality bonuses.

## Phase 7 - Game Market

- [x] Add Nuxt route mockups for market sections.
- [x] Confirm the initial material price formulas. Buy prices are 10/25/60/150 credits for
      common/refined/rare/epic materials, and sell prices are 25% of buy prices rounded down with
      a minimum of one credit.
- [x] Confirm item game-market sales. A crafted item's value is the sum of the official buy prices
      for every material quantity in its recipe; its buyback price is 25% of that value rounded
      down with a minimum of one credit.
- [x] Implement `/market/game` for buying materials.
- [x] Implement `/market/game` for selling materials and eligible crafted item instances.
- [x] Add transaction previews and persistent backend market transaction logs.
- [x] Add tests for insufficient credits, insufficient stock, atomic updates, and idempotent requests.

## Phase 8 - Profile And Settings

- [x] Add Nuxt route mockups for profile sections.
- [x] Implement localization support in the Nuxt Game App.
- [x] Replace hardcoded Nuxt UI text with localization keys.
- [x] Add language selection.
- [x] Add account/profile persistence fields.
- [x] Add match history and reward history views.
- [x] Add persisted display and audio preferences, with functional theme, density, reduced-motion, localization, mute, and volume controls.

## Phase 9 - Authentication

- [x] Decide the first auth provider implementation order. Google OAuth comes first, followed by Facebook and then email/password.
- [x] Add Google OAuth login with server-side code exchange, browser-bound state, PKCE, stable `sub` identity, and BattleNess session creation.
- [ ] Configure separate Google OAuth clients, consent screens, secrets, and redirect URIs for local, staging, and production environments.
- [x] Add account linking model for future Facebook and email/password.
- [x] Protect player-owned API routes.
- [x] Ensure local development can still use a seeded dev player without external OAuth.
- [x] Add opaque hashed session handling, sliding expiration, revocation, development login, and logout.

## Phase 10 - PvP And Multiplayer

- [x] Design and implement the initial authoritative server battle lifecycle for private matches.
- [x] Design and implement private match creation and join-by-code flow.
- [x] Persist private lobby and battle state for session-based reconnects.
- [x] Add a persisted five-minute timeout for active turns, resolved as a server-side concession.
- [x] Add a persisted 90-second opening element-duel timeout with one-player concession, no-choice draw, per-tie reset, hidden locked choices, and deterministic resolution after three ties.
- [x] Implement `/battle/pvp/private` before casual matchmaking.
- [x] Add HTTP polling as the first private-lobby and live-battle synchronization transport.
- [x] Add an authenticated WebSocket invalidation event model for live turn-based PvP while keeping HTTP/Prisma authoritative and polling as fallback.
- [ ] Replace the process-local WebSocket event hub with shared pub/sub before running more than one Game App server instance.
- [x] Add casual matchmaking with a five-minute FIFO queue, immutable loadout snapshots, atomic opponent claims, cancellation and expiration, persistent unranked battles, reconnect support, and no PvP rewards.
- [x] Define ranked rating, visible ranks, placements, seasons, rewards, matchmaking, acceptance, abandonment, inactivity, repeat-opponent, and leaderboard behavior.
- [x] Implement and test a pure Glicko-2 calculation module with persisted player rating, deviation, volatility, placement count, season ownership, match record counters, and last-match time.
- [x] Define visible division thresholds, season-reset contraction, inactivity-decay amount, queue expansion caps, and penalty reset window. Initial Glicko-2 constants are fixed at rating `1500`, deviation `350`, volatility `0.06`, `tau 0.5`, scale `173.7178`, tolerance `0.000001`, and maximum deviation `350`.
- [x] Define exact ranked season reward content without ranked-exclusive combat power. Eligible players must finish five placements; rewards use the highest post-placement tier reached, ignore divisions, and grant one deterministic tier bundle with permanent cosmetics, modest credits, and three non-exclusive materials.
- [x] Persist ranked seasons, versioned player season ratings, immutable rating adjustments, and battle-result provenance in SQLite and PostgreSQL.
- [x] Persist ranked queue entries, bilateral acceptance state, and queue penalties in SQLite and PostgreSQL.
- [x] Implement atomic ranked queue matching with rating and hero-level range expansion, recent-opponent preference, 20-second bilateral acceptance, immutable loadout snapshots, and cancellation or timeout handling.
- [x] Reuse the authoritative PvP battle lifecycle for `ranked_pvp` and settle each finished win, loss, or draw exactly once.
- [x] Implement the real `/battle/pvp/ranked` queue, placement, rank, division, acceptance, season, penalty, and result UI with WebSocket invalidations and polling fallback.
- [x] Implement the top-100 leaderboard plus the current player's exact position and nearby entries, with deterministic ties and private-profile anonymization.
- [x] Implement idempotent eight-week season succession, seasonal soft resets, Diamond/Master inactivity decay, and stale queue expiration. Maintenance runs at Nitro startup, hourly, and before ranked reads or queue entry.
- [x] Implement idempotent ranked season rewards with persistent peak rating, automatic unclaimed grants during rollover, deterministic material selection, permanent badge/title unlocks on claim, and localized ranked/history presentation.
- [x] Add concurrency coverage for simultaneous casual queue entry, bilateral ranked acceptance, duplicate decline attempts, concurrent acceptance expiry, duplicate live actions, reconnect reads during turn and opening-duel expiry, and unique timeout settlement. The complete ranked queue-to-settlement path, duplicate rating settlement, leaderboard ordering, season transitions, and inactivity idempotence also have integration coverage.
- [x] Enforce the decided pre-combat PvP DTO across private, casual, and ranked modes: anonymous search, limited identity after matching, and no opponent loadout or ring count.
- [x] Persist and expose per-participant staged reveals for used rings and effect-producing gems or enchantments, while keeping unrevealed content out of opponent responses. Reveal state is deterministically reconstructed from the persisted battle snapshot and action journal.
- [x] Reveal full monster combat data on summon and both complete loadout snapshots in participant results and replays. Result loadouts are rebuilt from the immutable initial battle setup and include resolved rings, gems, and enchantments for both participants.
- [x] Add public PvP profile statistics for visible rank, rating, peak rank, wins, losses, and match count without inventory or loadout data. Public leaderboard identities link to the localized profile view; private profiles remain anonymous and return the same not-found response as unknown players.
- [x] Add API and presentation regression coverage for every PvP visibility phase and mode. A
      shared presentation policy and integration assertions now cover anonymous search, limited
      pre-combat identity, staged live reveals, and complete participant results across private,
      casual, and ranked PvP.

## Phase 11 - Player Market

- [x] Defer until authentication, ownership validation, and transaction logs exist. These prerequisites are now implemented.
- [x] Define which items can be listed. Rings, gems, monsters, spells, and materials are eligible; attached objects cannot be listed independently, and a ring listing includes its complete socket and enchantment graph.
- [x] Define listing fees, price bounds, lifetime, cancellation, and sold-state behavior. V1 uses fixed positive whole-credit prices, no fees or commission, no expiration, free cancellation, 20 active listings per player, anonymous sellers, and permanent private history.
- [x] Define material quantities, listing escrow, self-purchase, proceeds, and idempotency details. Material lots are indivisible; listed assets remain in escrow; self-purchase is forbidden; sellers are paid atomically; purchase/cancellation races use first-commit semantics; and mutating requests are idempotent.
- [x] Persist permanent listings, denormalized search fields, item-bundle snapshots, unique item escrow locks, nullable completed-sale ownership, and globally unique mutation request journals in SQLite and PostgreSQL.
- [x] Add local persistence coverage and PostgreSQL smoke coverage for listing, escrow, and mutation relations.
- [x] Implement authenticated, anonymous, paginated browsing of active listings with deterministic sorting.
- [x] Implement idempotent listing creation with material decrement, complete ring-bundle snapshots, unique item escrow locks, eligibility enforcement, and a localized seller form.
- [x] Implement idempotent buy listing with atomic single-winner ownership, currency settlement, complete item-bundle transfer, and concurrent-buyer coverage.
- [x] Implement free idempotent cancellation with immediate material return or item-lock release. Listings otherwise remain active indefinitely until sold.
- [x] Add filters for type, definition, rarity, element, level, quality, and price.
- [x] Add permanent private buyer and seller transaction history with role filters, deterministic pagination, content-backed presentation, and counterparty privacy.
- [ ] Add moderation or anti-abuse hooks if needed.

## Phase 12 - Combat Presentation

- [x] Decide whether Nuxt DOM is enough for battle presentation or whether Phaser is needed. Nuxt DOM is the initial implementation; Phaser remains optional for future animation-heavy scene requirements.
- [ ] If Phaser is chosen, isolate it to the battle view and keep the combat engine framework-independent.
- [x] Build mobile-first battle controls with horizontally scrollable unit and ring rows plus a sticky command tray.
- [x] Improve target selection ergonomics with direct source-card selection followed by immediate execution on a legal target card, with client-visible Taunt restrictions.
- [x] Add restrained CSS feedback after the action/state model is stable: source and target pulses, aggregated damage numbers, status labels, and reduced-motion support.
- [x] Preserve accessibility and readable combat state with semantic controls, meters, localized labels, and collapsible technical diagnostics.
- [x] Rebuild the live battle as a scroll-free full-viewport combat surface with compact heroes,
      centered monsters, a bottom ring dock, hidden application chrome, and development diagnostics
      behind an explicit modal.
- [x] Integrate layered rarity frame assets, conditional socket assets, rarity-framed gems, localized
      cooldown readiness, resource warnings, and frame-based hover and selection feedback for live
      ring cards.
- [x] Simplify the finished live battle into a scroll-free result and reward screen, with loadouts
      and combat activity moved behind an internally scrollable Battle Info modal, an explicit exit
      action, and material reward artwork separated from the primary XP and credit totals.

## Phase 13 - Player App Visual Redesign

- [x] Decide the visual direction: dark-first tactical competitive presentation, medium content density, restrained rarity and element accents, and fast functional motion.
- [x] Replace the prototype-style horizontal header with a desktop sidebar, compact resource top bar, and mobile bottom navigation.
- [x] Rebuild the home view as a player command center with battle entry, resource summary, quick destinations, and collection artwork.
- [x] Replace the generic Forge, Inventory, and Market hub mockups with real data-backed workflow dashboards, and enrich the Battle Hub with campaign, history, performance, and reward context.
- [x] Apply the first shared item-card and inventory presentation pass, including mobile detail behavior and hidden player-facing technical IDs.
- [x] Replace inline item inspection side panels with one shared accessible modal that closes from its top-right control, backdrop, or Escape key.
- [x] Apply the design system to the Battle hub and Campaign journey, readiness, encounter, reward, and opponent-intelligence views.
- [x] Apply the design system consistently to the PvP hub and private, casual, and ranked matchmaking views.
- [x] Apply the design system consistently to Battle history and result views.
- [x] Apply the design system consistently to Inventory equipment and loadout workflows.
- [x] Apply the design system consistently to Forge workflows.
- [x] Apply the design system consistently to Game Market and Player Market workflows.
- [x] Apply the design system consistently to Profile and Settings workflows.
- [x] Audit Battle Hub, Campaign, PvP, and Live Battle across desktop and mobile layouts, including touch targets, keyboard focus, reduced motion, overflow, and runtime localization warnings.
- [x] Audit Forge Hub, Craft, Socket, and Quality across desktop and mobile layouts, including touch targets, form controls, overflow, runtime warnings, and shared item-modal focus confinement.
- [x] Audit Inventory Hub, Items, Materials, Equipment, and Loadouts across desktop and mobile layouts, including touch targets, overflow, item-modal behavior, contextual accessible names, and guarded destructive actions.
- [x] Audit Market Hub, Game Market, Player Market, and private Market History across desktop and mobile layouts, including touch targets, expandable panels, filters, pagination, selection state, contextual listing actions, overflow, and runtime localization warnings.
- [x] Audit Home, Profile Overview, Profile History, Progression, Settings, authentication, and the global application shell across desktop and mobile layouts, including touch targets, navigation state, preference controls, reduced motion, sign-out/sign-in restoration, overflow, and runtime localization warnings.
- [x] Perform a final accessibility, responsive layout, reduced-motion, and localization visual audit.
- [x] Approve and document the production Inventory Items direction around artwork-first tiles and a
      dedicated inspector in `docs/INVENTORY_ITEMS_REDESIGN.md`.
- [x] Implement Inventory Items redesign slice 1: category tabs, localized search, element filter,
      sorting, counts, artwork-first selectable tiles, approved type-specific combat statistics, and
      preserved modal inspection.
- [x] Implement Inventory Items redesign slice 2: persistent desktop inspector with responsive modal
      fallback and authoritative item details.
- [x] Evaluate Inventory Items slice 3 against the existing Equipment API; keep Equipment as the
      authoritative mutation surface and expose contextual navigation rather than duplicate direct
      equip or comparison behavior in Items.

## Game-Wide UI Immersion Iteration

- [x] Audit the current application shell, home view, section hubs, and shared components in the
      browser to identify the strongest website and dashboard patterns.
- [x] Define and confirm a cohesive game-first visual language for navigation, typography, surfaces,
      hierarchy, imagery, feedback, motion, and content density before a broad rollout.
- [x] Prove the direction through the shared application shell and one representative player
      workflow, then extract the reusable tokens and components needed by the remaining views.
- [x] Apply the confirmed language incrementally to Battle outside the live arena, Forge, Inventory,
      Market, Profile, Settings, and authentication without changing their business behavior.
  - [x] Apply the Forge workshop language to the Forge Hub and Craft workflow.
  - [x] Extend the Forge workshop language to Socket and Quality after validating the first slice.
  - [x] Apply the Inventory vault language to the Hub, Items, Materials, Equipment, and Loadouts.
  - [x] Apply the Market hall language to the Hub, Game Market, Player Market, and Market History.
  - [x] Apply the Profile chronicle language to Overview, Progression, History, and Settings.
  - [x] Apply the elemental operations language to Campaign without changing live battle or results.
  - [x] Apply the competitive arena language to the PvP Hub, Casual, Ranked, and Private.
  - [x] Extend the ranked arena language to public PvP profiles and leaderboard identity links.
  - [x] Apply the commandery gateway language to authentication without changing session providers.
- [x] Replace the inconsistent horizontal section menus with hub-card navigation and deterministic
      parent-hub links on child views, including the nested Battle and PvP hierarchy.
- [x] Compact hub destination cards with icon-and-title headings, full-card interaction, and no
      redundant destination action row.
- [x] Extend full-card hub interaction to Private, Casual, and Ranked PvP destinations and remove
      their redundant footer actions and fixed heights.
- [x] Unify linked hub destinations around the Battle mode-card surface and non-linked hub panels
      around the Inventory Battle Readiness surface while preserving feature-specific artwork.
- [x] Centralize the mobile Game App shell gutter and browser-verify consistent horizontal spacing
      across every static player route plus a representative dynamic result view.
- [x] Unify standard page-title typography with Forge Hub, title spacing with Battle Hub, and move
      existing view descriptions into a shared accessible help dialog.
- [x] Refine the title-help control into a subtle circular treatment while preserving its touch area,
      and remove the unnecessary Home help entry.
- [x] Remove redundant colored section eyebrows from standard Game App page titles and align child
      return controls with the resulting single title row.
- [x] Refine the shared child-view return control with a clearer rounded, cyan-accented treatment and
      consistent hover, focus, active, and reduced-motion states.
- [x] Prioritize Battle and Forge destination cards ahead of their recap statistics in visual and
      document order.
- [x] Preserve mobile-first responsiveness, keyboard and screen-reader access, visible focus,
      reduced-motion support, localization, and the separation between player UI and Dev Lab
      diagnostics.
- [x] Browser-verify each affected slice at representative desktop, mobile portrait, and short
      landscape viewports, including overflow, touch targets, asset deformation, overlap, and runtime
      warnings.

## Phase 14 - Production And Operations

- [x] Decide deployment platform. Initial direction: OVH VPS on Debian stable with Nginx.
- [x] Decide PostgreSQL hosting. Initial direction: separate self-managed PostgreSQL server reached
      over public IP with firewall restrictions.
- [x] Add validated staging and production environment configuration, including public origin,
      database connection, OAuth credentials, proxy behavior, and an explicit production ban on
      development authentication.
- [ ] Configure the actual separate Google OAuth clients, consent screens, secrets, and redirect URIs
      for staging and production. Staging credentials are installed and the Google redirect starts;
      production credentials remain pending.
- [x] Add unauthenticated liveness and dependency-aware readiness endpoints for deployment health
      checks without exposing diagnostics.
- [x] Add the production HTTP security baseline: trusted origins for state-changing requests,
      security headers, request-size limits, and rate limits for authentication, matchmaking,
      market mutations, and combat commands.
- [x] Bootstrap the initial clean OVH app and database VPS instances with Debian 13, UFW, fail2ban,
      Nginx on the app host, PostgreSQL 17 on the database host, Node 24, pnpm 10.14.0, and verified
      app-to-database staging connectivity.
- [x] Point `staging.battleness.com` at the app VPS public address.
- [x] Configure the first staging systemd service and Nginx HTTP reverse proxy.
- [x] Deploy the staging app, run PostgreSQL migrations, and verify `/api/health/live` plus
      `/api/health/ready` locally and through the Nginx HTTP proxy.
- [x] Enable Let's Encrypt for `staging.battleness.com` and verify the same health checks over HTTPS
      after DNS resolves.
- [x] Fix the first staging Battle hub API latency issue by caching the production Prisma client,
      preventing PostgreSQL idle-connection buildup, skipping development seeding in public
      deployments, and redeploying the corrected staging release.
- [x] Verify the Certbot renewal timer and simulated renewal. The simulation succeeded on 2026-07-21
      with `--no-random-sleep-on-renew`; Certbot's randomized delay caused the earlier timeout.
- [x] Activate daily operational cleanup with seven-day expired/revoked-session retention, immediate
      expired OAuth-attempt removal, 30-day terminal queue/lobby/discipline retention, and 30-day,
      512-MiB-per-VPS journald retention. Permanent gameplay, rating, reward, and market history is
      explicitly excluded.
- [x] Add the first local PostgreSQL backup and retention strategy on the database VPS, then prove
      staging restoration into an isolated database.
- [x] Add the first encrypted off-host database backup copy path from the database VPS to the app VPS
      and verify decryptability.
- [x] Configure a Raspberry Pi pull target outside the app/database VPS pair with a restricted
      read-only SSH key, encrypted archives and checksums, 90-day retention, daily systemd execution,
      and an isolated PostgreSQL restore drill from the retrieved copy.
- [x] Add a daily local backup watchdog for backup age, dump presence and checksums, matching
      encrypted off-host copy age, and previous backup-service failures.
- [ ] Connect backup watchdog failures and missed runs to an external notification channel before
      public production launch, including detection of a completely unavailable VPS and a tested
      operator delivery path. The user chose not to add an external heartbeat service during the
      Raspberry Pi backup implementation, so this remains pending.
- [x] Define the production migration, release, rollback, database recovery, and emergency
      maintenance runbook.
- [ ] Add production monitoring and alerts for availability, error rate, database health, failed
      match settlement, queue maintenance, WebSocket reconnect rate, and backup failures.
- [x] Run the authenticated read-only staging route sweep against PostgreSQL for login, inventory,
      Forge, markets, campaign, private PvP, casual PvP, ranked PvP, profile, and localization. All
      25 player-facing routes loaded successfully on 2026-07-21.
- [x] Add a versioned, transactionally idempotent public-account starter loadout so newly authenticated
      players can enter campaign and PvP without development seeding. Existing players are marked
      onboarded without receiving duplicate items.
- [ ] Complete mutation and multiplayer staging smoke tests for Forge, markets, campaign, private
      PvP, casual PvP, ranked PvP, reconnects, and rewards. Forge, fixed/player markets, campaign,
      replay, reward claiming, public onboarding, private and casual matchmaking, distinct-loadout
      battle creation, turn synchronization, reconnect, concession, settlement, complete results,
      and history have passed. The live-arena background-refresh fix is deployed and passed a static
      authenticated browser smoke; verify it during fresh two-account combat actions, then complete
      ranked matchmaking, bilateral acceptance, settlement, leaderboard, and season-reward checks
      against active staging season `staging-ranked-season-20260721`.
- [x] Make `prisma:postgres:check` line-ending independent so an exact Git archive with CRLF does not
      fail the Linux pre-build gate before `build:postgres` regenerates the same effective schema.
- [ ] Run load and soak tests for polling, WebSocket invalidations, matchmaking, market concurrency,
      and authoritative battle actions before public access.
- [ ] Run a dependency and production security review before the public release candidate.
- [ ] Keep the first deployment to one Game App instance, or replace the process-local WebSocket
      event hub with shared pub/sub before enabling horizontal scaling.
- [x] Extend CI to enforce formatting, build the Nuxt Game App for production, and run PostgreSQL migration, drift, and smoke checks.
- [x] Add basic request correlation, structured server and match-failure logging, and protected development diagnostics without recording request secrets.

### Phase 14 Resume Checklist

Required before public production promotion:

- [ ] Verify the deployed live-arena refresh fix during a fresh two-account action sequence.
- [ ] Complete the two-account ranked staging smoke: matchmaking, bilateral acceptance, battle,
      reconnect, settlement, rating and placement updates, leaderboard visibility, history, and
      season-reward behavior where practical.
- [ ] Add production monitoring and alerts for availability, latency, application errors, PostgreSQL,
      failed match settlement, queue maintenance, WebSocket reconnects, and backup failures.
- [x] Configure the Raspberry Pi as the second encrypted backup destination outside the VPS pair,
      retain 90 days, verify ciphertext checksums and decryptability, and prove an isolated restore
      from the Pi copy.
- [ ] Connect backup failures and missed runs to an external notification channel, then test both a
      watchdog failure and a missing-heartbeat or unavailable-host condition.
- [ ] Run load and soak tests for polling, WebSocket invalidations, matchmaking, market concurrency,
      authoritative battle actions, PostgreSQL connections, and process memory.
- [ ] Run the dependency and production security review, including Nginx/TLS, cookies, OAuth,
      rate limits, secrets, system permissions, and network exposure.
- [ ] Configure the distinct production Google OAuth client and secrets, prepare the production
      environment, migrate `battleness_production`, deploy a CI-validated release, switch
      `battleness.com`, enable TLS, run production smoke checks, and retain rollback artifacts.
- [ ] Keep production on one Game App instance until the process-local realtime hub is replaced by
      shared pub/sub.

## Open Design Questions

- [x] What exact campaign opponents should exist first? The initial linear track is Ember Trial, Storm Initiate, and Frost Gate.
- [x] What fixed rewards should campaign opponents grant? Each content record now defines first-clear and repeat-victory values.
- [x] What initial hero XP rewards should development battles grant? Win grants 100 XP, draw grants 60 XP, and loss grants 25 XP. Campaign and PvP formulas remain open within their respective modes.
- [x] Should ring socket-count improvement live under `/forge/socket`, `/forge/quality`, or a separate improvement view? Decided and implemented under `/forge/socket`.
- [x] Should spell and monster gem enchantment be managed in inventory, forge, or both? Mutations live only under the dedicated Forge > Enchant view; Inventory shows read-only composition and links the selected item into the appropriate Forge workflow.
- [x] Should the Game Market sell only materials at first? It buys materials from players and also
      buys eligible crafted rings, gems, monsters, and spells using recipe-based values.
- [x] What data should be public in player-facing PvP before, during, and after battle? Search is anonymous; pre-combat identity is limited; loadouts and ring counts stay hidden; rings, gems, and enchantments reveal through use; monsters reveal on summon; participant results and replays show full loadouts; public profiles show competitive records only.
- [x] When should ranked mode become visible as more than a locked mock? Replace the mock only when the first complete rating, queue, acceptance, battle, and settlement vertical slice is functional.

## Keep Explicitly

- [ ] Keep `apps/prototype` as a technical Dev Lab with no player-owned inventory, economy,
      progression, or reward state.
- [ ] Keep the pure combat engine independent from UI, database, sockets, and framework code.
- [ ] Keep JSON content definitions as source of truth unless a later explicit decision changes that.
- [ ] Keep all new documentation content in English.
