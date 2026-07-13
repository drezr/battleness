# Project

## BattleNess

BattleNess is a browser-based, mobile-first, turn-based combat game inspired by games like Hearthstone.

The project is being rebuilt cleanly from the existing work. Technical decisions are intentionally being discussed before implementation starts.

## Game Summary

Rules source: https://battleness.com/rules.html

The game is a one-versus-one, turn-based combat game. Each player controls a hero and equips up to 10 rings used during combat. The goal is to reduce the opposing hero's health to 0.

### Core Combat Concepts

- Heroes have speed, health, and energy.
- Speed determines which player starts.
- Health reaching 0 causes defeat.
- Energy is restored at the start of each turn. Combat energy starts at 1 on turn 1, increases by 1 each turn, and caps at 8.
- Rings are the main actions available to a hero.
- A ring has an energy cost, cooldown, damage, and 1 to 3 sockets.
- Gems are placed into ring sockets and add damage.
- Gems can be enchanted by a monster or a spell.
- When a ring is used, the gems inside it can summon their monsters or cast their spells.
- Monsters fight alongside the hero and have damage, health, cooldown, and at most one optional skill.
- Spells have unique effects.
- Monsters normally enter play with cooldown 1, so they cannot act until the next turn. Haste monsters are the exception and enter ready.
- The starting player cannot damage the opposing hero on the first turn, but can still summon monsters and cast spells.

### Progression And Item Concepts

- Heroes, rings, gems, monsters, and spells have experience and levels.
- Levels range from 0 to 50.
- Hero levels increase health. Combat energy is independent from hero level.
- Ring and gem levels increase damage.
- Monster levels increase damage and health.
- Spell levels increase direct-damage effect amounts. Energy and cooldown penalties do not scale for now.
- Rings, gems, monsters, and spells have quality from 0 to 100%.
- A hero's speed is the sum of the base speed values of their equipped rings.
- Elemental types are electric, fire, and ice.
- Electric beats fire, fire beats ice, and ice beats electric.
- Gems, monsters, and spells can add energy and cooldown penalties to the ring that contains them.
- Item rarity, from least rare to most rare, is common, refined, rare, and epic.

### Economy And Modes

- Credits are the virtual currency.
- Combat rewards can include experience, credits, and materials.
- Solo campaign battles are against the game and unlock progressively stronger opponents.
- Player-versus-player battles reward players based on level and opponent level.
- The forge supports crafting and improving items.
- Crafting combines materials according to recipes to create rings, gems, monsters, or spells.
- Improving can increase a ring's sockets or an item's quality by spending credits.
- The shop lets players buy materials and sell items.
- A future player market may allow players to sell and buy items from each other.

## Proposed Glossary

This glossary is a proposal based on the current rules page. Terms should be corrected as the game design becomes more precise.

### Combat

- Battle: A one-versus-one match between two players or between one player and the game.
- Turn: A player's opportunity to perform actions using available energy and ready combat objects.
- Starting Player: The player whose hero has the higher speed and acts first. This player cannot damage the opposing hero during the first turn.
- Action: A player decision during a turn, such as using a ring, using a monster, or triggering another legal combat effect.
- Target: The hero or monster selected to receive damage or another effect.
- Damage: The amount of health removed from a target.
- Health: The value that represents how much damage a hero or monster can take before defeat or destruction.
- Energy: The turn resource spent to use rings. Combat energy starts at 1 on turn 1, increases each turn, is restored at the start of each turn, and caps at 8.
- Cooldown: The number of turns before a ring or monster can be used again.
- Speed: A hero stat derived from equipped item speed points. It determines which player starts the battle.
- Win Condition: A player wins when the opposing hero reaches 0 health.

### Actors

- Player: A human account participating in combat, progression, inventory, economy, and matchmaking.
- Hero: The main combat character controlled by a player. A hero has health, energy, speed, and up to 10 equipped rings.
- Monster: A summoned combat actor that fights alongside a hero. A monster has damage, health, cooldown, elemental type, and optional skill.
- Opponent: The other combat side, either another player in PvP or the game in solo campaign.

### Items

- Item: A collectible game object with rarity. Rings, gems, monsters, spells, and materials are item types.
- Ring: An equipped item used as a main combat action. A ring has damage, energy cost, cooldown, sockets, quality, level, speed points, and elemental type.
- Socket: A slot inside a ring where a gem can be placed. A ring has 1 to 3 sockets.
- Gem: An item placed into a ring socket. A gem adds damage and can be enchanted with a monster or spell.
- Enchantment: The monster or spell contained inside a gem.
- Spell: An item that gives a gem a specific effect when its ring is used.
- Material: An item used by crafting recipes to create rings, gems, monsters, or spells.
- Recipe: A crafting definition that combines materials into a specific output item.
- Equipment: The set of items currently worn or used by a hero, especially the hero's rings and socketed gems.
- Inventory: The player's owned items that are not necessarily equipped.

### Item Stats

- Rarity: An item's scarcity and value tier. Current rarity order is common, refined, rare, epic.
- Quality: A 0 to 100% item value that improves some item characteristics.
- Level: An item or hero progression value from 0 to 50.
- Experience: Progress earned by heroes or items that contributes to level.
- Speed Point: An item stat that contributes to the hero's speed.
- Elemental Type: An item's element. Current elements are electric, fire, and ice.
- Energy Penalty: A value from gems, monsters, or spells that contributes to a ring's energy cost.
- Cooldown Penalty: A value from gems, monsters, or spells that contributes to a ring's cooldown.
- Skill: A monster's optional special ability.

### Elements

- Electric: An elemental type that deals increased damage to fire.
- Fire: An elemental type that deals increased damage to ice.
- Ice: An elemental type that deals increased damage to electric.
- Elemental Advantage: The relationship where electric beats fire, fire beats ice, and ice beats electric.

### Elemental Design Direction

- Fire is oriented toward high damage and high cooldown time. Its associated special skills include Pierce and Rage.
- Electric is oriented toward low energy cost, high speed points, and low damage. Its associated special skills include Haste and MultiHit.
- Ice is oriented toward high health, low cooldown time, high energy cost, and low speed points. Its associated special skills include Taunt and Shield.

### Visual Color Reference

- Object colors: Ring uses pink, Gem uses cyan, Monster uses green, Spell uses magenta, and Material uses blue.
- Element colors: Electric uses yellow, Fire uses pink-red, and Ice uses light cyan.
- Rarity colors: Common uses white or light gray, Refined uses blue, Rare uses orange, and Epic uses purple.
- Stat colors: Damage uses pink-red, Health uses red, Energy uses green, Energy Penalty uses pale green, Cooldown uses light cyan, Cooldown Penalty uses cyan, Quality uses orange, Speed uses yellow, Skill uses magenta, and Rarity uses purple.

### Item Artwork

- The prototype uses generated sprite atlases for all current rings, gems, monsters, spells, and materials.
- Atlas cell order is mapped to stable content definition IDs in `apps/prototype/src/itemAssets.ts`.
- The prototype validates artwork coverage at startup so newly added definitions cannot silently ship without an asset mapping.
- Ring, gem, and monster artwork is rendered in the current battle and setup cards. Spell and material artwork is ready for future inventory, forge, and shop views.
- The setup screen includes a collapsible development collection that renders every current asset by category.

### Battle Lab

- The prototype setup screen can switch between scripted scenario fixtures and an editable Battle Lab.
- The Battle Lab supports two configurable players, 1 to 10 rings per player, up to 3 gems per ring, and optional spell or monster enchantments for each gem.
- Player, ring, gem, spell, and monster levels and qualities are editable within the progression limits.
- `packages/content/src/battleLab.ts` converts the editor configuration into temporary player and inventory instances, then resolves them through the regular `createBattleSetup` pipeline.
- Battle Lab configurations can be serialized to and imported from strictly validated JSON. Imports also resolve content references before replacing the active configuration.
- Named Battle Lab presets are stored in browser `localStorage` under a versioned key. This is development convenience only; account-backed saved loadouts remain part of future inventory and backend work.
- The Battle Lab comparison view reports resolved health, speed, total ring damage, total energy cost, damage per energy, and damage per cooldown.
- Current balance warnings are diagnostic heuristics, not game rules: they flag a relative efficiency difference of at least 50% or a speed difference of at least 4.
- The Battle Lab batch runner executes two deterministic variants, each favoring a different player if an element duel is required to choose the starting player.
- Its greedy diagnostic policy prioritizes the highest immediate-damage ready action, respects energy, cooldown, first-turn hero protection, and Taunt, and ends the turn when no action is available.
- Simulations stop after 500 actions and report a timeout instead of assuming a result. The policy is a balance aid, not a human-play or AI-strength model.

### Battle Layout Direction

- The battle screen should eventually follow the user's sketch direction: heroes anchored on the left, the monster battlefield occupying the center, rings arranged as a bottom hand or equipment row, and energy bars visible at the top and bottom.
- Monster cards should expose skill, damage, and health zones clearly.
- Ring cards should expose damage and energy/cost information, with socketed gems visible along the bottom of each ring.
- Ring, gem, and monster frames identify rarity consistently: common uses light gray, refined uses blue, rare uses orange, and epic uses purple.
- Selection, targeting, and blocked-state indicators remain separate from rarity framing so interaction state does not replace item identity.
- Ring, gem, and monster cards also display a localized elemental badge in the top-right corner: Electric uses yellow, Fire uses pink-red, and Ice uses light cyan.
- Compact socketed gems use their elemental fill color while retaining rarity on the surrounding border.
- The current prototype now includes a first sketch-inspired battle board, but it is still a functional prototype/debug interface rather than the final battle layout.

### Progression And Economy

- Credit: The virtual currency used to buy, sell, craft, and improve items.
- Reward: The result granted after combat, such as experience, credits, and materials.
- Campaign: Solo mode where the player fights game-controlled opponents and unlocks stronger opponents over time.
- PvP: Player-versus-player mode where two players fight each other.
- Forge: The system used to craft and improve items.
- Crafting: The forge action that consumes materials according to a recipe to create a specific item.
- Improvement: The forge action that spends credits to increase item quality or increase a ring's socket count.
- Shop: The game vendor where players can buy materials and sell items.
- Player Market: A future economy system where players can list items for sale and buy items listed by other players.
- Initial prototype recipes always consume exactly three quantity-1 materials from the matching crafting family.
- Material rarities scale by crafted item rarity: common items use three common materials; refined items use one refined and two common materials; rare items use one rare, one refined, and one common material; epic items use one epic, one rare, and one refined material.
- Initial crafted items are level 1 and quality 0. Crafted rings start with one socket.
- The prototype development forge persists credits, material stock, crafted item instances, and the next crafted-instance sequence in browser `localStorage`.
- Development inventory starts with 1000 prototype credits. Quality improvement spends credits to add 5 quality points to a crafted item up to 100. Ring socket improvement spends credits to increase crafted rings up to 3 sockets. Improvement costs scale by rarity and current item state.
- Development inventory JSON can be exported, imported, or reset from the setup screen. This is a prototype tool and does not replace future account inventory persistence.
- Battle Lab can use either free-edit definitions or development inventory instances as its item source. When development inventory is selected, ring, gem, spell, and monster selections are made from crafted instances, and level, quality, and ring socket count are derived from those instances.
- The setup screen exposes a complete development inventory view with total counters, all material stock quantities, crafted item cards, and type, rarity, and element filters.
- Development inventory rings can socket crafted gems up to their socket count. A crafted gem can be socketed into only one ring at a time.
- Development inventory gems can be enchanted by one crafted spell or monster. A crafted spell or monster can be used as only one gem enchantment at a time.
- When Battle Lab uses a development inventory ring, its socketed gems and those gems' enchantments are imported automatically into the loadout.
- The setup screen includes a development loadout builder for choosing up to 10 crafted rings, previewing resolved speed, damage, energy, and cooldown efficiency, saving named loadouts in browser `localStorage`, and sending the selected loadout to either Battle Lab player.
- Development inventory crafted item cards display derived level, current XP, next-level XP, and an XP progress bar. Loadout builder ring rows and selected-ring summaries also expose level and XP progress.

## Proposed Game Rules Specification

This section separates executable game rules from implementation decisions. It is a proposal based on the current rules page and should be corrected before implementation.

### Battle Setup

- A battle has exactly two sides.
- Each side has one hero.
- Each hero may equip up to 10 rings.
- Each ring may contain 1 to 3 gems, depending on its socket count.
- Each gem may contain either no enchantment, one monster enchantment, or one spell enchantment.
- A hero's battle speed is calculated from speed points on equipped items.
- The side with the highest hero speed becomes the starting player.
- If both heroes have equal speed, the lower-level hero starts.
- If both heroes have equal speed and equal level, starting player is decided by an element choice duel at battle start using fire, ice, and electric. Electric beats fire, fire beats ice, and ice beats electric.
- If both players choose the same element in the element choice duel, the duel repeats until there is a winner.
- Both heroes begin battle with their computed maximum health.
- All rings begin battle ready.
- No monsters are in play at battle start during normal gameplay. Development fixtures may preload monsters for isolated rule testing.

### Turn Structure

- Players alternate turns.
- At the start of each turn, the active player's available energy is restored for that turn.
- Each player has their own turn energy progression. A player's available energy starts at 1 on that player's first turn, increases by 1 on each later turn that player takes, and caps at 8.
- The active player may perform legal actions while they have available actions and resources.
- The active player may end their turn voluntarily.
- When the active player ends their turn, the other player becomes active.
- At the start of the active player's turn, that player's cooldown counters decrement before actions are taken.

### Legal Player Actions

- Use a ready ring if the active hero has enough energy to pay its current energy cost.
- Use any number of ready rings and ready monsters controlled by the active player, as long as action-specific rules, energy, cooldowns, targeting, and other restrictions allow them.
- End the turn.
- Other action types are not defined yet.

### Ring Use

- A ring can be used only by the active player.
- A ring can be used only if it is ready.
- A ring can be used only if the active hero can pay its current energy cost.
- Using a ring spends its energy cost.
- Using a ring puts that ring on cooldown.
- Using a ring applies the ring's damage and the damage from its gems to a legal target, unless damage is prevented by another rule.
- Using a ring triggers the enchantments contained by its gems.
- Ring use resolves in this order: pay energy, put the ring on cooldown, apply ring and gem damage, trigger enchantments in socket order, then check win conditions.

### Gems And Enchantments

- A gem placed in a ring adds damage to that ring.
- A gem may be enchanted by a monster or a spell.
- When a ring is used, each gem's enchantment triggers.
- A monster enchantment summons that monster to fight alongside the hero.
- A spell enchantment applies that spell's effect.
- Multiple socketed gems trigger in socket order.
- If a monster enchantment summons a monster that is already in play, it creates a new monster instance as long as the controller's monster board is not full.
- If a ring's damage kills its target before that ring's enchantments trigger, enchantments still trigger unless they specifically require the dead target.

### Monsters

- A monster is controlled by the player who summoned it.
- A monster has health, damage, cooldown, elemental type, and optionally a skill.
- A monster can have at most one skill.
- A monster is destroyed and removed immediately after the effect that reduces its health to 0.
- A summoned monster normally enters play with cooldown 1.
- Because ordinary summoned monsters enter with cooldown 1, they cannot act on the same turn they are summoned. Haste overrides this rule.
- A monster can damage a legal hero or monster target when it is ready and its controller uses it.
- Using a monster puts that monster on cooldown.
- Each side can control up to 3 monsters.
- If a monster enchantment summons a monster that is already in play, it creates a new monster instance as long as the controller's monster board is not full.
- If a monster enchantment would summon a monster while the controller already has 3 monsters, the summon fails without cancelling the rest of the action.
- Rings and monsters can target heroes or monsters by default.
- Some monsters may have Taunt. If a player controls one or more monsters with Taunt, the opponent cannot target that player's non-Taunt targets with rings, monsters, or direct-damage spells unless a rule or effect explicitly allows it.
- If a player controls multiple monsters with Taunt, the opponent may choose any of those Taunt monsters as the target.
- Enemy Taunt does not restrict a player who targets their own hero or their own monsters.
- Shield starts active when the monster is summoned. It completely negates the first incoming damage instance, regardless of its amount, and is then permanently broken.
- Pierce transfers overkill damage from a monster target to that monster's controlling hero. The overflow equals resolved damage minus the monster's remaining health.
- Shield prevents the complete hit before Pierce overflow can occur. First-turn hero protection also prevents Pierce overflow from damaging the protected hero.
- Haste causes a summoned monster to enter play with cooldown 0, allowing it to act during the turn in which it was summoned.
- Rage activates permanently when the monster's health falls strictly below 50% of its maximum health. Its damage becomes `floor(baseDamage * 1.2)`.
- MultiHit behaves as a normal attack when targeting a hero. When targeting a monster, it deals the monster's full resolved attack damage to every monster controlled by the target monster's owner.
- MultiHit also applies when an allied monster is selected, causing every monster on that allied side to be hit.
- Each Shield hit by MultiHit independently negates its hit and is then broken.
- Taunt still restricts the initial MultiHit target, but the resulting MultiHit effect can damage non-Taunt monsters controlled by the same player.
- Monster skill resolution uses the following order: resolve current damage and elemental advantage, expand MultiHit targets when applicable, resolve Shield for each target, apply health damage, apply Pierce overflow, activate Rage on surviving damaged monsters, then remove destroyed monsters.
- Dedicated skill events should include `shieldBroken`, `pierceOverflow`, `hasteActivated`, `rageActivated`, and `multiHitResolved`.

### Spells

- A spell has a specific effect.
- BattleNess should not include healing mechanics, to keep combat dynamic.
- Spell level increases direct-damage effect amounts. Spell energy and cooldown penalties stay fixed for now.
- A spell triggers when the ring containing its gem is used.
- The initial combat engine should support explicit spell effects and include three direct-damage test spells: Spark, Firebolt, and Ice Shard.
- Spell effects must be specified as explicit engine effects, not free-form text.
- The initial direct-damage spell can target heroes or monsters, allies or enemies. The player decides how to use it, including self-damage or damaging their own monsters.
- Spells do not directly add damage to the ring that triggers them. They resolve after ring and gem damage and can apply their own effects afterward.

### Cooldowns

- Rings and monsters can have cooldown values.
- A ring's resolved cooldown must be at least 1, so a ring cannot be used more than once during the same turn.
- A monster's resolved cooldown must be at least 1 after it acts, so it cannot be used repeatedly during the same turn. Haste only changes its initial summon cooldown.
- A ring or monster on cooldown cannot be used.
- A newly summoned monster starts with cooldown 1 unless it has Haste.
- A player's cooldown counters decrement at the start of that player's turn, before actions are taken.
- Cooldown values should not go below 0.

### Energy

- Energy is restored at the start of each turn.
- Energy follows each player's own turn count: 1 on that player's first turn, 2 on that player's second turn, and so on until the cap of 8.
- Energy not spent during a turn does not carry over unless a later rule changes this.
- A ring's current energy cost is based on its own energy value plus energy penalties from contained gems, monsters, and spells.
- A ring's current energy cost cannot be lower than 1.
- Exact rounding rules for future cost modifiers are not defined yet.

### Prototype Stats

- BattleNess does not have predefined hero classes. In combat, the hero is the logged-in player represented by account and progression data.
- In production, player identity, total experience, equipped rings, inventory item instances, socket counts, socketed gems, gem enchantments, and item quality should come from the database. Levels are derived from total experience.
- For the first combat prototype, fixture JSON files should simulate the database-owned player and inventory data.
- Health, damage, energy cost, cooldown, and similar combat values should be resolved from content definitions plus player-owned item instances.
- The engine should keep a clear stat-input boundary so level, quality, and progression formulas are resolved without coupling them to core combat resolution.
- Initial content definitions should be split across separate JSON files under `packages/content/src/definitions/`, such as `rings.json`, `gems.json`, `monsters.json`, `spells.json`, and `materials.json`.
- Prototype fixtures should live under `packages/content/src/fixtures/` and include simulated players, inventories, and battle setups.
- Engine tests should include both focused unit tests and full combat scenario tests loaded from JSON fixtures.

### Progression And Stat Resolution

- Levels range from 0 to 50 and quality ranges from 0 to 100.
- Total experience is the progression source of truth. A hero or item's level is derived from total experience rather than maintained as an independent mutable value.
- The total experience threshold for a level is `100 * level^2`. Level 1 requires 100 total experience, level 2 requires 400, level 10 requires 10,000, and level 50 requires 250,000.
- Quality grants a linear stat bonus from 0% at quality 0 to 25% at quality 100.
- Item level grants a linear stat bonus of 2% per level, up to 100% at level 50.
- Level and quality bonuses are additive. For scalable item stats, `bonusPercent = max(0, level - 1) * 2 + floor(quality / 4)` and `resolvedStat = floor(baseStat * (100 + bonusPercent) / 100)`.
- For example, a base stat of 4 at level 10 and quality 60 resolves to `floor(4 * 133 / 100)`, or 5.
- Ring and gem progression scales damage. Monster progression scales damage and maximum health. Spell progression scales direct-damage effect amounts.
- Energy costs, cooldowns, speed, energy penalties, and cooldown penalties do not scale for now.
- A hero's maximum health is `30 + floor(30 * level / 50)`. Maximum health is 30 at level 0, 45 at level 25, and 60 at level 50.
- Hero level does not change turn energy. Each player's energy still progresses from 1 to 8 according to that player's own turn count.
- Hero speed is the sum of the unscaled base speed values of equipped rings. Level and quality do not modify speed.
- Spell energy and cooldown penalties remain equal to their base values until a future balancing pass explicitly changes this rule.
- Positive integer stat calculations use floor rounding unless a more specific combat rule says otherwise.
- Progression formulas belong in the content/setup layer. The combat engine continues to receive fully resolved values through `BattleSetup`.
- Content balance reports compare item definitions across base (`level 1`, `quality 0`), mid (`level 10`, `quality 50`), and max (`level 50`, `quality 100`) progression profiles. Primary metrics are damage per energy for rings, damage per penalty for gems and spells, and health plus damage for monsters. High outliers are flagged within matching item type and rarity groups.

### Engine And Content Format

- Content objects should use readable string IDs.
- JSON content IDs should use camelCase slugs, such as `spark`, `firebolt`, and `iceShard`, to stay ergonomic in TypeScript and consistent with JSON field naming.
- Ring definitions should describe the base ring type only. Socket count, socketed gems, total experience, quality, ownership, and equipped state belong to player-owned ring instances.
- Gem definitions should describe the base gem type only. Gem enchantments, total experience, quality, and ownership belong to player-owned gem instances.
- Monster and spell definitions describe reusable content. Player-owned monster and spell instances hold total experience, quality, and ownership so their progression can be resolved independently.
- Gem enchantments reference owned monster or spell instance IDs. The content/setup layer converts them to battle-scoped resolved definitions while preserving stable content IDs in combat events and summoned-monster IDs.
- The combat engine should not read JSON files directly. It should receive validated `BattleSetup` objects prepared from definitions, player fixtures or database rows, and inventory instances.
- `BattleSetup` should contain the two players, resolved combat stats, equipped ring instances, socketed gem instances, referenced definitions, and any deterministic seed required for the battle.
- Player actions sent to the combat engine should be represented as typed command objects, such as `{ type: "useRing", actorId, ringId, targetId }`.
- The combat engine should produce a detailed event log after each action for debugging, UI rendering, and future replay support.
- `BattleState` keeps the immutable initial setup and an ordered `actionHistory` containing only successfully applied actions.
- A version 1 `BattleRecord` contains its format identifier, format version, rules version, content version, initial setup and seed, ordered actions, declared result, and canonical final-state checksum.
- Battle records serialize as readable JSON. Import validates the record structure and action shapes before execution.
- Deterministic replay rebuilds the battle from the initial setup, reapplies every action, then verifies both the declared result and final-state checksum.
- The current checksum is a canonical FNV-1a 32-bit consistency check for deterministic debugging, not a security or anti-tampering signature.
- Randomness should be allowed only through deterministic seeded state, never through untracked runtime randomness such as direct `Math.random()` calls.
- The initial rules do not require much randomness; this rule mainly protects future systems such as AI decisions, randomized rewards, shuffled/generated content, or random tie-breakers.
- Scenario test fixtures should support both single-action expectations and multi-action sequences.
- JSON content should be validated with a TypeScript-friendly schema validation library such as Zod.
- Content validation has two layers: Zod validates individual data shapes, then relational validation checks references and ownership across definitions, players, inventories, and battle setups.
- Relational validation rejects duplicate IDs, unknown definitions or owners, invalid equipped-ring relationships, overfilled sockets, reused gems or enchantments, cross-owner references, and invalid battle setup participants or initial monsters.
- The prototype runs both validation layers during startup through `validateContent()`, so invalid fixture data fails before a battle begins.

### Initial Implementation Contract

- Definition files:
  - `packages/content/src/definitions/rings.json`
  - `packages/content/src/definitions/gems.json`
  - `packages/content/src/definitions/monsters.json`
  - `packages/content/src/definitions/spells.json`
  - `packages/content/src/definitions/materials.json`
- Fixture files:
  - `packages/content/src/fixtures/players.json`
  - `packages/content/src/fixtures/inventories.json`
  - `packages/content/src/fixtures/battleSetups/*.json`
  - `packages/content/src/fixtures/scenarios/*.json`
- Locale files:
  - `packages/content/src/locales/en.json`
  - `packages/content/src/locales/fr.json`
- Ring definitions should use this initial shape: `id`, `nameKey`, `element`, `rarity`, `baseDamage`, `baseEnergyCost`, `baseCooldown`, and `baseSpeed`.
- Gem definitions should use this initial shape: `id`, `nameKey`, `element`, `rarity`, `baseDamage`, `baseEnergyPenalty`, and `baseCooldownPenalty`.
- Monster definitions should use this initial shape: `id`, `nameKey`, `element`, `rarity`, `baseHealth`, `baseDamage`, `baseCooldown`, `baseSpeed`, and an optional single `skill`.
- Spell definitions should use this initial shape: `id`, `nameKey`, `element`, `rarity`, `baseEnergyPenalty`, `baseCooldownPenalty`, and `effects`.
- Material definitions use `id`, `nameKey`, `descriptionKey`, `rarity`, `craftingFamily`, `basePrice`, `realWorldType`, and optional `atomicNumber` and `chemicalSymbol`.
- Material atomic metadata is required for chemical elements and forbidden for other real-world material types.
- Spell `effects` should be an array of explicit typed effect objects. The first supported effect type is `dealDamage` with `amount` and `target` fields.
- Player fixtures use `id`, `username`, `experience`, and `equippedRingInstanceIds`. They do not persist a separate level.
- Inventory fixtures contain player-owned ring, gem, monster, and spell instances. Every item instance stores `id`, `definitionId`, `ownerId`, `experience`, and `quality`.
- Ring instances additionally store `socketCount`, `socketedGemInstanceIds`, and `equipped`.
- Gem instances may contain an enchantment with either `monsterInstanceId` or `spellInstanceId`.
- Content version `prototype-2` introduced experience-derived levels and independently progressable monster and spell instances. Content version `prototype-3` adds the confirmed collection, new rarity identifiers, and enriched materials. Content version `prototype-5` renames the highest rarity tier from `legendary` to `epic`.
- The initial `BattleSetup` should contain `id`, `seed`, two players, resolved combat stats, equipped ring instances, socketed gem instances, referenced definitions, and optional initial status for first-player element choice.
- The initial `BattleAction` union should include `chooseElement`, `useRing`, `useMonster`, `endTurn`, and `concede`.
- The version 1 `BattleRecord` shape includes `format`, `formatVersion`, `rulesVersion`, `contentVersion`, `setup`, `actions`, `result`, and `finalStateChecksum`.
- The event log includes `battleStarted`, `firstPlayerChoiceRequested`, `elementChosen`, `elementDuelTied`, `firstPlayerChosen`, `turnStarted`, `cooldownChanged`, `ringUsed`, `energySpent`, `damageDealt`, `spellCast`, `monsterSummoned`, `monsterUsed`, `shieldBroken`, `pierceOverflow`, `hasteActivated`, `rageActivated`, `multiHitResolved`, `monsterDestroyed`, `turnEnded`, and `battleEnded`.
- Scenario fixtures include `basicRingAttack`, `summonAndTaunt`, `spellSelfTargeting`, `skillShowcase`, `lowerLevelStart`, and `elementDuelStart`.
- The `skillShowcase` development fixture preloads three ready monsters per side so Shield, Pierce, Haste, Rage, MultiHit, and Taunt can be exercised manually from the prototype.
- Scenario fixtures should support both full-state expectations and partial expectations for event types, health values, energy values, cooldown values, board state, and battle result.

### Damage And Targeting

- Damage reduces the target's health.
- A target can be a hero or monster if the acting object's targeting rules allow it.
- Health should not go below 0 in displayed state.
- Elemental advantage modifies damage between electric, fire, and ice.
- Elemental advantage increases damage by 10%, rounded down.
- The starting player cannot deal any damage to the opposing hero during the starting player's first turn.
- The starting player may still summon monsters and cast spells during the first turn.
- This first-turn protection applies to all damage types against the opposing hero. Future mechanics that can create opposing monsters before the starting player's first turn may require additional targeting rules.

### Win And Loss

- A player loses when their hero reaches 0 health.
- The opposing player wins when a hero reaches 0 health.
- If both heroes reach 0 health during the same resolution sequence, the battle result is a draw.
- Win-condition checks happen after each complete action resolution. If a hero is at 0 health at that point, the battle ends immediately.

### Rewards

- After combat, rewards may include experience, credits, and materials.
- Equipped items gain experience after combat.
- The current prototype implements claimable deterministic rewards for credits, materials, and source-backed item XP. Replays do not grant rewards.
- The Nuxt Game App implements the same initial deterministic settlement values through persisted `BattleRecord` and `RewardGrant` rows. A development-only result generator creates genuine engine records, verifies them by replay, and requires an active persisted loadout. It is a bridge to the future authoritative live battle lifecycle, not a production battle endpoint.
- The first live battle slice snapshots the development player's active Prisma loadout into an engine `BattleSetup`, including normalized ring sockets and gem enchantments, and persists the setup plus action log in a `BattleRecord`. A temporary fixture-backed training opponent is used until campaign opponent content exists. The live API reconstructs state through the pure engine and intentionally returns only the opponent ring count, never opponent ring identities or stats.
- Live clients submit commands without a player ID. The server assigns the development-player identity, verifies the client's expected action count, applies the command through the pure engine, and conditionally replaces the persisted journal so concurrent or duplicate submissions cannot overwrite a newer state. Finished battles receive their deterministic result JSON and replay checksum. The temporary training adapter only chooses deterministic first-player duel elements and passes opponent turns; it is not campaign AI.
- Prototype winner rewards grant 150 credits plus one common material from each crafting family: `aluminium`, `hydrogen`, `pearl`, and `sand`.
- Prototype draw rewards grant 90 credits plus `aluminium` and `pearl`.
- Nuxt Game App development victories grant 150 credits, 100 hero XP, and one each of `aluminium`, `hydrogen`, `pearl`, and `sand`. Draw settlement is defined as 90 credits, 60 hero XP, `aluminium`, and `pearl`; losses grant 30 credits and 25 hero XP without materials.
- Nuxt reward claims are atomic and idempotent. Claiming a persisted reward updates player credits, material stock, hero experience, and eligible inventory item experience exactly once.
- Each ring in the active persisted loadout, its socketed gems, and their spell or monster enchantments receive 8 participation XP. The existing 20 XP action bonuses will be moved from Dev Lab behavior when the authoritative server action pipeline is implemented.
- Prototype item XP applies only to crafted development inventory instances referenced by Battle Lab `sourceInstanceId` values, regardless of whether those source-backed items are assigned to Player One or Player Two.
- Source-backed equipped rings, socketed gems, and gem enchantments gain 8 XP when rewards are claimed. Each ring use adds 20 XP to the ring and each of its socketed gems. Each spell trigger adds 20 XP to the spell. Each monster summon and monster attack adds 20 XP to the matching monster source instance.
- Hero XP is persisted on the Nuxt `Player` model and is awarded by Game App development battle settlement. Campaign, casual PvP, and ranked formulas remain mode-specific future decisions.
- The prototype battle screen shows a deterministic result summary after finished battles. The summary is derived from the battle log and covers the result, turns, actions played, damage by player, rings used, spells cast, monsters summoned or used, item XP generated, and reward claim status. Imported replays can show this summary but cannot claim rewards.
- In solo campaign, each opponent defines its fixed victory rewards in content data and victory unlocks the next opponent.
- In solo campaign, defeat grants only a small amount of item experience.
- In PvP, rewards will vary based on player level and opponent level.
- In PvP defeat, the player receives a small amount of experience, credits, and 1 to 2 low-rarity materials.
- The exact PvP and ranked reward formulas will be decided with the matchmaking and ranking design.

### Rule Questions To Resolve

- What are the exact PvP and ranked reward formulas?
- What fixed reward values should each solo campaign opponent grant? Campaign opponent design is intentionally deferred.

### Prototype Content Collection

- The first balance collection is documented in `docs/CONTENT_COLLECTION_PROPOSAL.md` and currently implemented as content version `prototype-5`.
- The collection contains 12 collectible rings, 12 collectible gems, 18 monsters, 6 direct-damage spells, and 70 materials.
- `trainingFlameBand` and `plainQuartz` remain development-only definitions outside the collectible pool.
- The collection contains 48 initial recipes: one recipe for every collectible ring, gem, monster, and spell. Development-only definitions are intentionally excluded.
- The prototype setup screen can craft these recipes into local development inventory instances, and Battle Lab can use those crafted instances as a development item source.
- The material collection is detailed in `docs/MATERIAL_COLLECTION_PROPOSAL.md` and is derived from the historical 70-row SQLite `mats` table.
- The material model preserves four crafting families and rarity prices, adds chemical metadata where applicable, and replaces eight fictional resources with real substances or elements.

## Technical Baseline

- Target platform: browser.
- UX priority: mobile first.
- Game type: turn-based card/hero battler.
- Persistence target: SQL database.
- Development database: SQLite.
- Production database: PostgreSQL.
- Multiplayer target: authoritative server with matchmaking and turn-based real-time interaction.
- Data model: initial game content should be defined in JSON files.
- Engine/framework: Vite with a simple DOM UI for the Dev Lab prototype; Nuxt for the initial Game App; Phaser remains a later combat-presentation option.
- Architecture: TypeScript monorepo with separate engine, content, Dev Lab prototype app, and Game App workspaces.
- Tooling: TypeScript, pnpm, Vitest, ESLint, Prettier, Zod-style validation, Prisma, and an organized asset pipeline are decided.

## Technical Decisions

### Decided

#### Browser Target

- Status: decided.
- Decision: BattleNess will run in the browser.
- Reason: The project target is a browser game.
- Tradeoffs: Browser deployment improves accessibility across devices, but the game must account for browser performance, network reliability, mobile viewport constraints, and asset loading.

#### Mobile-First UX

- Status: decided.
- Decision: The interface should be designed mobile first.
- Reason: Mobile support is a primary target, not a later adaptation.
- Tradeoffs: Mobile-first design forces tighter controls, readable combat state, and careful interaction design. Desktop layouts can expand from the mobile model, but dense desktop-only UI patterns should not drive the core experience.

#### Clean Rebuild

- Status: decided.
- Decision: The current effort is a clean rebuild.
- Reason: The user wants to restart development with agent support.
- Tradeoffs: A clean rebuild avoids carrying old architectural mistakes, but useful rules, concepts, assets, or lessons from the previous version must be intentionally reintroduced instead of assumed.

#### SQL Persistence

- Status: decided.
- Decision: Use SQL persistence, with SQLite for development and PostgreSQL for production.
- Reason: The user selected SQLite for development and PostgreSQL for production.
- Tradeoffs: SQL gives strong relational modeling for accounts, inventory, matches, rewards, crafting, and progression. SQLite/PostgreSQL differences must be handled carefully in migrations, tests, concurrency assumptions, and production deployment.

#### TypeScript Across The Stack

- Status: decided.
- Decision: Use TypeScript for gameplay logic, frontend code, backend code, and tests where practical.
- Reason: BattleNess has many deterministic rules and nested item interactions. Shared types reduce drift between client, server, rules tests, and content validation.
- Tradeoffs: TypeScript adds build complexity and stricter modeling work up front, but should reduce long-term rule and API mistakes.

#### Pure Deterministic Combat Engine

- Status: decided.
- Decision: Implement combat rules as a pure TypeScript engine independent from UI, database, sockets, and framework code.
- Reason: The first development focus is the combat engine. Turn-based multiplayer also needs authoritative validation, replay/debug support, and strong automated tests.
- Tradeoffs: This adds an explicit boundary to maintain, but it lets the same rule engine power local prototypes, server validation, tests, bots, and simulations.

#### JSON Game Content

- Status: decided.
- Decision: Define early game content, test fixtures, and prototype balance data in JSON files.
- Reason: JSON is simple to generate, inspect, and revise during early development, including with AI-assisted test data generation.
- Tradeoffs: JSON keeps early content lightweight, but schemas and validation will be needed before content grows too large or feeds production systems.

#### First Milestone: Local Combat Prototype

- Status: decided.
- Decision: Build the first playable milestone as a deterministic local combat prototype in the browser. One local user should be able to control both combat sides. The UI can stay simple because the main goal is proving the combat engine.
- Reason: The combat model is the core risk. Proving turn flow, energy, cooldowns, rings, gems, summons, spells, and win conditions should come before accounts, economy, matchmaking, or production deployment.
- Tradeoffs: This delays persistence, progression, visual polish, and networked multiplayer work, but reduces the chance of building surrounding systems around unclear combat rules.

#### Monorepo Architecture

- Status: decided.
- Decision: Use a TypeScript monorepo with separate workspaces for the combat engine, game content, Dev Lab prototype app, and Nuxt Game App.
- Reason: The combat engine must stay independent from UI, framework, database, and networking concerns while still being easy to consume from a prototype UI.
- Tradeoffs: A monorepo adds workspace setup up front, but it keeps boundaries explicit and should make later Nuxt, Phaser, backend, and testing work easier to integrate.

#### First Prototype App

- Status: decided.
- Decision: Use Vite with a simple DOM interface for the first local combat prototype.
- Reason: The first milestone focuses on engine behavior, not polished rendering. A small Vite app gives fast feedback without coupling combat rules to Nuxt or Phaser.
- Tradeoffs: The first UI will be intentionally plain. If the combat presentation later needs canvas rendering, animations, or game-scene management, Phaser can be introduced for the combat view.

#### Package Manager

- Status: decided.
- Decision: Use pnpm.
- Reason: pnpm works well for TypeScript monorepos and keeps dependency installs efficient and strict.
- Tradeoffs: Contributors need pnpm installed, and its strict dependency behavior can reveal missing package declarations that npm may allow accidentally.

#### Test Framework

- Status: decided.
- Decision: Use Vitest for engine unit tests and JSON scenario tests.
- Reason: Vitest fits TypeScript projects well and is a natural match for Vite-based tooling.
- Tradeoffs: Jest has a larger legacy ecosystem, but Vitest should be simpler for this project shape.

#### Linting And Formatting

- Status: decided.
- Decision: Use ESLint and Prettier.
- Reason: The project will rely on generated and hand-edited TypeScript and JSON. Consistent linting and formatting should reduce noise and catch common mistakes.
- Tradeoffs: This adds a small amount of configuration and CI work.

#### First Milestone Backend Scope

- Status: decided.
- Decision: Do not build a backend for the first combat prototype.
- Reason: The first milestone is local and engine-focused. Backend work becomes useful when accounts, persistence, matchmaking, or multiplayer are being implemented.
- Tradeoffs: This delays API and persistence integration, but avoids distracting from combat rule correctness.

#### ORM

- Status: decided.
- Decision: Use Prisma as the ORM/database migration tool for the durable database schema. The Nuxt Game App now uses Prisma with a local SQLite development datasource.
- Reason: Prisma supports TypeScript workflows and the selected SQL direction, including SQLite for development and PostgreSQL for production.
- Tradeoffs: Prisma introduces schema generation and migration tooling. SQLite keeps development lightweight, but PostgreSQL production readiness still requires attention to migration compatibility, concurrency assumptions, and deployment configuration. The Nuxt Game App is pinned to Prisma 6.x for now because Prisma 7 requires a SQLite runtime adapter and the current Windows development environment should not depend on native `better-sqlite3` build tooling until that upgrade is planned.

#### Prototype Deployment

- Status: decided.
- Decision: The first combat prototype should be deployable as a simple static build after it becomes playable.
- Reason: A static build is enough for a local engine-focused prototype and makes sharing early progress easier without committing to backend hosting.
- Tradeoffs: This does not solve persistence, authentication, multiplayer, or server-side validation.

#### Continuous Integration

- Status: decided.
- Decision: Use GitHub Actions for install, typecheck, lint, and tests.
- Reason: The project will rely on generated JSON content, TypeScript packages, and deterministic combat rules. CI should catch regressions before they accumulate.
- Tradeoffs: CI adds setup maintenance, but it gives quick feedback as the monorepo grows.

#### Runtime Version Management

- Status: decided.
- Decision: Use the active Node.js LTS version at setup time and manage pnpm through Corepack.
- Reason: Pinning the runtime family and package-manager activation should make development reproducible across machines.
- Tradeoffs: Exact versions may need updates over time as Node LTS changes.

#### Monorepo Layout

- Status: decided.
- Decision: Use `packages/engine`, `packages/content`, `apps/prototype`, and `apps/web` as the current workspace layout.
- Reason: This layout separates reusable domain packages from runnable applications.
- Tradeoffs: More folders exist, but the structure keeps the diagnostic Dev Lab separate from the future player-facing Game App.

#### Multiplayer Transport

- Status: decided.
- Decision: Use WebSocket as the primary future multiplayer transport.
- Reason: Live turn-based PvP needs bidirectional communication for turn events, reconnects, timers, and match state updates.
- Tradeoffs: WebSocket hosting and scaling are more involved than simple HTTP-only APIs.

#### Multiplayer Mode Direction

- Status: decided.
- Decision: Build live synchronous PvP first when multiplayer work starts, with asynchronous play left as a possible later addition.
- Reason: The intended combat experience is turn-based but interactive, and live play should validate server authority, reconnect behavior, timers, and match flow.
- Tradeoffs: Live PvP requires stronger connection handling than asynchronous play.

#### Reconnection

- Status: decided.
- Decision: Live matches should be preserved during disconnects and allow players to reconnect.
- Reason: Mobile and browser sessions can be interrupted. Losing a match immediately on transient disconnect would be frustrating.
- Tradeoffs: This requires server-side match state, reconnection tokens or session recovery, and abandonment timeout rules later.

#### Initial PvP Entry Point

- Status: decided.
- Decision: The first future PvP mode should support private matches by code before automatic matchmaking.
- Reason: Private codes are simpler than matchmaking and make early multiplayer testing easier.
- Tradeoffs: This delays casual/ranked matchmaking. Ranked mode is still desired later, alongside solo/campaign.

#### Authentication

- Status: decided.
- Decision: Prefer OAuth login first, especially Google and Facebook, then add email and password authentication.
- Reason: Accounts should be persistent to avoid frustrating data loss. OAuth can reduce account creation friction while email/password remains useful as a fallback or later option.
- Tradeoffs: OAuth adds provider setup and account-linking concerns. Email/password adds credential security and recovery flows.

#### Localization

- Status: decided.
- Decision: Build a localization module from the beginning. User-facing text must not be hardcoded in application or engine code; it should resolve through localization keys and translation JSON files.
- Reason: BattleNess needs multilingual support, even if additional languages are added later. Starting with localization keys avoids costly text extraction later.
- Tradeoffs: Localization adds structure up front. It should include fallback behavior, validation for missing keys, support for interpolation/plurals, and English technical IDs for content and code.

#### Asset Pipeline

- Status: decided.
- Decision: Set up an organized asset pipeline from the beginning, even if early assets are AI-generated templates that may be replaced later.
- The current BattleNess logo and application icon live under `apps/prototype/public/assets/brand/`.
- The prototype uses the logo in its battle and setup headers, and the icon as its browser favicon and Apple touch icon.
- Reason: BattleNess will need visual assets, and early structure prevents scattered files and unclear asset ownership.
- Tradeoffs: This adds project setup before final art exists, but template assets can validate UI and combat presentation needs early.

#### Audio Direction

- Status: decided.
- Decision: Plan for sound and music later.
- Reason: Audio is expected eventually, but it is not needed for the first combat-engine milestone.
- Tradeoffs: The asset pipeline should leave room for audio without making it an immediate implementation task.

#### Match History And Replay Data

- Status: decided.
- Decision: Persist actions, deterministic seed, and result for completed matches, similar in spirit to chess PGN as a compact record of what happened.
- Implementation: The prototype now records successful actions and supports versioned JSON export, validated import, step replay, full replay, result verification, and deterministic final-state verification.
- Persistence status: Battle records are currently local to the prototype. Database-backed match history remains future work.
- Reason: Action logs support replay, debugging, moderation, analytics, and deterministic verification.
- Tradeoffs: Replay support requires stable action schemas and migration strategy as combat rules evolve.

#### Content Source Of Truth

- Status: decided.
- Decision: Keep versioned JSON content definitions as the source of truth and import them into the database if runtime querying, admin tooling, or production operations require it. Player-owned instances and progression data belong in the database.
- Reason: JSON definitions are easy to review, generate, diff, validate, and version. Database import can support production needs without making the database the design source.
- Tradeoffs: This requires import tooling and content version tracking so saved player item instances and match records remain compatible with content changes.

#### Nuxt Game App

- Status: decided.
- Decision: Use Nuxt in `apps/web` for the initial player-facing Game App frontend/backend scaffold, including server routes and development persistence integration.
- Reason: Nuxt can cover application screens such as forge, shop, inventory, account, and server APIs while still consuming the pure combat engine and content packages.
- Tradeoffs: Nuxt adds framework conventions and server build output to the monorepo. The Dev Lab should remain available for low-level debugging, and Phaser should remain optional for the battle presentation.

### Proposed

#### Authoritative Server For Multiplayer

- Status: proposed.
- Decision: Multiplayer matches should be resolved by an authoritative server, with clients sending intended actions instead of final state changes.
- Reason: Competitive turn-based games need consistent state, cheat resistance, reconnect support, and server-owned match outcomes.
- Tradeoffs: Server authority increases backend complexity and requires clear action validation, latency handling, and match lifecycle management.

#### Phaser Combat Presentation

- Status: proposed.
- Decision: Introduce Phaser for the combat presentation only if the battle view needs canvas rendering, animation-heavy interactions, or game-scene tooling.
- Reason: Nuxt can handle the surrounding application UI, while Phaser can be isolated to the combat experience if it becomes useful.
- Tradeoffs: Combining Nuxt and Phaser is feasible, but it adds integration complexity. The combat engine should remain framework-independent so this decision can be delayed.

### Not Decided Yet

- Long-term deployment platform. A classic Node server or VPS is currently preferred if feasible, but this should be confirmed when backend and multiplayer requirements are clearer.
- Combat UI direction beyond a simple prototype interface.
- Exact Phaser integration approach for the combat presentation.

## Open Technical Topics

- Browser game framework or rendering approach.
- Client/server architecture.
- Authoritative game-state model.
- Multiplayer server architecture and scaling model.
- Matchmaking implementation details.
- Data schema for players, inventory item instances, rings, gems, monsters, spells, materials, recipes, and rewards.
- Content authoring workflow.
- Testing strategy for deterministic game rules.
- Deployment strategy.
