# Resume

This file is a handoff for continuing BattleNess development on another computer or with another agent.

## Read First

Read these files before making changes:

- `docs/AGENT.md`: persistent instructions for future agents.
- `docs/PROJECT.md`: project summary, rules, glossary, proposed rules specification, and technical decisions.
- `docs/STATE.md`: change log for agent-assisted project modifications.

## Current Project State

- Project name: BattleNess.
- Current phase: authenticated Game App infrastructure with the first persistent private PvP lifecycle, while the original deterministic prototype remains a permanent Dev Lab.
- User intent: clean rebuild of an already-started game.
- A TypeScript monorepo is in place with `packages/engine`, `packages/content`, `apps/prototype`, and `apps/web`.
- The prototype includes deterministic combat state creation, ring and monster actions, direct-damage spells, summons, all six current monster skills, first-turn protection, battle end checks, combat-start resolution, JSON scenarios, versioned battle-record export/import and replay, a battle setup screen, a first sketch-inspired battle board with prepare-action-then-target interaction for rings and monsters, both players' rings visible for development testing, manual browser controls, localized event-log rendering, Taunt-aware target selection, and DOM interaction tests for critical board flows.
- `apps/prototype` should stay as a permanent Dev Lab for engine, content, inventory, reward, and combat diagnostics.
- `apps/web` is the Nuxt Game App. It has Prisma-backed player state, inventory, forge, market, campaign, authenticated live battles, Google OAuth support, and a persistent private PvP lobby using invitation codes. Private lobby and battle changes use authenticated WebSocket invalidations with HTTP polling fallback. Private active turns use a persisted five-minute deadline that continues through disconnects and expires as a server-side concession; the unresolved opening element duel is not timed yet.
- The user handles commits and pushes to GitHub themselves.
- The next infrastructure milestone is to harden the Game App data model and UI shell before moving into campaign work.

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
- Monsters fight alongside the hero and have damage, health, cooldown, elemental type, and at most one optional skill.
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
- Use a TypeScript monorepo with separate workspaces for the combat engine, game content, Dev Lab prototype app, and Nuxt Game App.
- Use Vite with a simple DOM interface for the first local combat prototype.
- Use pnpm as the package manager.
- Use Vitest for engine unit tests and JSON scenario tests.
- Use ESLint and Prettier for linting and formatting.
- Do not build a backend for the first combat prototype.
- Use Prisma as the ORM/database migration tool for the durable schema. The Nuxt Game App currently uses Prisma with local SQLite for development persistence.
- The first combat prototype should be deployable as a simple static build after it becomes playable.
- Use GitHub Actions for install, typecheck, lint, and tests.
- Use the active Node.js LTS version at setup time and manage pnpm through Corepack.
- Use `packages/engine`, `packages/content`, `apps/prototype`, and `apps/web` as the current workspace layout.
- Use authenticated WebSocket invalidations as the primary multiplayer transport while HTTP/Prisma remain authoritative and polling remains a fallback. The current event hub is process-local and requires shared pub/sub before multi-instance deployment.
- Build live synchronous PvP first when multiplayer work starts, with asynchronous play left as a possible later addition.
- Live matches should be preserved during disconnects and allow players to reconnect.
- The first future PvP mode should support private matches by code before automatic matchmaking; ranked mode is desired later alongside solo/campaign.
- Prefer OAuth login first, especially Google and Facebook, then add email and password authentication.
- Build a localization module from the beginning. User-facing text must resolve through localization keys and translation JSON files, not hardcoded strings.
- Set up an organized asset pipeline from the beginning, even if early assets are AI-generated templates that may be replaced later.
- The BattleNess logo and application icon are stored under `apps/prototype/public/assets/brand/` and are integrated into the prototype header and document metadata.
- Plan for sound and music later.
- Persist match actions, deterministic seed, and result for replay/debug/history, similar in spirit to chess PGN.
- Keep versioned JSON content definitions as the source of truth and import them into the database if runtime querying, admin tooling, or production operations require it. Player-owned instances and progression data belong in the database.

## Proposed Technical Direction

The following are proposals, not final decisions:

- Use an authoritative server for multiplayer.
- Use Nuxt for the initial Game App frontend/backend scaffold. Phaser remains a possible later addition for the combat presentation if canvas rendering, animation-heavy interactions, or game-scene tooling become necessary.

## Not Decided Yet

- Exact long-term deployment shape for the Nuxt Game App.
- Exact Phaser integration approach for the combat presentation.
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

- Continue with the next combat-engine feature or rule review. Solo campaign opponents and reward records are intentionally deferred.

## Rule Questions Still Open

These questions are listed in `docs/PROJECT.md` and can remain deferred while the local combat prototype is developed:

- What are the exact PvP and ranked reward formulas?
- What fixed reward values should each solo campaign opponent grant?

## Progression And Stat Formula Decisions

- Levels range from 0 to 50, quality ranges from 0 to 100, and total experience is the source of truth from which level is derived.
- The total experience threshold for a level is `100 * level^2`.
- Quality grants up to a 25% linear stat bonus, and item level grants 2% per level after level 1.
- Scalable item stats use `bonusPercent = max(0, level - 1) * 2 + floor(quality / 4)` and `resolvedStat = floor(baseStat * (100 + bonusPercent) / 100)`.
- Ring and gem progression scales damage. Monster progression scales damage and health. Spell progression scales direct-damage effect amounts.
- Hero maximum health is `30 + floor(30 * level / 50)`.
- Hero level does not modify combat energy, which remains based on each player's turn count and capped at 8.
- Hero speed is the sum of equipped rings' unscaled base speed values.
- Energy costs, cooldowns, speed, energy penalties, and cooldown penalties do not scale for now.
- Final ring energy cost and cooldown minimums remain 1.
- Positive integer stat calculations use floor rounding unless a specific rule overrides it.
- Campaign victory rewards are configured per opponent in content data. PvP and ranked reward formulas remain deferred until matchmaking and ranking are designed.

## Progression Implementation

- `packages/content/src/progression.ts` implements experience thresholds, level derivation, item stat scaling, hero health, and fixed spell penalty behavior.
- Player and item fixtures store total `experience` and no longer persist `level`.
- Ring and gem damage, monster damage and health, hero health, and spell direct-damage effects are resolved while building `BattleSetup`.
- `packages/content/src/balanceReport.ts` compares ring, gem, spell, and monster definitions across base (`level 1`, `quality 0`), mid (`level 10`, `quality 50`), and max (`level 50`, `quality 100`) progression profiles. It reports primary metrics and high outliers by item type and rarity, and the prototype setup screen renders the report for balancing review.
- Owned monster and spell instances are explicit inventory records referenced by gem enchantments.
- Resolved monster and spell definitions use battle-scoped instance IDs internally while combat events and summoned-monster IDs retain stable content IDs.
- Content version `prototype-2` introduced the migrated fixture and resolved-definition format; `prototype-3` is the current content collection version.
- Focused unit and integration tests cover thresholds, caps, floor rounding, invalid inputs, resolved setup stats, and runtime use of resolved enchantments.

## Content Reference Validation

- `packages/content/src/references.ts` validates relationships after Zod has validated individual object shapes.
- It rejects duplicate definition, player, setup, or inventory instance IDs.
- It verifies definition references and inventory ownership for rings, gems, monsters, and spells.
- It verifies both sides of equipped-ring relationships, the 10-ring limit, socket capacity, duplicate socket references, and single-ring gem usage.
- It verifies that gem enchantments reference one owned monster or spell instance and that an enchantment instance is not reused by multiple gems.
- It verifies battle setup participants, distinct players, initial monster definitions, participant ownership, and the three-monster initial board limit.
- `validateContent()` runs relational validation during prototype startup, before battle setup construction.
- Solo campaign opponent and reward design remains deferred at the user's request.

## Prototype Content Collection Proposal

- `docs/CONTENT_COLLECTION_PROPOSAL.md` proposes a balanced engine-testing collection built around current mechanics.
- It proposes 12 collectible rings, 12 collectible gems, 18 monsters, 6 direct-damage spells, and 70 materials.
- It preserves all current reusable content, proposes a small number of adjustments to existing base values, and adds missing element/rarity coverage.
- `trainingFlameBand` and `plainQuartz` are proposed as development-only fixture definitions.
- The implemented collection deliberately limits spells to direct damage until the engine supports more effect types.
- The collection is applied to executable JSON and both locale files as content version `prototype-3`.
- `docs/MATERIAL_COLLECTION_PROPOSAL.md` replaces the initial 12-material list with a detailed 70-material model derived from the historical SQLite `mats` table.
- The material model preserves ring, spell, gem, and monster crafting families, carries forward the four rarity price tiers, and provides a migration map for historical recipe IDs.
- Chemical element metadata follows IUPAC naming, symbols, and atomic numbers; non-element materials remain real minerals, gemstones, biomaterials, industrial materials, or physical substances.

## Recent Combat Rule Decisions

- Speed determines the starting player. If speed is tied, the lower-level hero starts. If speed and level are tied, an element choice duel decides the starting player.
- Each player has their own energy progression: 1 on that player's first turn, then +1 per own turn, capped at 8.
- Cooldowns decrement at the start of the controller's turn before actions.
- Players can use as many ready rings and ready monsters as energy, cooldowns, and rules allow.
- Rings and monsters can target heroes or monsters by default.
- Taunt prevents the opponent from targeting non-Taunt targets controlled by the Taunt owner's side.
- Taunt blocks opposing rings, monsters, and direct-damage spells unless a rule or effect explicitly allows otherwise.
- Enemy Taunt does not restrict a player targeting their own hero or their own monsters.
- A monster can have at most one skill.
- Shield negates the first complete incoming damage instance and then breaks permanently.
- Pierce transfers monster overkill damage to the target monster's controlling hero. Shield prevents the hit and its overflow, while first-turn hero protection prevents protected overflow damage.
- Haste causes a summoned monster to enter with cooldown 0 and allows it to act immediately.
- A monster's resolved cooldown is at least 1 after it acts; Haste affects only its initial summon cooldown.
- Rage activates permanently below 50% health and changes monster damage to `floor(baseDamage * 1.2)`.
- MultiHit attacks a hero normally. When a monster is targeted, it deals full damage to every monster controlled by that target's owner, including the attacker's own side when an allied monster is selected.
- MultiHit independently breaks each Shield that negates one of its hits. Taunt restricts the initial target but does not protect other monsters from the resulting MultiHit effect.
- Skill resolution order is current damage and elemental advantage, MultiHit target expansion, Shield, health damage, Pierce overflow, Rage activation, and monster destruction.
- Skill replay events should include `shieldBroken`, `pierceOverflow`, `hasteActivated`, `rageActivated`, and `multiHitResolved`.
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
- A ring's resolved cooldown cannot be lower than 1, preventing repeated use during the same turn.
- BattleNess should not include healing mechanics, to keep combat dynamic.
- The initial combat engine should support explicit spell effects and include three direct-damage test spells: Spark, Firebolt, and Ice Shard.
- The initial direct-damage spell can target heroes or monsters, allies or enemies, including self-damage or damaging allied monsters.
- Spells do not directly add damage to their triggering ring; they resolve after ring and gem damage and apply their own effects afterward.
- BattleNess does not have predefined hero classes. In combat, the hero is the logged-in player represented by account and progression data.
- In production, player identity, total experience, equipped rings, inventory item instances, socket counts, socketed gems, gem enchantments, and item quality should come from the database. Levels are derived from total experience.
- For the first combat prototype, fixture JSON files should simulate the database-owned player and inventory data.
- Health, damage, energy cost, cooldown, and similar combat values should be resolved from content definitions plus player-owned item instances.
- Initial content definitions should be split across separate JSON files under `packages/content/src/definitions/`, such as `rings.json`, `gems.json`, `monsters.json`, `spells.json`, and `materials.json`.
- Prototype fixtures should live under `packages/content/src/fixtures/` and include simulated players, inventories, and battle setups.
- The engine should keep a clear stat-input boundary so level, quality, and progression formulas are resolved without coupling them to core combat resolution.
- Engine tests should include both focused unit tests and full combat scenario tests loaded from JSON fixtures.
- Win-condition checks happen after each complete action resolution. If a hero is at 0 health at that point, the battle ends immediately.
- Content objects should use readable camelCase string IDs, such as `spark`, `firebolt`, and `iceShard`.
- Ring definitions should describe the base ring type only. Socket count, socketed gems, total experience, quality, ownership, and equipped state belong to player-owned ring instances.
- Gem definitions should describe the base gem type only. Gem enchantments, total experience, quality, and ownership belong to player-owned gem instances.
- Monster and spell definitions describe reusable content. Their player-owned instances hold total experience, quality, and ownership so progression can be resolved independently.
- Gem enchantments reference owned monster or spell instance IDs. The content/setup layer maps them to battle-scoped resolved definitions while combat-facing content IDs remain stable.
- The combat engine should not read JSON files directly. It should receive validated `BattleSetup` objects prepared from definitions, player fixtures or database rows, and inventory instances.
- `BattleSetup` should contain the two players, resolved combat stats, equipped ring instances, socketed gem instances, referenced definitions, and any deterministic seed required for the battle.
- Player actions sent to the combat engine should be represented as typed command objects, such as `{ type: "useRing", actorId, ringId, targetId }`.
- The combat engine should produce a detailed event log after each action for debugging, UI rendering, and future replay support.
- Battle state stores its immutable initial setup and every successfully applied command in `actionHistory`.
- Version 1 `BattleRecord` JSON stores format, rules and content versions, setup and seed, actions, result, and a canonical final-state checksum.
- Imported records are structurally validated and can be replayed one action at a time or to completion.
- Completed replays verify both the declared result and deterministic final-state checksum.
- The current FNV-1a checksum is intended for consistency checks, not cryptographic tamper protection.
- Randomness should be allowed only through deterministic seeded state. The initial rules do not require much randomness, but this protects future AI decisions, randomized rewards, shuffled/generated content, or random tie-breakers.
- Scenario test fixtures should support both single-action expectations and multi-action sequences.
- JSON content should be validated with a TypeScript-friendly schema validation library such as Zod.
- Initial implementation files should include content definitions under `packages/content/src/definitions/`, prototype fixtures under `packages/content/src/fixtures/`, and locale files under `packages/content/src/locales/`.
- Initial battle actions should include `chooseElement`, `useRing`, `useMonster`, `endTurn`, and `concede`.
- Initial event log types should include battle start/end, first-player choice request, element choices, tied element duels, final first-player choice, turn start/end, cooldown changes, ring use, energy spend, damage, spell cast, monster summon/use/destruction, and battle result.
- Scenario fixtures include `basicRingAttack`, `summonAndTaunt`, `spellSelfTargeting`, `skillShowcase`, `lowerLevelStart`, and `elementDuelStart`.
- `skillShowcase` is a development-only battle setup with three ready monsters per side for manually exercising all current skills.

## Elemental Design Direction

- Fire is oriented toward high damage and high cooldown time. Its associated special skills include Pierce and Rage.
- Electric is oriented toward low energy cost, high speed points, and low damage. Its associated special skills include Haste and MultiHit.
- Ice is oriented toward high health, low cooldown time, high energy cost, and low speed points. Its associated special skills include Taunt and Shield.

## Visual Color Reference

- Object colors: Ring uses pink, Gem uses cyan, Monster uses green, Spell uses magenta, and Material uses blue.
- Element colors: Electric uses yellow, Fire uses pink-red, and Ice uses light cyan.
- Rarity colors: Common uses white or light gray, Refined uses blue, Rare uses orange, and Epic uses purple.
- The prototype applies those rarity colors to ring, gem, and monster borders on the battle board, detail panels, setup preview, and manual action controls.
- Yellow selection outlines and red blocked-state indicators remain distinct from the rarity border.
- Localized elemental badges appear in the top-right corner of ring, gem, and monster cards across those same views.
- Socketed gem markers use elemental fill colors and rarity border colors simultaneously.
- Generated item artwork atlases now cover every current ring, gem, monster, spell, and material definition. Stable ID mappings and startup coverage validation live in `apps/prototype/src/itemAssets.ts`.
- The battle and setup interfaces render ring, gem, and monster atlas crops. Spell and material crops are mapped for future forge, inventory, and shop interfaces.
- The setup screen now exposes all 120 mapped assets in a localized, collapsible development collection.
- The setup screen now supports a Battle Lab mode for editing two loadouts and launching an unscripted battle.
- Battle Lab configurations support 1 to 10 rings per player, up to 3 gems per ring, editable levels and qualities, and optional spell or monster enchantments.
- `packages/content/src/battleLab.ts` resolves temporary editor instances through the same setup and progression path used by fixture-backed content. Loadout persistence is intentionally deferred.
- Battle Lab loadouts support strict JSON import/export and named browser-local presets. These presets are development-only and do not replace future account persistence.
- The editor includes resolved stat comparisons and diagnostic warnings for efficiency differences of at least 50% or speed differences of at least 4.
- The Battle Lab can run two deterministic greedy simulations that vary the preferred element-duel winner, respect current targeting and action constraints, and report timeouts at 500 actions.
- Content version `prototype-4` adds 48 initial forge recipes for collectible rings, gems, monsters, and spells. `trainingFlameBand` and `plainQuartz` remain development-only and have no recipes.
- Content version `prototype-5` renames the highest rarity tier from `legendary` to `epic`.
- Prototype recipes use exactly three quantity-1 materials from the matching crafting family. Common outputs use three common materials; refined outputs use one refined and two common materials; rare outputs use one rare, one refined, and one common material; epic outputs use one epic, one rare, and one refined material.
- Crafted prototype items are level 1 and quality 0. Crafted rings start with one socket. The setup screen includes a development forge panel with material stock controls, real consumption, restock, improvement actions, and crafted-instance output.
- The development forge persists credits, material stock, crafted item output, and the next crafted-instance sequence in browser `localStorage`.
- Development inventory starts with 1000 prototype credits. Quality improvement spends credits to add 5 quality points to a crafted item up to 100. Ring socket improvement spends credits to increase crafted rings up to 3 sockets. Improvement costs scale by rarity and current item state.
- Development inventory JSON can be exported, imported, and reset from the setup screen.
- Battle Lab supports both free-edit definitions and a development-inventory item source mode. The inventory-backed mode selects crafted ring, gem, spell, and monster instances and derives level, quality, and ring socket count from those instances.
- The setup screen includes a complete development inventory view with counters, all material quantities, crafted item cards, and type, rarity, and element filters.
- Development inventory rings can socket crafted gems up to their socket count. A crafted gem can be socketed into only one ring at a time.
- Development inventory gems can be enchanted by one crafted spell or monster. A crafted spell or monster can be used as only one gem enchantment at a time.
- Selecting a configured development inventory ring in Battle Lab automatically imports its socketed gems and gem enchantments.
- The setup screen includes a development loadout builder that selects up to 10 crafted rings, previews resolved speed, damage, energy, and cooldown efficiency, saves named loadouts in browser `localStorage`, and sends the current loadout to either Battle Lab player.
- Finished non-replay battles show claimable deterministic prototype rewards. Winner rewards add 150 credits plus `aluminium`, `hydrogen`, `pearl`, and `sand`; draw rewards add 90 credits plus `aluminium` and `pearl`. Claimed rewards are persisted into the browser-local development inventory.
- Source-backed Battle Lab items also gain XP when rewards are claimed. Equipped source-backed items gain 8 XP, and each actual ring use, socketed gem use, spell trigger, monster summon, or monster attack adds 20 XP to the matching crafted item instance. Hero XP is deferred.
- Finished battles show a deterministic result summary derived from the battle log: result, turn count, actions played, damage by player, rings used, spells cast, monsters summoned or used, item XP generated, and reward claim status. Imported replays can show the summary but cannot claim rewards.
- Development inventory cards show item level, XP toward the next level, and a progress bar. Loadout builder ring options and selected-ring summaries also show level and XP progress.
- Prototype combat stats render in green when their resolved value is above the base definition value, with a tooltip showing the base value.
- A full starter development loop DOM regression test now covers crafting a ring, gem, and spell; improving quality; socketing and enchanting; sending the inventory-backed ring to Battle Lab; using it in combat; claiming rewards; and verifying persisted credits, materials, item XP, quality, and combat summary output.
- Stat colors: Damage uses pink-red, Health uses red, Energy uses green, Energy Penalty uses pale green, Cooldown uses light cyan, Cooldown Penalty uses cyan, Quality uses orange, Speed uses yellow, Skill uses magenta, and Rarity uses purple.

## Battle Layout Direction

- The future battle screen should follow the user's sketch direction: heroes on the left, monster battlefield in the center, rings in a bottom row, and energy bars visible at top and bottom.
- Monster cards should clearly expose skill, damage, and health zones.
- Ring cards should clearly expose damage, energy/cost information, and socketed gems.
- The current prototype has a first sketch-inspired battle board, but it remains an engine/debug interface until the combat flow is stable enough for a final battle view.

## Important Agent Behavior

- Do not implement code unless the user asks to move from discussion into implementation.
- Do not assume old code should be preserved.
- Prefer documenting proposals and asking the user to confirm/correct them during the planning phase.
- When implementation starts, keep the combat rules engine deterministic and separate from UI/framework/database concerns unless the user decides otherwise.

## Latest Campaign Work

- Nuxt localization infrastructure is active with English and French catalogues, cookie-backed language selection, translated shared navigation and primary profile/dashboard surfaces, and tests that reject missing or empty locale entries. Remaining workflow copy still needs migration from hardcoded strings.
- All current Nuxt pages, components, layouts, hubs, and mock routes now resolve user-facing copy through English/French localization keys. Persisted content names and descriptions resolve through the shared content package catalogues, and an automated template guard rejects new hardcoded copy or accessible labels.
- Phase 6 progression presentation is complete: `/profile/progression`, inventory cards, and item details expose server-calculated hero/item levels, XP thresholds, quality, and scalable-stat bonuses.
- Spell targets are validated before ring resolution. If ring and gem damage destroys a valid target before an attached spell resolves, that spell expires without failing the whole action or retargeting another combatant.
- Content version `prototype-6` adds the first validated campaign catalogue: `emberTrial`, `stormInitiate`, and `frostGate`.
- Campaign opponents are game-owned content records rather than database inventory owners. Their nested ring, gem, and enchantment configuration can later be converted into engine battle instances.
- The initial unlock track is linear, every opponent is repeatable, and each defines fixed first-clear and repeat-victory rewards.
- `/api/campaign` and `/battle/campaign` now expose the data-backed catalogue, active-loadout readiness, opponent details, known loadouts, and reward previews.
- Campaign selection now starts an authoritative `campaign` battle. The server converts the selected content loadout into engine instances and stores the opponent ID as the battle mode reference.
- Campaign opponents take deterministic legal turns and respect energy, cooldown, and Taunt. Opponent rings remain hidden in the live player view.
- `CampaignProgress` persists victory counts. The first victory issues the opponent's first-clear reward and unlocks the next opponent; later victories issue the repeat reward. Campaign defeats grant only item participation and usage XP.
- The next recommended product area is campaign presentation and balance iteration, or the next non-campaign phase in `TODO.md`; the minimum campaign lifecycle itself is now complete.
