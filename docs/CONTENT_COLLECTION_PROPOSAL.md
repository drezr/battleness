# Prototype Content Collection

## Status

This document records the first coherent BattleNess content collection for engine testing and early balance work.

The collection is implemented in the executable JSON definitions and locale files as content version `prototype-3`.

The collection deliberately uses only mechanics currently supported by the combat engine:

- Ring and gem damage.
- Ring energy cost and cooldown.
- Gem energy and cooldown penalties.
- Monster damage, health, cooldown, speed, and one optional skill.
- Direct-damage spells with unrestricted hero or monster targeting.
- No healing.

## Design Goals

- Give every element a recognizable mechanical identity.
- Cover all four rarities for rings and gems.
- Provide enough monsters to exercise every implemented skill in varied stat profiles.
- Keep the spell set small until the engine supports more effect types.
- Provide material names for future forge and reward design without deciding recipes yet.
- Keep development-only fixtures out of the future collectible pool.

## Element Profiles

### Fire

- Highest direct damage.
- Higher cooldowns and meaningful penalties.
- Lower or moderate survivability.
- Pierce and Rage monsters.

### Electric

- Lowest energy requirements.
- Highest speed.
- Lower individual damage.
- Haste and MultiHit monsters.

### Ice

- Highest monster health.
- Lowest cooldowns.
- Higher energy requirements.
- Taunt and Shield monsters.

## Balance Reading

All proposed values are level 0, quality 0 base values.

Progression applies afterward:

```text
bonusPercent = level * 2 + floor(quality / 4)
resolvedStat = floor(baseStat * (100 + bonusPercent) / 100)
```

Useful comparison metrics include:

- Ring damage per energy.
- Ring damage per cooldown cycle.
- Gem damage added per penalty point.
- Monster damage per cooldown cycle.
- Monster health plus the tactical value of its skill.
- Total equipped-ring speed, because ring speed contributes to starting-player selection.

Monster speed is retained in the proposed definitions for consistency with current content, but it has no effect in the current combat engine and is not counted as a balance advantage. Its future purpose requires a separate decision.

Rarity may increase power, but higher-rarity objects should still have a cost, cooldown, speed, or specialization tradeoff. A higher rarity should not automatically dominate every lower-rarity option in every deck.

## Rings

The main collection contains 12 rings: one ring for each element and rarity combination.

| ID               | Name            | Element  | Rarity    | Damage | Energy | Cooldown | Speed | Status                               | Intended role                         |
| ---------------- | --------------- | -------- | --------- | -----: | -----: | -------: | ----: | ------------------------------------ | ------------------------------------- |
| `emberLoop`      | Ember Loop      | Fire     | Common    |      4 |      2 |        2 |     1 | Existing, adjust energy and cooldown | Entry fire damage                     |
| `cinderSignet`   | Cinder Signet   | Fire     | Refined   |      5 |      2 |        2 |     1 | New                                  | Efficient fire pressure               |
| `furnaceHalo`    | Furnace Halo    | Fire     | Rare      |      7 |      3 |        3 |     1 | New                                  | Heavy periodic attack                 |
| `solarCrown`     | Solar Crown     | Fire     | Legendary |      9 |      4 |        3 |     2 | New                                  | Maximum direct ring damage            |
| `sparkBand`      | Spark Band      | Electric | Common    |      2 |      1 |        1 |     3 | Existing                             | Fast, inexpensive action              |
| `ironCircle`     | Iron Circle     | Electric | Refined   |      3 |      1 |        1 |     2 | Existing                             | Efficient general-purpose ring        |
| `stormCoil`      | Storm Coil      | Electric | Rare      |      4 |      2 |        1 |     4 | Existing, adjust damage              | High-speed sustained pressure         |
| `tempestCircuit` | Tempest Circuit | Electric | Legendary |      5 |      2 |        1 |     5 | New                                  | Premium speed and cadence             |
| `frostSeal`      | Frost Seal      | Ice      | Common    |      3 |      2 |        1 |     0 | Existing                             | Entry ice ring                        |
| `rimeClasp`      | Rime Clasp      | Ice      | Refined   |      4 |      2 |        1 |     0 | New                                  | Reliable ice damage                   |
| `glacierRing`    | Glacier Ring    | Ice      | Rare      |      5 |      3 |        1 |     0 | Existing                             | High-cost repeated pressure           |
| `winterCrown`    | Winter Crown    | Ice      | Legendary |      7 |      4 |        1 |     1 | New                                  | Strong damage with high energy demand |

### Development-Only Ring

`trainingFlameBand` should remain available to deterministic scenarios but should not be part of the collectible pool. Its speed value is specifically useful for tied-speed element-duel tests.

## Gems

The main collection contains 12 gems: one gem for each element and rarity combination.

| ID                | Name              | Element  | Rarity    | Damage | Energy penalty | Cooldown penalty | Status                            | Intended role                                 |
| ----------------- | ----------------- | -------- | --------- | -----: | -------------: | ---------------: | --------------------------------- | --------------------------------------------- |
| `rubyShard`       | Ruby Shard        | Fire     | Common    |      2 |              0 |                1 | Existing, adjust cooldown penalty | Entry fire damage boost                       |
| `emberCore`       | Ember Core        | Fire     | Refined   |      3 |              1 |                1 | Existing                          | Balanced fire power                           |
| `infernoOpal`     | Inferno Opal      | Fire     | Rare      |      5 |              1 |                2 | New                               | Large damage with delayed reuse               |
| `sunforgeHeart`   | Sunforge Heart    | Fire     | Legendary |      7 |              2 |                2 | New                               | Maximum gem damage                            |
| `sparkPrism`      | Spark Prism       | Electric | Common    |      1 |              0 |                0 | Existing                          | Free low damage                               |
| `staticPearl`     | Static Pearl      | Electric | Refined   |      1 |              0 |                0 | Existing                          | Flexible enchantment carrier                  |
| `voltDiamond`     | Volt Diamond      | Electric | Rare      |      2 |              0 |                0 | New                               | Efficient damage without penalties            |
| `tempestEye`      | Tempest Eye       | Electric | Legendary |      3 |              0 |                1 | New                               | Strong electric gem with a small cadence cost |
| `frostChip`       | Frost Chip        | Ice      | Common    |      1 |              1 |                0 | Existing, adjust energy penalty   | Entry ice enchantment carrier                 |
| `rimeQuartz`      | Rime Quartz       | Ice      | Refined   |      2 |              1 |                0 | New                               | Moderate damage and energy demand             |
| `glacierPearl`    | Glacier Pearl     | Ice      | Rare      |      3 |              2 |                0 | New                               | High-cost damage without cooldown cost        |
| `absoluteZeroGem` | Absolute Zero Gem | Ice      | Legendary |      5 |              3 |                0 | New                               | Maximum ice gem damage                        |

### Development-Only Gem

`plainQuartz` should remain available as an unenchanted control gem for fixtures but should not be part of the collectible pool.

## Monsters

The main collection contains 18 monsters: six per element. Every monster has at most one skill.

### Fire Monsters

| ID              | Name           | Rarity    | Health | Damage | Cooldown | Speed | Skill  | Status   | Intended role                  |
| --------------- | -------------- | --------- | -----: | -----: | -------: | ----: | ------ | -------- | ------------------------------ |
| `emberImp`      | Ember Imp      | Common    |      3 |      4 |        2 |     1 | Rage   | Existing | Fragile escalating attacker    |
| `emberLancer`   | Ember Lancer   | Common    |      5 |      4 |        2 |     1 | Pierce | Existing | Entry overflow attacker        |
| `rageSprite`    | Rage Sprite    | Refined   |      4 |      5 |        2 |     1 | Rage   | Existing | Aggressive Rage threat         |
| `cinderRam`     | Cinder Ram     | Refined   |      6 |      5 |        2 |     1 | Pierce | New      | Durable Pierce attacker        |
| `magmaColossus` | Magma Colossus | Rare      |      7 |      7 |        3 |     0 | Rage   | New      | Slow heavy attacker            |
| `solarDrake`    | Solar Drake    | Legendary |      9 |      9 |        3 |     2 | Pierce | New      | Maximum single-target pressure |

### Electric Monsters

| ID              | Name           | Rarity    | Health | Damage | Cooldown | Speed | Skill    | Status   | Intended role              |
| --------------- | -------------- | --------- | -----: | -----: | -------: | ----: | -------- | -------- | -------------------------- |
| `stormHound`    | Storm Hound    | Common    |      4 |      2 |        1 |     3 | Haste    | Existing | Immediate low damage       |
| `voltMite`      | Volt Mite      | Common    |      3 |      1 |        1 |     4 | MultiHit | New      | Early board-wide pressure  |
| `arcStriker`    | Arc Striker    | Refined   |      5 |      2 |        1 |     3 | MultiHit | Existing | Stable MultiHit attacker   |
| `coilLynx`      | Coil Lynx      | Refined   |      5 |      3 |        1 |     4 | Haste    | New      | Immediate tempo attacker   |
| `thunderRaptor` | Thunder Raptor | Rare      |      6 |      3 |        1 |     5 | MultiHit | New      | Fast board control         |
| `tempestTitan`  | Tempest Titan  | Legendary |      8 |      4 |        1 |     5 | Haste    | New      | Premium immediate pressure |

### Ice Monsters

| ID              | Name           | Rarity    | Health | Damage | Cooldown | Speed | Skill  | Status   | Intended role             |
| --------------- | -------------- | --------- | -----: | -----: | -------: | ----: | ------ | -------- | ------------------------- |
| `iceGuardian`   | Ice Guardian   | Common    |      7 |      2 |        1 |     0 | Taunt  | Existing | Entry protector           |
| `snowSentinel`  | Snow Sentinel  | Common    |      6 |      2 |        1 |     0 | Shield | New      | Entry damage absorber     |
| `frostBeetle`   | Frost Beetle   | Refined   |      8 |      1 |        1 |     0 | Shield | Existing | Defensive shield wall     |
| `rimeGolem`     | Rime Golem     | Refined   |     10 |      2 |        1 |     0 | Taunt  | New      | Durable protector         |
| `shieldWisp`    | Shield Wisp    | Rare      |      9 |      1 |        1 |     0 | Shield | Existing | Persistent protected body |
| `eternalWarden` | Eternal Warden | Legendary |     14 |      3 |        1 |     0 | Taunt  | New      | Maximum defensive anchor  |

## Spells

The prototype collection contains only six spells because `dealDamage` is currently the only supported spell effect.

Each element receives one common and one rare spell. Refined and legendary spells should be added after additional effect types exist, rather than filling those rarities with repetitive damage variants.

| ID             | Name          | Element  | Rarity | Damage | Energy penalty | Cooldown penalty | Status   | Intended role             |
| -------------- | ------------- | -------- | ------ | -----: | -------------: | ---------------: | -------- | ------------------------- |
| `firebolt`     | Firebolt      | Fire     | Common |      4 |              1 |                0 | Existing | Basic fire burst          |
| `solarFlare`   | Solar Flare   | Fire     | Rare   |      7 |              1 |                2 | New      | Heavy delayed burst       |
| `spark`        | Spark         | Electric | Common |      2 |              0 |                0 | Existing | Free low damage           |
| `arcPulse`     | Arc Pulse     | Electric | Rare   |      3 |              0 |                1 | New      | Efficient electric damage |
| `iceShard`     | Ice Shard     | Ice      | Common |      3 |              1 |                0 | Existing | Basic ice damage          |
| `glacialSpike` | Glacial Spike | Ice      | Rare   |      5 |              2 |                0 | New      | High-energy ice burst     |

All six spells retain `target: "any"`, allowing deliberate self-damage and allied-monster damage.

## Materials

The initial 12-material proposal is replaced by a 70-material collection derived from the historical SQLite `mats` table and grounded in real-world chemistry and materials.

The detailed proposal is documented in `docs/MATERIAL_COLLECTION_PROPOSAL.md`.

It preserves the historical collection structure:

- 23 ring-crafting materials, primarily metallic chemical elements.
- 14 spell-crafting materials, primarily reactive nonmetals and noble gases.
- 17 gem-crafting materials based on real gemstones and minerals.
- 16 monster-crafting materials based on real geological, industrial, biological, or high-energy substances.

The proposal replaces eight fictional `bio*` and `mystic*` resources with real materials or chemical elements and defines migrations for historical recipe IDs.

## Proposed Collection Totals

| Category  | Main collection | Development-only | Total definitions after implementation |
| --------- | --------------: | ---------------: | -------------------------------------: |
| Rings     |              12 |                1 |                                     13 |
| Gems      |              12 |                1 |                                     13 |
| Monsters  |              18 |                0 |                                     18 |
| Spells    |               6 |                0 |                                      6 |
| Materials |              70 |                0 |                                     70 |

## Remaining Decisions

- Whether rarities above common require a minimum player level.
- Whether monster speed should remain descriptive metadata or gain a combat purpose in a future rule.
- Which new definitions should receive owned fixture instances for representative matchup scenarios.

## Recommended Next Steps

1. Produce a generated balance report using level 0, representative mid-game progression, and maximum progression.
2. Add focused scenario fixtures for representative elemental and rarity matchups.
3. Adjust statistical outliers before introducing additional spell effects.
4. Migrate historical recipes only when forge design resumes.
