# Production Spells Implementation Instructions

> Completed for the `production-items-v2` cutover. The pre-implementation inventory below is kept
> as historical handoff context; current state lives in `docs/STATE.md` and `docs/RESUME.md`.

This document hands the production spell implementation to a separate agent. The production artwork
and proposed catalogue are already preserved in the repository, but they are intentionally inactive.
The next task is a gameplay/content implementation, not an asset-generation task.

## Required Reading Order

Before changing code, read these files completely and in this order:

1. `docs/AGENT.md`
2. `docs/PROJECT.md`
3. `docs/TODO.md`
4. `docs/STATE.md`
5. `docs/SPELLS_IMPLEMENTATION_INSTRUCTIONS.md`
6. `packages/content/sources/production-spells-v1.json`
7. Root `README.md`
8. `docs/RESUME.md` last

Also inspect the current Git status and relevant diffs before editing. Preserve unrelated worktree
changes. The user handles commits and pushes unless they explicitly request Git operations.

## Current State And Safety Boundary

- Active content version: `production-items-v1`.
- Active spells: six engine-test definitions (`firebolt`, `solarFlare`, `spark`, `arcPulse`,
  `iceShard`, and `glacialSpike`).
- The current engine supports only the `dealDamage` spell effect.
- The current Game App and Dev Lab still render the active spells from
  `apps/*/public/assets/items/spells-atlas.png`.
- The proposed production catalogue contains 42 spells: 14 fire, 14 electric, and 14 ice.
- None of the 42 production IDs overlap the six active test IDs.
- The production atlas contains exactly those 42 IDs. All frames use a 300-by-300 logical source
  canvas; all are trimmed, 31 are rotated, and none are duplicated or outside the atlas bounds.
- The catalogue still declares `contentVersion: production-spells-v1-proposal` and
  `status: proposal-for-validation`. Do not silently treat proposal semantics as final where a
  gameplay decision is still required.

Dormant production artifacts:

- Catalogue: `packages/content/sources/production-spells-v1.json`
- Atlas metadata: `assets/spells/atlas/spells.json`
- Atlas image: `assets/spells/atlas/spells.png`
- Large source images: `assets/spells/large/<spellId>.png`
- Small source images: `assets/spells/small/<spellId>.png`

`packages/content/src/productionSpellAssets.test.ts` validates this dormant collection and explicitly
asserts that it has not replaced the active six-spell grid. Preserve that boundary until the engine,
content, persistence, and UI can switch together.

## Recommended Product Decisions

Confirm these with the user if implementation reaches a point where the repository does not already
record a final decision. The recommendations below are the preferred defaults.

### Collection Cutover

- Replace the six test spells rather than retaining them in the active collection.
- Archive their definitions, localization, recipes, and grid artwork under an explicit legacy path.
- Use `production-items-v2` as the new global content version because saved battle records and player
  instances refer to the complete active collection, not only to a spell sub-version.
- The final active collection should contain 289 definitions: 54 rings, 54 gems, 69 monsters,
  42 spells, and 70 materials.
- The final recipe catalogue should contain 219 recipes: one for each active ring, gem, monster, and
  spell. Verify unique spell material multisets with the existing recipe rules.

### Target Selection

The production catalogue permits zero or one selected spell target, but a ring may contain several
gems with enchantments that require incompatible targets. Reusing one ring target for every spell
would make valid loadouts unusable.

Recommended contract:

- Keep the ring's primary `targetId` for ring-plus-gem damage.
- Extend `useRing` with optional spell targets keyed by the socketed gem instance ID, for example
  `spellTargetIds: Record<gemInstanceId, combatTargetId>`.
- Reuse the primary target automatically when it satisfies a spell's target rule.
- Ask for an additional target only for a triggered spell whose target rule is not already met.
- Collect the complete atomic command before sending it to the server or engine.
- Validate every required target before spending energy or applying cooldown.
- Preserve the existing rule that a previously valid spell target may disappear during earlier
  ring resolution; that spell then expires without redirecting or failing the complete action.
- Spells with `selection: none` ignore explicit spell-target entries.

Do not solve this by forbidding mixed spell-target requirements on one ring. That would create a
hidden loadout restriction and reduce the value of the socket system.

### Determinism And Replay

- Every random choice must use battle-seeded deterministic state.
- Record the chosen target/result in structured battle events.
- Store all status, trigger, transformation, and temporary-copy state needed by the canonical final
  checksum.
- Bump replay/rules versions when the new command or event contracts require it.
- Keep old records readable through explicit legacy handling or mark them unreplayable without
  breaking battle history, following the existing obsolete-record behavior.

## Implementation Architecture

Prefer typed, declarative effect primitives with engine handlers over one hardcoded function per
spell. Some effects are domain operations rather than generic arithmetic, so a typed hybrid is
appropriate: definitions compose validated primitives while the engine owns deterministic handlers
for statuses, triggers, copying, transformation, destruction, skills, and cooldown mutation.

The supplied catalogue currently uses these effect primitives/combinators:

- `applyStatus`
- `captureStat`
- `conditionalPierceForAction`
- `copyMonster`
- `createTemporaryMonsterCopy`
- `dealDamage`
- `dealDamageToAll`
- `destroyAllMonsters`
- `destroyMonster`
- `forEachMonster`
- `grantSkill`
- `grantTemporaryShield`
- `ifTargetSurvives`
- `modifyCurrentCooldown`
- `randomTarget`
- `registerActionScopedTrigger`
- `registerTrigger`
- `removeStatuses`
- `setCurrentCooldown`
- `setCurrentCooldownForAll`
- `transformMonster`

Do not pass these unchecked JSON objects directly into the engine. Add discriminated TypeScript and
Zod unions, validate relational references and targeting, then resolve content definitions into the
battle setup boundary.

## Recommended Implementation Sequence

### 1. Approve And Normalize The Catalogue

- Review every targeting rule, gameplay description, implementation description, penalty, speed,
  duration, timing, and rarity in `production-spells-v1.json`.
- Resolve any ambiguity before encoding it as an engine rule.
- Preserve decimal energy/cooldown penalties in fixed-point tenths and floor their total only once at
  final ring resolution, consistent with current gem and monster penalties.
- Confirm that speed is a non-scaling power-budget stat.
- Once accepted, change proposal status/version deliberately; do not edit the dormant source merely
  to make a test pass.

### 2. Add Core Schemas And Battle State

- Extend `packages/engine/src/types.ts` with the approved effect, targeting, status, and trigger
  contracts.
- Extend `packages/content/src/schemas.ts` with matching strict Zod schemas.
- Represent temporary statuses with source identity, remaining owner-turn duration, tick timing, and
  any captured values required for deterministic resolution.
- Represent persistent and action-scoped triggers explicitly; do not hide them in process-local
  callbacks or closures.
- Define transformation, copied-monster, and temporary-copy provenance so events and replays remain
  understandable.
- Keep natural monster skills distinct from spell-granted skills and temporary Shield state.

### 3. Extend Atomic Ring Targeting

- Update the `useRing` command, engine validation, server DTOs, persisted action journal, replay
  parser, AI/legal-action generation, and client command builder.
- Validate the ring target and all required spell targets before mutation.
- Resolve socketed enchantments in stable socket order.
- Update campaign AI to choose deterministic legal spell targets.
- Ensure PvP never trusts client-resolved effects or target legality.

### 4. Implement Spells In Dependency-Ordered Slices

Implement and fully test one slice before beginning the next.

#### Slice A: Status And Area Foundations

- `burnI`, `burnII`, `burnIII`
- `shockI`, `shockII`, `shockIII`
- `freezeI`, `freezeII`, `freezeIII`
- `stompI`, `stompII`, `stompIII`
- `carbonize`, `electroshock`, `deepFreezing`
- `rimeLock`, `cleanse`

This slice establishes status application/reapplication, owner-turn ticks, area iteration, status
removal, current-cooldown modification, Shield interaction, elemental damage, destruction, and event
ordering.

#### Slice B: Skill And Cooldown Control

- `giftPierce`, `giftRage`, `giftMultiHit`, `giftTaunt`, `giftShield`
- `crystalSkin`
- `quickPulse`, `shortCircuit`, `zeroInterval`, `refresh`

Keep natural, permanently granted-for-this-battle, and temporary skills distinguishable. Confirm how
duplicate skill grants behave and make cooldown resets usable in the same turn as specified.

#### Slice C: Triggers And Conditional Effects

- `damageOnKill`, `energyOnKill`, `cooldownOnKill`
- `pierceLegacy`, `bloodflame`, `funeralBrand`, `lastBreath`

Define trigger lifetime, source ownership, once-per-action behavior, captured values, and ordering
relative to Shield, Rage, Pierce, monster destruction, hero defeat, and other triggers. Prevent
recursive or duplicate trigger settlement.

#### Slice D: Destruction, Randomness, Copying And Transformation

- `devotion`, `sacrifice`, `destruction`, `chainExplosion`
- `copy`, `transmute`, `arcRelay`, `zerakaiProtocol`

Record deterministic random choices. Define whether copied/transformed monsters inherit current or
base health, cooldown, statuses, skills, source IDs, progression, and ownership exactly as specified
by the approved catalogue. Temporary copies need explicit expiry/removal rules and unique runtime
instance IDs.

### 5. Integrate Active Content

Only after all 42 definitions validate and their engine behavior is covered:

- Replace `packages/content/src/definitions/spells.json` with generated active definitions.
- Add English and French names plus player-facing gameplay descriptions.
- Extend the production content generator to consume the approved 42-spell source.
- Generate and validate all 42 spell recipes while retaining unique material multisets.
- Update balance reporting for the new spell metrics and progression behavior.
- Update fixtures, Battle Lab defaults, campaign opponents, onboarding, rewards, tests, and every
  hardcoded reference to the six old IDs.
- Choose a new onboarding starter spell. `firebolt` is currently granted by onboarding version 2;
  bump onboarding content/version rather than leaving a stale definition reference.
- Update the asset bible to the final 42-spell collection and the new global counts/version.

### 6. Activate The Production Atlas Atomically

Do this in the same implementation series as the active definition cutover:

- Import normalized metadata as `packages/content/src/atlases/spells.json`.
- Copy `assets/spells/atlas/spells.png` to
  `apps/web/public/assets/items/spells.png` and
  `apps/prototype/public/assets/items/spells.png`.
- Switch `packages/content/src/itemAtlases.ts` from the six-cell grid to the packed spell atlas.
- Reuse the existing trimmed/rotated packed-frame renderer.
- Validate exact coverage against the 42 active definitions.
- Archive and remove the active public `spells-atlas.png` copies only after replacements pass.
- Update `productionAtlases.spells` in the asset bible from `produced-inactive` to `imported`.

### 7. Persistence And Environment Cutover

The six old IDs may exist in player inventory, sockets/enchantments, loadouts, fixtures, onboarding,
campaign data, rewards, market history, or persisted battle records.

- Audit every database and JSON reference before removing active definitions.
- Preserve account/auth/profile records while migrating or resetting incompatible gameplay state.
- For staging, take and verify a PostgreSQL backup, test its restore, then use the documented guarded
  gameplay reset if replacement mapping is not worthwhile.
- Never deploy a definition cutover that leaves an owned instance referencing an unknown spell.
- Keep historical snapshots/replays compatible through their content version or explicitly
  unavailable without breaking unrelated reads.
- Production data migration and DNS/release actions require the normal deployment runbook and user
  coordination.

### 8. Player-Facing Presentation

- Render localized gameplay descriptions, targeting requirements, penalties, speed, rarity, and
  artwork in Inventory, Forge, Market, Battle Info, and relevant detail panels.
- Add accessible status and trigger feedback to live combat.
- Add structured localized combat-log messages for every new event.
- Make multi-spell target collection understandable on mobile and keyboard-accessible.
- Preserve reduced-motion behavior and never encode status only through color or animation.

## Required Test Coverage

At minimum, add:

- Schema tests for every effect discriminator and invalid combination.
- Exact catalogue/reference/locale/recipe/atlas coverage tests.
- Focused engine tests for every primitive and ordering edge case.
- One scenario test per production spell, plus interaction scenarios where effects compose.
- Status reapplication, tick, cleanse, Shield, Rage, Pierce, destruction, and battle-end ordering.
- Deterministic random-target and replay checksum tests.
- Multiple targeted spells on one ring, including incompatible target classes.
- Target disappearance during earlier ring or enchantment resolution.
- Same-turn cooldown reset and repeated monster action behavior.
- Unique runtime IDs for copies, transformations, summons, destruction, and replacement.
- Server integration tests proving authority, ownership, target validation, and atomic rollback.
- Campaign AI, PvP action journal, reconnect, history, and replay regression coverage.
- Stale player-state migration/reset coverage for all six retired IDs.
- Dev Lab and Game App DOM coverage for all 42 assets and targeting flows.

Run the standard full gate before handoff:

```sh
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @battleness/prototype build
pnpm --filter @battleness/web build
```

PostgreSQL schema or persistence changes additionally require the documented PostgreSQL generation,
migration, drift, and transactional smoke checks.

## Definition Of Done

The production spell work is complete only when:

- all 42 catalogue definitions are approved, strictly validated, localized, and active;
- all effects resolve authoritatively and deterministically;
- multi-enchantment targeting works in engine, server, AI, replay, and UI;
- every spell has focused and scenario coverage;
- recipes, balance reports, onboarding, fixtures, campaign, and persistence reference only valid IDs;
- the production packed atlas is active in both apps with exact frame coverage;
- stale player data cannot trigger unknown-definition failures;
- old battle history fails gracefully or replays through explicit legacy support;
- the complete validation/build/PostgreSQL gates pass;
- staging backup, reset/migration, authenticated smoke, logs, and rollback checks pass before any
  production promotion.

Do not activate the 42-spell atlas as an isolated first change. The safe boundary is already in
place: assets are preserved and validated now, while active definitions, engine behavior, data
migration, and public rendering must switch together later.
