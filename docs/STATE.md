# State

This file records modifications made to the project during agent-assisted work.

## Current State

- Phase 14 deployment foundation has started. The initial production direction is OVH VPS hosting on
  Debian stable with Nginx, one Game App instance, and a separate self-managed PostgreSQL server
  reached by public IP with firewall restrictions. `staging.battleness.com` is the first public
  environment before `battleness.com`. The Nuxt server now validates `BATTLENESS_APP_ENV`,
  `BATTLENESS_PUBLIC_ORIGIN`, PostgreSQL database URLs, disabled development authentication, and
  Google OAuth credentials for staging and production; secure cookies and dev-only routes now follow
  the public deployment model; and unauthenticated live/readiness health endpoints are available.
- Public deployments now run an application-level HTTP security baseline before route handlers:
  security headers, API `no-store`, trusted-origin checks for mutating API calls, content-length
  limits, and process-local rate limits for authentication, matchmaking, market mutations, combat
  commands, and generic mutating requests.
- The first OVH VPS bootstrap is complete. The app host has Debian 13, Nginx, UFW, fail2ban, Node
  `v24.18.0`, pnpm `10.14.0`, and a PostgreSQL client. The database host has Debian 13, PostgreSQL
  17, UFW, and fail2ban. Separate staging and production PostgreSQL databases exist, and staging
  database connectivity from the app VPS has been verified.
- The first staging release is deployed on the app VPS. PostgreSQL migrations have been applied to
  the staging database, `battleness-staging.service` is active, and Nginx proxies HTTP
  `staging.battleness.com` requests to Nitro. Health checks pass locally and through the HTTP proxy.
  The repo now has a dedicated `build:postgres` script for public PostgreSQL builds so deployment
  does not accidentally package the local SQLite Prisma client.
- Staging currently runs commit `389febed9d7d670c3bbc9a7c90c5e5d15646d6b1` from immutable release
  `/opt/battleness/releases/20260721T215331Z-389febed`. Deployment on 2026-07-21 used verified backup
  `20260721T215322Z`, found no pending migrations, and passed local/public health checks plus an
  authenticated Chrome smoke of live combat and ranked season state.
- `staging.battleness.com` now resolves to the app VPS and serves HTTPS through a Let's Encrypt
  certificate managed by Certbot's Nginx integration. Public HTTPS live/readiness checks pass, and
  the staging Google OAuth route starts the expected Google redirect. The user has verified Google
  login on staging. Certbot's renewal timer is active, and a simulated renewal succeeded on
  2026-07-21. The earlier timeout was Certbot's normal randomized delay rather than a TLS failure.
- Public Google OAuth completion now applies a versioned starter loadout to otherwise empty accounts:
  one Training Flame Band socketed with a Ruby Shard enchanted by Firebolt, equipped and active.
  The grant and onboarding marker are atomic and idempotent; accounts with existing gameplay state
  are marked without receiving duplicates. The migration is deployed to staging, and the previously
  empty second Google account received exactly the three starter items and active loadout on login.
- The first two-account private-match staging test exposed a pre-existing PvP snapshot bug: battle
  setup combined both players but retained only the first player's monster/spell instance-definition
  maps, so the guest could not load a distinct enchanted ring. The deployed fix merges both maps and
  adds an integration regression with a guest-owned Ruby Shard and Firebolt. A second deployed fix
  limits private-lobby state to ongoing statuses so completed matches no longer hide the create/join
  controls. Two-account private and casual smoke tests now cover distinct loadouts, battle entry,
  turn synchronization, reconnect, concession, settlement, complete result snapshots, and history.
- Staging has its first active ranked season, `staging-ranked-season-20260721`, from
  `2026-07-21T21:50:00Z` through `2026-09-15T21:50:00Z`. It was inserted transactionally only after
  verifying backup `20260721T214832Z`; ranked two-account matchmaking and settlement smoke remains
  pending.
- Live PvP refreshes no longer replace an already-rendered arena with the initial loading state.
  Realtime invalidations and the polling fallback had toggled Nuxt `useFetch` pending state and
  unmounted the entire combat subtree on every refresh. The local fix keeps existing battle data
  visible during background refreshes and adds focused regression coverage. The fix is deployed;
  a fresh two-account action sequence remains to confirm the visual behavior under live updates.
- Staging API latency from the Battle hub was diagnosed and fixed. Public deployment builds now reuse
  one cached Prisma client per database URL instead of creating a new `PrismaClient` per request, and
  development player seeding is skipped entirely for `staging` and `production` environments. The
  fix removed the PostgreSQL idle-connection buildup that had reached the server limit and reduced
  representative authenticated Battle hub API timings from roughly 1.2-1.8 seconds to about
  90-170 ms locally on the app host and 180-275 ms through public HTTPS.
- The database VPS now has a first local PostgreSQL backup system: daily systemd-timer custom-format
  dumps for `battleness_staging` and `battleness_production`, 14-day local retention under
  `/var/backups/battleness/postgresql`, checksum manifests, and a restore-check script. The first
  manual run and staging restore drill passed on 2026-07-21. Off-host encrypted copies and backup
  monitoring remain production follow-up work.
- The first encrypted off-host backup path is installed: `bndb` archives the latest local PostgreSQL
  backup, encrypts it with the public backup recipient certificate, and copies it to `bnapp` under
  `/var/backups/battleness/postgresql-offhost` with 30-day retention. The private decryption key
  remains outside the repo and off the servers on the user's desktop. The first encrypted copy and
  decrypt/list verification passed on 2026-07-21. A second off-pair backup target and alerting remain
  production follow-up work.
- The second backup destination outside the two VPS is intentionally deferred. The user does not want
  to pay for object storage right now and does not yet have a high-availability home server. The
  documented future direction is a private home server, likely a Raspberry Pi, once it can provide
  acceptable availability.
- The first operations runbook now defines exact-commit release packaging, immutable release
  directories, pre-migration backups, PostgreSQL migration gates, atomic symlink activation,
  post-deployment checks, application rollback, destructive database recovery safeguards,
  emergency containment, production promotion prerequisites, and release retention.
- The database backup path now includes a daily systemd watchdog that checks the last local and
  off-host service results, enforces a 30-hour maximum age, validates both dumps and their checksums,
  and requires a non-empty matching encrypted archive on the app VPS. It fails with structured
  `CRITICAL backup_monitor` journal records. External delivery and missed-run detection are
  intentionally on standby at the user's request; no hosted heartbeat, webhook, or SMTP integration
  is configured.
- A PostgreSQL operational cleanup job runs daily in apply mode. It removes expired or
  revoked sessions, expired OAuth attempts, old terminal casual/ranked queue entries, cancelled
  private lobbies without battles, and inactive ranked discipline state while explicitly preserving
  permanent battle, rating, reward, season, player, and market records. It uses the user-approved
  seven-day session, immediate OAuth, and 30-day queue policy. It currently targets staging only
  because the reserved production database has not received its schema migrations; a verify mode
  exercises deletions and rolls back. Both VPS also cap journald at 30 days and 512 MiB.
- The Nuxt API integration suite gives the Prisma reset hook a 30-second timeout and the intentionally
  concurrent player-market purchase race test a 60-second timeout, matching their database-heavy
  behavior on slower GitHub Actions runners without changing the tested market semantics.
- Agent handoff documentation now defines a complete reading order, requires inspection and
  preservation of existing worktree changes, records the supported local toolchain and validation
  gate, distinguishes SQLite, PostgreSQL, and OAuth prerequisites, documents the Windows Prisma DLL
  lock caveat, and replaces obsolete framework, UI, and tooling discussion notes with current
  implementation status.
- Public PvP profiles are implemented without new persistence. An authenticated API projects only the current ranked season's public identity, placed rating and rank, peak rank, wins, losses, and match count from existing player and rating rows. Private profiles are indistinguishable from unknown profiles to other players, while owners can preview their own profile. The localized responsive view is linked only from visible leaderboard identities and explicitly excludes inventory, equipment, loadouts, and item progression. Integration coverage verifies the public projection, private rejection, owner preview, and absence of hidden game-state fields.
- Finished Nuxt battle results now expose both participants' complete resolved loadout snapshots. The server derives rings, gems, and enchantments from the immutable initial battle setup, the shared result contract carries them through history and replay reconstruction, and the localized result view renders responsive per-player equipment sections with item artwork and combat statistics. API coverage verifies that previously hidden opponent equipment becomes available after settlement.
- The cross-mode PvP information contract is implemented and regression-tested. Search is anonymous; pre-combat identity is limited to display name, hero level, visible rank, and readiness; even opponent ring count remains hidden. Rings reveal permanently on first use, gems and enchantments on first effect, monsters expose full combat data when summoned, participant results and replays expose complete loadouts, and public PvP profiles expose competitive records without inventory or loadouts. A shared presentation-policy matrix and API integration assertions cover every phase across private, casual, and ranked PvP.
- The pre-combat PvP information boundary is enforced server-side across private, casual, and ranked modes. Search states have no opponent identity, matched opponents expose only display name, hero level, visible rank, and readiness, private lobby loadout metadata is returned only for the current participant, and live battle opponent DTOs no longer expose ring count. Shared client types, localized presentations, and cross-mode API assertions use the same projection.
- Live battle staged reveal is implemented without parallel persistence. The server deterministically reconstructs permanent per-participant visibility from the battle snapshot and action journal: first ring use reveals that ring and its contributing gems, while spell and monster enchantments remain omitted until an actual cast or summon. The localized combat view renders only those revealed opponent items in a read-only dock, and pure plus API integration tests cover hidden, ring/gem, and triggered-enchantment phases.
- Gem-enchantment ownership is now explicit in the player experience: Inventory shows persisted socket and enchantment relationships read-only and hands relevant items to Forge > Socket through query-backed preselection. Forge supports independent gem and target selection, confirmed atomic replacement, free non-destructive removal, equipped-ring mutation outside combat, and unrestricted elemental combinations while preserving ownership, uniqueness, and market-escrow validation. API coverage verifies replacement, released targets, new ownership, and enriched inventory reads.
- The Nuxt server now provides basic operational observability: safe request correlation through `x-request-id`, structured JSON request and ranked-maintenance failure records, battle and authenticated-player context without request secrets, a bounded process-local development buffer, and authenticated development-only inspection and clearing endpoints. The operating policy and production limitations are documented in `docs/OBSERVABILITY.md`.
- GitHub Actions CI now enforces the Prettier baseline and builds the Nuxt Game App for production in addition to type checking, linting, tests, and the existing PostgreSQL migration, drift, and smoke checks.
- Game Market, Player Market, and private market history now use the tactical player-facing design system without changing their transactional APIs. The fixed market presents material and crafted-item catalogues beside a contextual buy, sell, or recipe-valued buyback desk plus a compact activity log. The player market presents permanent-listing status, a collapsed escrow listing form, primary and advanced search filters, price-forward listing cards, and clear purchase or free-cancellation actions. History is a private ledger with direction, item metadata, settlement value, date, and role filtering. Idempotency, escrow, anonymous counterparties, permanent listings, and transaction privacy remain unchanged.

- Craft, Socket, and Quality now use the tactical player-facing design system without changing their persistence APIs or economy rules. Craft separates its filterable blueprint catalogue, selected output, three-material readiness, production action, and recent output log. Socket presents ring selection, capacity improvement, visible socket composition, available gems, and spell/monster enchantment binding as one staged workflow. Quality presents a filtered item library, quality progress, resolved before/after stat comparison, credit cost, and maximum or blocked states. Technical instance identifiers were removed from all three player-facing Forge routes.

- Equipment and Loadouts now use the tactical player-facing design system without changing their persistence APIs. Equipment presents ten stable combat slots, a compact active-kit summary, collapsed resolved-stat details, and a medium-density owned-ring arsenal with artwork and direct actions. Loadouts presents the current equipped set as a reusable configuration builder, compact ring docks, comparable saved configurations, and clear active, activate, and delete states. Player-facing technical identifiers and repeated nested gem details were removed; complete item data remains available through the shared detail panel.

- Battle history and result routes now use the tactical player-facing design system. History exposes completed-battle, victory, win-rate, and pending-reward metrics; localized outcome filters; compact mode, date, turn, action, replay, and reward rows; direct reward claims; and a clear return to battle entry. Result pages now prioritize outcome, mode, timestamp, replay verification, persistent reward status and claims, per-player contribution, grouped combat activity, and complete earned-reward detail. Deterministic record identifiers, versions, seed, and checksum remain available in a collapsed technical verification panel. Existing history and reward APIs are unchanged.

- The PvP hub and matchmaking routes now use the tactical player-facing design system. The real hub replaces the obsolete generic mock with distinct private, casual, and ranked mode entry points plus combat-readiness and persistence guarantees. Private matches now present host/join entry, invitation sharing, participant readiness, loadout locking, and battle entry as a lobby. Casual matchmaking now presents an unranked queue console, active-loadout readiness, search countdown, cancellation, and match-found states. Ranked now combines season standing, placement and peak metrics, active-loadout entry, search and bilateral-acceptance states, recent results, rewards, and leaderboards in a responsive competitive layout. Existing authoritative APIs, realtime invalidations, polling fallback, timers, and redirects are unchanged.

- The Battle Hub and Campaign now use the confirmed tactical player-facing design system. The hub prioritizes campaign, PvP, and training mode selection before a compact active-loadout summary, scrollable ring dock, battle history entry, and collapsed development-only result tools. Campaign now presents a responsive linear journey, global completion strip, loadout readiness, opponent status and elemental threat, player-versus-recommended level feedback, fixed reward previews, collapsible known-loadout intelligence, and a clear encounter action. Existing battle creation, campaign progression, reward, and loadout APIs are unchanged.

- The Nuxt Game App now has the first implementation of its confirmed visual direction: a dark tactical application shell with a persistent desktop sidebar, compact resource top bar, fixed mobile bottom navigation, Lucide icon vocabulary, and responsive design tokens. The home page is now a player command center with direct campaign and PvP entry, progression and economy metrics, forge/inventory/market destinations, and item artwork from the current collection. Shared inventory cards use medium density, restrained rarity treatment, two-column mobile stats, hidden player-facing technical IDs, and mobile detail panels that appear only after selection. The permanent Vite Dev Lab remains unchanged for technical diagnostics.
- The player-facing Profile workflow now uses real persisted data throughout. `/profile` replaces its former mock with an identity, account summary, hero development, combat record, and recent-activity dashboard; `/profile/progression` presents hero and collection growth with item filters and an expandable exact stat formula; `/profile/settings` separates stable account metadata from persisted identity, localization, appearance, accessibility, and audio preferences. Existing authentication and preference APIs remain unchanged, and all three views adapt to the mobile application shell.
- The Battle, Forge, Inventory, and Market section hubs now act as data-backed operational dashboards instead of generic route menus. Battle adds campaign completion, verified history, win rate, and pending reward context to its mode and loadout controls. Forge exposes material, recipe, socket-resource, quality-candidate, and credit readiness. Inventory combines collection counts with equipped and active-loadout status. Market separates fixed-price and player exchanges while showing sellable stock, listing capacity, and recent game transactions. The hubs reuse existing authenticated APIs and do not add independent client-side business rules.
- Shared item inspection is now modal across every current `ItemDetailPanel` consumer in Battle, Forge, and Inventory. Opening an item no longer reserves or inserts an inline detail frame. The teleported dialog has a persistent top-right close control, backdrop and Escape dismissal, focus restoration, page-scroll locking, responsive internal scrolling, and the same localized item details as before.

- The live battle UI now consumes complete structured engine events instead of displaying raw event names. A pure presentation layer produces localized resolution entries and aggregates source and target effects for short CSS feedback: source pulses, target impacts, floating damage totals, and Shield, Rage, Haste, or destruction status labels. The existing reduced-motion preference suppresses the animation duration globally, raw event types remain available only in collapsed diagnostics, and focused tests cover event presentation and multi-effect aggregation.

- The player-facing live battle view now uses a mobile-first Nuxt DOM arena. It presents opponent and viewer energy rails, heroes, three monster slots, item artwork, health/cooldown/status information, hidden opponent rings, and a scrollable viewer ring dock. Actions use direct source-card selection followed by immediate execution when a legal target card is clicked; Taunt restrictions are visible before submission, first-turn hero protection remains targetable and explicitly identified, and technical battle metadata is available in collapsed diagnostics. Pure presentation tests cover source availability, Taunt legality, and first-turn protection. Phaser remains optional rather than required for this stage.
- The Battle presentation audit now covers Battle Hub, Campaign, all PvP entry flows, and Live Battle at desktop and 390-pixel mobile widths. Battle controls use visible keyboard focus, mobile commands and key PvP links meet a 44-pixel touch target, the compact Live Battle command tray remains above fixed mobile navigation, operating-system reduced-motion preferences are honored, selected combat sources expose pressed state, and the live diagnostics no longer request missing localization keys.
- The Forge presentation audit now covers Forge Hub, Craft, Socket, and Quality at desktop and 390-pixel mobile widths. Forge has no page-level overflow or clipped text, and its mobile buttons, links, filters, inputs, and selects meet a 44-pixel touch target. Shared item modals now inert the application background, confine Tab and Shift+Tab navigation, preserve Escape and backdrop dismissal, restore trigger focus and body scrolling, and remain correctly bounded on mobile.
- The Inventory presentation audit now covers Inventory Hub, Items, Materials, Equipment, and Loadouts at desktop and 390-pixel mobile widths. Inventory has no page-level overflow or clipped text, mobile controls meet a 44-pixel touch target, repeated object actions expose contextual accessible names, and loadout deletion now requires an explicit reversible confirmation step before the persistent mutation. Shared item-modal opening and dismissal were reverified from the collection view.
- The Market presentation audit now covers Market Hub, Game Market, Player Market, and private Market History at desktop and 390-pixel mobile widths. Market routes have no page-level overflow or clipped text; mobile tabs, links, filters, forms, expandable summaries, actions, and pagination meet a 44-pixel touch target. Game Market resource, transaction-mode, and selected-card state is exposed semantically, while repeated player-listing actions identify their item and purchase confirmations include both item and server-formatted price. Catalogue and history filters, expanded seller and advanced-filter panels, and empty states were reverified without recent Market runtime localization warnings.
- The final presentation audit now covers Home, Profile Overview, Profile History, Progression, Settings, local authentication, and the global application shell at desktop and 390-pixel mobile widths. These routes have no page-level overflow or clipped text; section navigation, primary and secondary actions, text links, filters, form controls, range inputs, and local sign-in actions meet a 44-pixel mobile touch target while checkbox rows preserve compact controls with full-row activation. Profile filters expose grouped pressed state, nested shell navigation exposes the active section through `aria-current`, settings enforce the server's 2-to-32-character display-name constraint in the browser, and save outcomes use status or alert semantics. Theme, density, reduced-motion, mute, disabled-volume, sign-out, and restored Development Player 2 sign-in states were verified without persisting temporary preference changes or producing recent runtime localization warnings. The cross-application visual audit is complete.

- The Nuxt Game Market now buys eligible crafted rings, gems, monsters, and spells. The server
  derives each item value from the official buy prices of all recipe ingredients and pays 25%
  rounded down with a one-credit minimum; material buyback now uses the same 25% rule. Atomic,
  idempotent sales delete the exact inventory instance and credit the player together, retain a
  durable definition ID in transaction history, and block equipped, loadout, socketed, enchanted,
  escrowed, or recipe-less items. The localized market view exposes material/item modes, recipe
  valuation, eligibility reasons, confirmation, and persistent history. SQLite and PostgreSQL
  migrations plus integration tests cover valuation, rollback guards, idempotency, and concurrent
  single-sale behavior.
- Permanent private player-market history is implemented. The authenticated paginated API returns only sold listings in which the current player was buyer or seller, supports purchase and sale filters, reconstructs safe bundle counts from immutable snapshots, and excludes all counterparty identity data. The localized responsive `/market/players/history` view uses existing item artwork and rarity presentation, and integration tests cover actual settlement visibility, privacy, filtering, ordering, pagination, and invalid input.
- Player-market purchase is implemented end to end. Authenticated non-sellers can explicitly confirm a purchase; an idempotent serializable transaction then claims the active listing, conditionally debits the buyer, credits the seller, and transfers the indivisible material lot or complete escrowed item graph. Ring-socket and enchantment ownership follows transferred bundles, failed settlements roll back fully, and concurrent buyers are covered by a single-winner integration test.
- Player-market cancellation is implemented end to end. Sellers can freely cancel their own active listings through an idempotent serializable transition that restores the exact material lot or releases every item-bundle escrow lock, retains the cancelled record, and rejects foreign, repeated-with-a-new-request, or no-longer-active operations. Own listing cards expose the localized action and refresh browse, stock, and capacity state immediately.
- Player-market listing creation is implemented end to end. The authenticated POST API atomically moves material lots or complete eligible item graphs into escrow, journals globally idempotent requests, stores immutable ring-bundle snapshots, enforces positive prices and the 20-active-listing limit, and prevents escrowed items from being equipped or modified. The responsive localized seller form receives its eligible resources from the server rather than duplicating ownership rules in the client.
- The player market now has an authenticated browse API and a real localized `/market/players` view. Active permanent listings are anonymously projected with deterministic sorting, bounded pagination, content-backed item labels, artwork, ownership markers, and validated filters for type, definition, rarity, element, level, quality, and price. Sold or cancelled records and seller identities are never returned by the browse endpoint.
- The player market now has a Prisma persistence foundation in SQLite and PostgreSQL. Permanent listing records contain indexed browse attributes, price, indivisible quantity, item-bundle snapshots, seller/buyer history, and no expiration field. Unique escrow rows lock every item instance in a listed graph, and globally unique mutation journals provide the database basis for idempotent creation, purchase, and cancellation. Local migration-backed tests and the PostgreSQL smoke path cover these relations and uniqueness constraints.
- PvP state transitions that can race now use serializable Prisma transactions with bounded retry. Ranked battle creation is a separately claimed idempotent step after bilateral acceptance, decline and expiry claim their proposal before applying discipline, and timeout settlement retains its single-writer claim. Integration tests exercise simultaneous casual entry, simultaneous ranked acceptance, duplicate decline, concurrent proposal expiry, duplicate live actions, and concurrent reconnect reads during both turn and opening-duel timeouts.
- Ranked PvP now has a persistent five-minute queue and a localized player flow at `/battle/pvp/ranked`. Queue entry snapshots the active loadout, rating, and hero level; matching requires mutually compatible expanding ranges and prefers opponents not played in the previous 30 minutes; both entries are claimed atomically; and players receive a persisted 20-second bilateral acceptance window. Acceptance creates a normal authoritative `ranked_pvp` battle with hidden opponent rings, reconnect and timeout behavior, realtime invalidations, polling fallback, and atomic idempotent Glicko-2 settlement.
- Ranked discipline is persisted per player. Declining or missing acceptance applies the configured 1, 5, 15, or 30-minute lockout only to the responsible player, and the streak resets after 24 hours. Eight-week season succession is persisted explicitly and processed idempotently at server startup, hourly, and before ranked entry points. Rollover closes the previous season, expires stale queue entries, creates the successor, resets placements and records, retains 75% of rating distance from 1500, raises deviation to at least 200, and journals every reset.
- Diamond and Master inactivity decay is enforced after seven inactive days and then once per completed week at 25 rating points, down to a 2000 floor. Period-keyed immutable journals make retries safe, and players already decaying continue toward the floor even after crossing below Diamond. The ranked page explains the new-season reset while replacement placements are incomplete.
- Eligible ranked players now receive one idempotent season reward based on their highest post-placement tier. Rollover creates an unclaimed grant with tier credits, three deterministic rarity-scaled materials, a permanent season badge, and a permanent profile title. Claims never expire, use the existing atomic reward pipeline, and appear on ranked and history views.
- The ranked page includes the active season's global top 100, the current player's exact position, and five nearby entries. Only players with five completed placements are ranked. Ties use rating, deviation, wins, and player ID in deterministic order, and private profiles are anonymized for other viewers.
- Casual PvP now has a persistent five-minute FIFO matchmaking queue at `/battle/pvp/casual`. Entering the queue snapshots the active loadout ring IDs, opponent claims and battle creation occur atomically, queue state supports waiting, matching, matched, cancelled, and expired transitions, and players receive WebSocket invalidations with polling fallback. Matched battles reuse the authoritative private-PvP deadlines, reconnect behavior, hidden opponent rings, history settlement, and zero-reward policy.
- Private PvP opening element duels now have a separate persisted 90-second deadline that starts with battle creation and continues through disconnects. A submitted choice is hidden and locked, each tied duel resets the full deadline, one missing choice becomes that player's journaled concession, and no choices produce a journaled draw. Three tied duels invoke a seed-based deterministic tiebreaker recorded in the engine event log. The Game App shows the duel round, local submission state, and authoritative countdown without exposing the opponent's choice.
- Private PvP now uses an authenticated Nitro WebSocket channel for lobby and battle invalidation events. HTTP APIs and Prisma remain authoritative, clients refresh server state when an event arrives, heartbeat/reconnect behavior is automatic, multiple tabs per player are supported, and slower HTTP polling remains as a fallback. The initial event hub is process-local and must move to shared pub/sub before horizontal server scaling.
- Private PvP active turns have a persisted five-minute server deadline. Each accepted action resets the deadline for the next active player, disconnecting does not pause it, polling or action submission settles an expired turn as a server-side concession, and the live view displays a local countdown backed by the authoritative timestamp.
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
- The Nuxt Game Market supports persistent material purchasing plus material and crafted-item
  buyback, fixed recipe-based previews, eligibility validation, atomic Prisma updates, persistent
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

### 2026-07-20

- Added the first Phase 14 deployment foundation: validated local/staging/production environment
  handling, strict public-environment requirements, secure-cookie and dev-route guards, liveness and
  readiness endpoints, staging/production environment templates, and an OVH Debian/Nginx deployment
  runbook outline.
- Added the first production HTTP security baseline in Nitro with public-environment response
  headers, trusted-origin enforcement, request-size caps, and process-local route-category rate
  limits.
- Bootstrapped the first clean OVH VPS pair for Phase 14: app host with Nginx, firewall, fail2ban,
  Node 24, pnpm 10.14.0, and PostgreSQL client; database host with PostgreSQL 17, firewall, and
  fail2ban; separate staging and production databases; and verified staging database connectivity
  from the app host. Real credentials and generated deployment secrets were kept outside the repo.
- Deployed the first staging release to the app VPS, applied all PostgreSQL migrations to the
  staging database, started the `battleness-staging.service` systemd unit, configured Nginx as the
  HTTP reverse proxy, verified live/readiness health through the service and proxy, and added a
  `build:postgres` package script to avoid generating a SQLite Prisma client for public builds.
- Pointed `staging.battleness.com` at the app VPS, installed the Let's Encrypt certificate through
  Certbot's Nginx integration, verified public HTTPS live/readiness health, and verified that the
  staging Google OAuth route starts a Google redirect with the HTTPS callback URI.
- Verified the Certbot systemd renewal timer and completed a successful simulated renewal on
  2026-07-21 using `--no-random-sleep-on-renew`; the earlier bootstrap timeout was caused by
  Certbot's randomized renewal delay.
- Fixed the first observed staging Battle hub latency issue by caching the Prisma client for public
  deployments, skipping development seeding in staging/production read paths, redeploying the
  staging release, clearing the prior idle-connection buildup, and recording post-fix authenticated
  API timings.
- Added versioned PostgreSQL backup and restore-check scripts plus systemd service/timer units,
  installed them on the database VPS, enabled the daily backup timer, ran the first manual backup,
  verified dump checksums, and restored the staging dump into an isolated throwaway database.
- Added a versioned encrypted off-host backup-copy script plus systemd service/timer units, generated
  the backup recipient key material outside the repo, installed the public certificate on the
  database VPS, configured a dedicated SSH transfer key to the app VPS, enabled the daily off-host
  copy timer, and verified that the uploaded archive decrypts and contains both database dumps.
- Documented that a second encrypted backup target outside the VPS pair is intentionally pending
  until a private high-availability home server, likely a Raspberry Pi, is available or a paid
  storage provider is chosen.
- Added the Phase 14 operations runbook for manual release, migration, atomic activation, smoke
  testing, application rollback, database recovery, emergency containment, production promotion,
  and release retention.
- Added and installed the PostgreSQL backup watchdog script and systemd service/timer, then verified
  it against the live local dumps, checksum manifest, prior service results, SSH path, and encrypted
  app-VPS archive. Documented the user's decision to place external missed-run and failure
  notification on standby while leaving the local watchdog active.
- Added, installed, and enabled the guarded PostgreSQL operational cleanup script and daily systemd
  timer with the approved retention policy, then applied the 30-day and 512-MiB journald limits on
  both VPS.
- Completed an authenticated read-only staging sweep of all 25 player-facing routes against
  PostgreSQL. Every route loaded successfully, with full navigation measured between 0.43 and 1.03
  seconds. The browser console exposed hydration mismatches on Profile History, Settings, and Battle
  History because server UTC and browser-local date formatting produced different initial text.
  Added a shared SSR-safe date-time formatter, applied it to every client date-time surface, and
  verified the three affected routes locally with no browser warnings or errors. Mutation and
  two-account PvP smoke coverage remains pending.
- Deployed CI-validated commit `a05c68d8` as immutable staging release
  `20260721T154353Z-a05c68d8` after a verified pre-release backup. No migrations were pending. The
  service, local/public liveness and readiness checks, authenticated hub smoke checks, and the three
  date-time hydration regression checks passed; the new process reported no restart or application
  errors. The release build exposed a line-ending-only false positive in
  `prisma:postgres:check` when a Git archive retains CRLF in the generated schema marker; the normal
  PostgreSQL build regeneration produced an identical effective schema and should be made
  platform-independent in a follow-up commit.
- Made `prisma:postgres:check` platform-independent by normalizing line endings only for comparison.
  The generator remains deterministic, substantive schema changes still fail the stale-schema gate,
  and focused tests cover LF, CRLF, legacy CR, and genuinely different content.
- Increased the Nuxt API integration reset hook timeout to 30 seconds and, after a later runner
  exceeded that budget, the contested player-market purchase race timeout to 60 seconds without
  changing its concurrency assertions.
- Added production-safe public-player onboarding after staging mutation smoke tests revealed that a
  newly authenticated account had no inventory or active loadout. OAuth now transactionally claims
  a durable onboarding version and grants an empty account the canonical Training Flame Band, Ruby
  Shard, and Firebolt starter graph plus an active loadout. Existing accounts receive no duplicate
  resources. Added matching SQLite/PostgreSQL migrations and OAuth/idempotence regression coverage.
- Deployed CI-validated commit `07eb26f1` as release `20260721T172633Z-07eb26f1` after verified backup
  `20260721T172429Z`, applied the onboarding migration, passed service and public health checks, and
  verified the second Google account receives its exact starter graph and active loadout.
- Reproduced a two-account private PvP failure in staging where the guest's distinct spell instance
  was absent from the persisted battle definition map. Updated PvP setup composition to merge both
  players' monster and spell definitions and added regression coverage using an enchanted guest ring.
- Deployed CI-validated commit `095a8926` as release `20260721T190126Z-095a8926` after verified backup
  `20260721T190019Z`; no migrations were pending, and service plus local/public health checks passed.
- Found that a finished private match remained the lobby's current match and hid the create/join
  controls. Limited private-lobby state to ongoing statuses and extended integration coverage to
  create a second match without deleting the retained finished match.

### 2026-07-15

- Implemented recipe-valued game-market item buyback and reduced material buyback to 25%, with atomic instance deletion and credit settlement, durable definition-backed history, full inventory-reference guards, localized material/item sale workflows, dual-database migrations, and integration coverage including idempotent and concurrent sale attempts.
- Added permanent private player-market purchase and sale history with authenticated role filtering, stable pagination, safe immutable transaction projections, counterparty privacy, localized responsive cards, navigation, and integration plus desktop/mobile browser coverage.
- Implemented atomic player-market purchases with self-purchase rejection, conditional balance debit, immediate seller proceeds, exact material or complete item-graph ownership transfer, relation rewrites, escrow release, globally idempotent retries, localized confirmation controls, rollback coverage, and a concurrent single-winner test.
- Implemented free seller-only player-market cancellation with atomic listing claims, idempotent mutation journals, exact material restoration, item-bundle lock release, localized own-listing controls, and integration plus browser coverage.
- Implemented transactional player-market listing creation for indivisible material lots and complete ring graphs, including immutable snapshots, unique escrow locks, globally idempotent requests, eligibility and active-limit enforcement, escrow guards across inventory mutation paths, a localized responsive seller form, and integration coverage.
- Implemented authenticated player-market browsing with anonymous active-listing projections, validated full-detail filters, deterministic sorting, bounded pagination, localized content-backed controls, responsive item cards, and integration coverage for filtering, pagination, ownership markers, hidden seller identity, and inactive-listing exclusion.
- Added the player-market persistence foundation to SQLite and PostgreSQL with permanent indexed listings, nullable buyer history, complete bundle snapshots, unique item escrow locks, globally unique mutation journals, migration-backed local coverage, and PostgreSQL smoke coverage.
- Completed the remaining player-market rules: indivisible material lots, listing escrow, forbidden self-purchase, immediate atomic seller proceeds, first-commit purchase/cancellation races, and idempotent mutations.
- Defined the player-market V1 direction: fixed-price credit listings for every collectible type, complete ring bundles, no expiration, free publication and cancellation, no sale commission, seller-selected prices, 20 active listings, anonymous sellers, detailed filters, atomic single-winner purchases, and permanent private history.
- Hardened PvP concurrency with serializable retrying transactions, claimed proposal transitions, idempotent ranked battle activation, and integration coverage for simultaneous queues and acceptances, duplicate decline/action attempts, concurrent expiry penalties, and reconnect-triggered timeout settlement.
- Implemented persistent ranked peak ratings and complete season rewards with deterministic tier bundles, idempotent rollover grants, permanent cosmetic unlock ownership, localized claim UI, and integration coverage.
- Added automated, idempotent eight-week ranked season succession, immutable soft-reset and inactivity journals, stale queue expiration, hourly and request-path maintenance triggers, new-placement reset UI, and rollover/decay integration coverage.
- Added the ranked top-100 and nearby-player leaderboard API and responsive UI, including deterministic ties, placement eligibility, current-player highlighting, and private-profile anonymization.
- Implemented the ranked matchmaking vertical slice with persistent queue and discipline records, mutually expanded rating/level matching, recent-opponent preference, bilateral acceptance, authoritative battle creation, realtime UI, and automatic Glicko-2 settlement.
- Fixed the initial ranked tuning values for visible divisions, matchmaking expansion, queue penalties, seasonal soft resets, and high-rank inactivity decay.
- Added versioned ranked ratings and immutable rating-adjustment journals to SQLite and PostgreSQL, plus atomic, concurrency-guarded, idempotent settlement of both players from authoritative finished ranked battle records.
- Added the pure Glicko-2 rating module, canonical algorithm tests, ranked season and per-player rating persistence for SQLite and PostgreSQL, migration coverage, and PostgreSQL smoke coverage.
- Confirmed the complete functional direction for ranked PvP, including Glicko-2 rating, placements, visible ranks, hybrid matchmaking, acceptance, queue penalties, abandonment, seasons, inactivity, rewards, repeat-opponent handling, and leaderboard scope.
- Added SQLite and PostgreSQL persistence for casual queue entries and PvP session type discrimination, including immutable ring snapshots and nullable loadout provenance.
- Implemented authenticated casual queue read, enter, cancel, expiration, FIFO matching, atomic session and battle creation, realtime invalidations, localized player UI, automatic battle entry, and integration coverage for loadout locking, hidden opponent rings, expiry, cancellation, and zero rewards.

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
