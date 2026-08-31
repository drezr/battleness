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
- Gem enchantments are modified only under the dedicated Forge > Enchant view. Forge > Socket manages ring socket capacity and gem socketing only. Inventory exposes resolved composition as read-only information and links gems, spells, and monsters to the Enchant workflow.
- A gem and an available spell or monster may be selected independently; ownership, type, uniqueness, and market-escrow compatibility are validated automatically.
- A gem holds at most one spell or monster enchantment. Replacing or removing it is free, never destroys the attached item, and is allowed while its ring is equipped as long as no battle or market lock prevents the mutation.
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
- A hero's speed is the sum of the base speed values of equipped rings, socketed gems, and their monster or spell enchantments.
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

- Rings, gems, monsters, materials, and spells use production TexturePacker atlases with validated
  metadata under `packages/content/src/atlases/`. Their PNGs are shipped under
  `apps/web/public/assets/items/` and `apps/prototype/public/assets/items/`.
- The approved 42-spell catalogue is preserved under
  `packages/content/sources/production-spells-v1.json`; its active atlas follows the same structure
  as every other production item atlas.
- Stable definition IDs and packed-frame coordinates are resolved centrally by
  `packages/content/src/itemAtlases.ts`. The renderer supports trimmed and rotated frames.
- Shared startup and test validation prevents an active definition from shipping without artwork.
- Ring, gem, monster, spell, and material artwork is available across the Dev Lab and Game App.
- The setup screen includes a collapsible development collection that renders every current asset by category.

### Battle Lab

- The prototype setup screen can switch between scripted scenario fixtures and an editable Battle Lab.
- The Battle Lab supports two configurable players, 1 to 10 rings per player, up to 3 gems per ring, and optional spell or monster enchantments for each gem.
- Player, ring, gem, spell, and monster levels and qualities are editable within the progression limits.
- `packages/content/src/battleLab.ts` converts the editor configuration into temporary battle-scoped instances, then resolves them through the regular `createBattleSetup` pipeline. These instances are test inputs, not player inventory.
- Battle Lab configurations can be serialized to and imported from strictly validated JSON. Imports also resolve content references before replacing the active configuration.
- Named Battle Lab presets are stored in browser `localStorage` under a versioned key. This is a technical reproducibility convenience only and is separate from account-backed Game App loadouts.
- The Battle Lab comparison view reports resolved health, speed, total ring damage, total energy cost, damage per energy, and damage per cooldown.
- Current balance warnings are diagnostic heuristics, not game rules: they flag a relative efficiency difference of at least 50% or a speed difference of at least 4.
- The Battle Lab batch runner executes two deterministic variants, each favoring a different player if an element duel is required to choose the starting player.
- Its greedy diagnostic policy prioritizes the highest immediate-damage ready action, respects energy, cooldown, first-turn hero protection, and Taunt, and ends the turn when no action is available.
- Simulations stop after 500 actions and report a timeout instead of assuming a result. The policy is a balance aid, not a human-play or AI-strength model.

### Battle Layout Direction

- The player-facing live battle screen follows the user's sketch direction through a responsive Nuxt DOM arena: heroes anchor the left combat column, three monster slots form each side of the field, the viewer's rings form a bottom dock, and energy rails frame the arena. Live battles hide the global sidebar, top bar, mobile navigation, route section navigation, and raw diagnostics by default so combat owns the full `100vw` by `100dvh` viewport without page scroll. Opponent rings remain hidden. Phaser remains an optional later layer for animation-heavy scene needs rather than a current dependency.
- On narrow battle viewports, ring cards retain a readable minimum size and the bottom dock scrolls horizontally instead of shrinking every possible ring into one row. Mobile energy rails prioritize the full segmented meter and always keep the localized current/maximum value visible; the player labels remain available to assistive technology.
- Monster cards should expose skill, damage, and health zones clearly.
- Ring cards should expose total ring damage, including socketed gem damage, and energy/cost information, with socketed gems visible along the bottom of each ring.
- Ready rings and monsters are selected directly from their cards, legal targets are then chosen on the board, and clicking the selected source again deselects it. The UI should not repeat the selected source name in a separate prepared-action label.
- Ring, gem, and monster frames identify rarity consistently: common uses light gray, refined uses blue, rare uses orange, and epic uses purple.
- Live battle ring cards use rarity-specific frame image assets under `apps/web/public/assets/cards/`:
  `ring-frame-common.png`, `ring-frame-refined.png`, `ring-frame-rare.png`, and
  `ring-frame-epic.png`. The artwork is rendered below the transparent frame layer, while localized
  titles, elements, values, gems, and interaction feedback remain above it.
- Live ring sockets use the separate `ring-socket.png` asset. Render exactly the owned ring's
  `socketCount`: an existing empty socket remains visible, a socketed gem appears above its socket,
  and nonexistent sockets do not produce locked or placeholder elements.
- Compact gem artwork is circularly clipped, pixel-aligned when supported, and surrounded by its own
  rarity-colored border.
- Ring hover preserves the rarity frame and illuminates the complete transparent frame asset with a
  short transition instead of drawing another outline. Selection also illuminates the frame without
  replacing its rarity color and uses a slower two-second pulse that starts at maximum brightness.
- Ready ring cooldowns display the localized green `battle.live.cooldownReady` label. An active
  cooldown value or an unaffordable energy cost is orange; unavailable rings remain at full opacity.
- Selection, targeting, and blocked-state indicators remain separate from rarity framing so interaction state does not replace item identity.
- Ring, gem, and monster cards also display a localized elemental badge in the top-right corner: Electric uses yellow, Fire uses pink-red, and Ice uses light cyan.
- Compact socketed gems use their elemental fill color while retaining rarity on the surrounding border.
- Development-only battle diagnostics and last-resolution details should stay available through an explicit developer modal rather than being visible in the main combat layout.
- Finished live battles replace the arena with a scroll-free outcome screen that prioritizes a large
  result, compact reward totals, explicit exit and detail actions, and a reward layout with credits,
  hero XP, and item XP above material artwork. Rewards are already delivered automatically when this
  screen appears. Complete loadout snapshots and combat activity remain available through an
  explicit Battle Info modal with its own internal scrolling.
- The current Nuxt live battle background uses the public asset
  `apps/web/public/assets/backgrounds/live-battle-elemental-arena.jpg`, rendered as a covered
  full-screen arena backdrop with translucent combat overlays.

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
- Production recipes consume exactly three material units from the matching crafting family. A recipe may repeat a material, represented canonically by an aggregated quantity.
- Material rarities scale by crafted item rarity: common items use three common materials; refined items use one refined and two common materials; rare items use one rare, one refined, and one common material; epic items use one epic, one rare, and one refined material.
- Initial crafted items are level 1 and quality 0. Crafted rings start with one socket.
- The Prisma-backed Game App is the exclusive owner of player credits, material stock, inventory item instances, crafting, improvements, socketing, enchantments, saved loadouts, progression, and reward settlement.
- The Dev Lab does not emulate or persist a player profile, inventory, economy, progression loop, or reward loop. Its startup removes obsolete browser-local development inventory and loadout keys left by older builds.
- Battle Lab rings, gems, levels, qualities, socket counts, and enchantments are edited directly as battle-scoped test data. They never reference or mutate Game App inventory instances.
- The Dev Lab may inspect recipe, item, locale, and artwork definitions for content validation, but crafting and all player-owned mutations remain Game App workflows.

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
- Element choices are hidden, lock immediately after submission, and cannot be changed while waiting for the opponent.
- The opening duel has a persisted 90-second deadline starting when the battle is created. The deadline continues through disconnects and resets to 90 seconds after a tied duel.
- If exactly one player has submitted when the deadline expires, the missing player concedes. If neither player submitted, the battle ends in a draw without rewards.
- If both players choose the same element, another duel begins. After three tied duels, a deterministic seed-based tiebreaker selects the starting player and is recorded in the action/event journal.
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
- If a targeted spell has no legal target when its ring is used, that spell fails without cancelling
  the ring's energy payment, cooldown, damage, or other enchantments.
- Ring use resolves in this order: pay energy, put the ring on cooldown, apply ring and gem damage, trigger enchantments in socket order, then check win conditions.

### Gems And Enchantments

- A gem placed in a ring adds damage to that ring.
- A gem may be enchanted by a monster or a spell.
- When a ring is used, each gem's enchantment triggers.
- A monster enchantment summons that monster to fight alongside the hero.
- A spell enchantment applies that spell's effect.
- Multiple socketed gems trigger in socket order.
- If a monster enchantment summons a monster that is already in play, it creates a new monster instance as long as the controller's monster board is not full. Runtime monster instance IDs must not be reused after destruction within the same battle; a later summon receives a higher instance number.
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
- If a monster enchantment summons a monster that is already in play, it creates a new monster instance as long as the controller's monster board is not full. Destroyed monster instance IDs are not reused later in the battle.
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
- All spell targets attached to a ring action are validated before energy is spent. If earlier ring or gem damage destroys a previously valid spell target during that same action, the dependent spell expires without an error and is not redirected automatically.

#### Production Spell Collection V2

- Status: approved for implementation.
- The 42 production spells replace the six retained test spells under the global content version
  `production-items-v2`; the retired collection remains available only through explicit legacy
  handling. `burnI` replaces `firebolt` in the versioned starter loadout.
- Ring commands retain the existing optional `enchantmentTargets` map keyed by socketed gem instance
  ID. The primary ring target is reused when it satisfies a spell's targeting contract; otherwise
  the complete command supplies the additional spell target before any mutation occurs. Spells with
  no selection ignore explicit entries.
- `pierceLegacy` and `funeralBrand` arm action-scoped preparation effects before ring-and-gem damage
  so they can observe that damage. Ordinary enchantments still resolve in stable socket order after
  ring-and-gem damage.
- A monster has at most one natural skill but may receive multiple battle-only granted skills.
  Natural and granted provenance remains distinct, duplicate grants have no effect, and compatible
  attack and passive skills compose in the documented resolution order.
- Setting a monster or ring's current cooldown to zero makes it immediately reusable in the current
  turn, including after it was already used during that turn.
- Burn ticks at the start of the affected monster controller's turn before its remaining duration
  decreases. Shock and Freeze restrict exactly the next N complete owner turns and expire after the
  last affected turn. Effects that expire at the start of a turn, including Crystal Skin, expire
  before Burn ticks; status processing precedes normal cooldown decrements.
- Taunt restricts attacks, ring damage, and selected spell damage. Selected transformation,
  destruction, status, cleanse, and cooldown-control effects may bypass Taunt unless their own
  targeting contract says otherwise.
- Progression scales only literal damage amounts authored as direct spell damage. Periodic Burn
  damage, stat bonuses, captured values, copied values, and destruction effects do not scale.
- Shield instances retain source identity. One incoming damage instance consumes at most one active
  Shield, while active Shields from different sources can protect against successive damage
  instances. Crystal Skin has no effect while any Shield is active.
- Last Breath reacts to destruction caused by damage or direct destruction. Copy duplicates current
  combat statistics and permanent skills but not statuses, consumed skill state, or runtime identity.
  Transmute replaces combat state while preserving controller and board position.
- Implementation progress: all four inactive engine slices are complete, with one scenario for each
  of the 42 production spells. Granted skills and Shields retain source provenance; all random
  choices are deterministic and logged; supported-ring triggers persist without duplicates; and an
  ephemeral action context carries preparation, capture, and destruction state. Direct destruction
  reuses Last Breath/Funeral Brand settlement. Copy preserves current statistics and permanent
  skills with fresh consumed state, Transmute preserves only controller/slot identity, and temporary
  copies receive unique IDs and expire by direct destruction. Definitions and the atlas remain
  dormant until the atomic content, persistence, localization, recipe, and asset cutover.

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
- A ring's current energy cost and cooldown add penalties from contained gems, monsters, and spells. Decimal contributions are summed first and the final energy or cooldown increase is floored once.
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
- Hero speed is the sum of the unscaled base speed values of equipped rings, socketed gems, and their monster or spell enchantments. Level and quality do not modify speed.
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
- Spell definitions use `id`, `nameKey`, `descriptionKey`, `element`, `rarity`, `baseSpeed`, decimal
  energy/cooldown penalties, targeting, and strictly typed effects.
- Material definitions use `id`, `nameKey`, `descriptionKey`, `rarity`, `craftingFamily`, `basePrice`, `realWorldType`, and optional `atomicNumber` and `chemicalSymbol`.
- Material atomic metadata is required for chemical elements and forbidden for other real-world material types.
- Spell `effects` should be an array of explicit typed effect objects. The first supported effect type is `dealDamage` with `amount` and `target` fields.
- Player fixtures use `id`, `username`, `experience`, and `equippedRingInstanceIds`. They do not persist a separate level.
- Inventory fixtures contain player-owned ring, gem, monster, and spell instances. Every item instance stores `id`, `definitionId`, `ownerId`, `experience`, and `quality`.
- Ring instances additionally store `socketCount`, `socketedGemInstanceIds`, and `equipped`.
- Gem instances may contain an enchantment with either `monsterInstanceId` or `spellInstanceId`.
- Historical versions `prototype-2` through `prototype-6` introduced progression, rarity, recipes,
  and campaign fixtures. `production-items-v2` is active and replaces the six test spells with the
  approved 42-spell production catalogue.
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
- Dev Lab battles and imported replays never grant credits, materials, hero XP, or item XP and never mutate player state. Their result summaries are technical diagnostics only.
- The Nuxt Game App implements deterministic settlement values through persisted `BattleRecord` and `RewardGrant` rows. Authoritative live battles create and deliver their reward grant in the same transaction as the finishing action, final result, and replay checksum.
- Live battles snapshot the development player's active Prisma loadout into an engine `BattleSetup`, including normalized ring sockets and gem enchantments, and persist the setup plus action log in a `BattleRecord`. Training retains its fixture-backed passive opponent, while campaign mode resolves its selected game-owned content loadout into deterministic engine instances. The live API hides opponent ring identities, statistics, and count until use reveals them. PvP matchmaking responses enforce the limited public identity projection described below.
- Live clients submit commands without a player ID. The server assigns the development-player identity, verifies the client's expected action count, applies the command through the pure engine, and conditionally replaces the persisted journal so concurrent or duplicate submissions cannot overwrite a newer state. Finished battles receive their deterministic result JSON and replay checksum. Campaign opponents choose deterministic legal actions server-side; the development training adapter remains passive.
- Nuxt Game App development victories grant 150 credits, 100 hero XP, and one each of `aluminium`, `hydrogen`, `pearl`, and `sand`. Draw settlement is defined as 90 credits, 60 hero XP, `aluminium`, and `pearl`; losses grant 30 credits and 25 hero XP without materials.
- Nuxt battle reward delivery is atomic and idempotent. The finishing transaction creates the audit grant, updates player credits, material stock, hero experience, and eligible inventory item experience, then records the grant as delivered exactly once. Legacy unclaimed battle grants are reconciled automatically on the next battle-state or history read.
- Each ring in the active persisted loadout, its socketed gems, and their spell or monster enchantments receive 8 participation XP. Authoritative live settlement also grants 20 XP for each effective ring and socketed-gem use, spell trigger, successful monster summon, and monster attack. These gains are applied automatically when the battle finishes.
- Hero XP is persisted on the Nuxt `Player` model and is awarded by Game App development battle settlement. Campaign uses content-owned fixed rewards, casual PvP currently grants no rewards, and ranked formulas remain a future decision.
- The Dev Lab and Nuxt Game App show deterministic result summaries after finished battles. Dev Lab summaries cover technical combat facts without rewards. Nuxt summaries are reconstructed from persisted actions through the engine and cover turns, actions played, damage and action contribution by player, rings used, spells cast, monsters summoned or used, item XP generated, reward delivery status, and both complete resolved loadout snapshots. Result equipment comes from the immutable initial setup rather than current inventory state.
- In solo campaign, each opponent defines its fixed victory rewards in content data and victory unlocks the next opponent.
- The initial campaign track is linear: `emberTrial` at recommended level 1, `stormInitiate` at level 3, and `frostGate` at level 5. Each opponent is repeatable and owns a validated content loadout plus separate first-clear and repeat-victory rewards.
- Campaign completion is persisted as one `CampaignProgress` row per player and opponent. Victory count distinguishes first-clear from repeat settlement, and the selected opponent ID is stored as the battle mode reference.
- In solo campaign, defeat grants only a small amount of item experience.
- Private and casual PvP currently grant no rewards. This prevents early unranked farming while matchmaking is validated.
- The exact ranked reward formula will be decided with the rating, season, and ranked matchmaking design.

### Game Market

- Selecting a material or eligible inventory item opens its buy, sell, or recipe-valued transaction
  desk as a modal instead of requiring navigation to a separate page section. The modal locks and
  inerts the background, confines keyboard focus, supports Escape and backdrop dismissal, restores
  focus to the selected card, and keeps the existing transaction APIs and validation rules.
- Official material buy prices are fixed by rarity at 10/25/60/150 credits for common, refined,
  rare, and epic materials.
- Material buyback pays `max(1, floor(officialBuyPrice * 0.25))` credits per unit.
- A crafted item is valued from its recipe: sum every ingredient's quantity multiplied by its
  official material buy price, then pay `max(1, floor(recipeValue * 0.25))` credits.
- Item XP, level, quality, socket-count improvements, and other investments do not increase the
  initial buyback value.
- Every active production item has a crafting recipe and can therefore receive a server-owned game-market valuation when no other eligibility rule blocks it.
- Equipped rings, rings referenced by a loadout, rings containing socketed gems, socketed gems,
  enchantment gems or targets, and player-market escrow items cannot be sold to the game.
- Material and item sales are atomic, server-valued, and journaled with globally unique request
  IDs. Item deletion occurs before the player credit increment in the same database transaction.
- Market history stores both the sold instance ID and its durable content definition ID so the
  transaction remains readable after the inventory instance is deleted.

### Player Market

- The initial player market uses fixed-price listings paid only in credits; auctions, barter, listing fees, and sale commissions are excluded.
- Rings, gems, monsters, spells, and materials can be listed. An equipped object or an object currently attached to another inventory object cannot be listed independently.
- A listed ring is sold as one complete bundle with all socketed gems and their spell or monster enchantments. Ownership of the complete graph must transfer atomically.
- Listings never expire. They remain active, purchasable, and counted toward the seller's active-listing limit until they are sold or explicitly cancelled. Sellers may cancel at any time without a fee and receive the escrowed content immediately.
- Sellers choose any positive whole-credit price supported by the monetary storage type. The market does not impose rarity-based or suggested minimum and maximum prices.
- Each player may have at most 20 active listings.
- Sellers remain anonymous in player-facing market data regardless of profile visibility.
- Browsing supports type, definition, rarity, element, level, quality, and price filters.
- A purchase uses a database-owned single-winner transition. If multiple buyers submit concurrently, only the first committed purchase transfers ownership and credits; all others receive an unavailable-listing result.
- Material listings contain one seller-selected quantity and are purchased only as an indivisible lot.
- Listing creation moves or locks the complete item bundle or material quantity in market escrow, preventing inventory use while the listing is active.
- Players cannot buy their own listings. A completed purchase credits the seller immediately in the same atomic transaction that debits the buyer and transfers ownership.
- Purchase and cancellation races use first-committed-writer semantics. Creation, purchase, and cancellation require idempotency request IDs.
- Buyer and seller retain a permanent private transaction history.
- Persistence implementation: `PlayerMarketListing` retains permanent active, sold, or cancelled listing state, anonymous-search attributes, price, quantity, content provenance, optional root-item relation, immutable bundle snapshot, and buyer/sale timestamps. `PlayerMarketEscrowItem` uniquely locks every item instance in an active bundle, while material quantities are removed from player stock into the listing record by the creation API. `PlayerMarketMutation` provides one globally unique request journal for create, purchase, and cancellation idempotency. Matching migrations exist for SQLite and PostgreSQL, and the production persistence smoke test covers the new relations.
- Browse implementation: authenticated players can query active listings through `/api/market/players` with validated type, definition, rarity, element, level, quality, and price filters. Results use bounded pagination and deterministic newest, price, level, or quality ordering. Player-facing payloads never expose seller identity; they only identify the current player's own listings. The localized `/market/players` view consumes the versioned content catalogue for definition labels and filter options.
- Creation implementation: authenticated players can create a listing through `POST /api/market/players` with a globally idempotent request ID and a positive whole-credit price. Material quantities are atomically removed from player stock into one indivisible listing. Item listings lock the owned root instance; ring listings additionally lock every socketed gem and attached enchantment and retain a versioned immutable graph snapshot. Equipped rings, rings referenced by any loadout, attached standalone objects, already escrowed objects, and standalone enchanted gems are ineligible. Escrowed instances cannot be equipped or modified through quality, socket, or enchantment operations. Creation uses a serializable retrying transaction and enforces the 20-active-listing limit before moving assets.
- Cancellation implementation: only the seller can cancel an active listing through `DELETE /api/market/players/:listingId`, using a globally idempotent request ID. The same serializable transaction claims the active listing, marks it permanently cancelled, returns the complete material lot to stock or removes every item escrow lock, and records the mutation. A later or competing cancellation cannot return assets twice. Cancelled records remain stored for future private history but disappear from active browsing immediately.
- Purchase implementation: an authenticated non-seller can buy an active listing through `POST /api/market/players/:listingId/purchase`, using a globally idempotent request ID. One serializable transaction claims the listing, conditionally debits the buyer, immediately credits the seller, transfers the exact material lot or every escrowed item, rewrites ring-socket and enchantment ownership, removes item locks, records the buyer and sale timestamp, and journals the mutation. Conditional claims provide first-writer-wins behavior for concurrent buyers, while any failed payment or invalid transfer rolls back the complete settlement. The localized market view requires explicit confirmation before spending credits and refreshes ownership, balance, and listing state after success.
- History implementation: authenticated players can query only their own completed purchases and sales through `GET /api/market/players/history`, with buyer, seller, or combined filters and deterministic sale-date pagination. The response projects content-backed item details, immutable price and quantity, completion time, and bundle size without exposing either participant identifier or profile data. The responsive localized `/market/players/history` view presents this permanent private record separately from active listings.

### Rule Questions To Resolve

- What is the exact ranked reward formula, and should casual PvP gain rewards later?

### Prototype Content Collection

- The first balance collection is documented in `docs/CONTENT_COLLECTION_PROPOSAL.md` and campaign content is currently implemented as content version `prototype-6`.
- The collection contains 12 collectible rings, 12 collectible gems, 18 monsters, 6 direct-damage spells, and 70 materials.
- `trainingFlameBand` and `plainQuartz` are removed from active content and retained only in the technical `prototype-6` archive.
- The collection contains 48 initial recipes: one recipe for every collectible ring, gem, monster, and spell. Development-only definitions are intentionally excluded.
- The Dev Lab can inspect these recipe definitions alongside the active content and artwork, but it does not craft or persist player-owned instances. Crafting is a Game App workflow.
- The material collection is detailed in `docs/MATERIAL_COLLECTION_PROPOSAL.md` and is derived from the historical 70-row SQLite `mats` table.
- The material model preserves four crafting families and rarity prices, adds chemical metadata where applicable, and replaces eight fictional resources with real substances or elements.

## Technical Baseline

- Target platform: browser.
- UX priority: mobile first.
- Game type: turn-based card/hero battler.
- Persistence target: SQL database.
- Development database: SQLite.
- Production database: PostgreSQL.
- PostgreSQL readiness uses a generated provider-specific mirror of the canonical SQLite Prisma model, an independent PostgreSQL migration history, an optional local Docker Compose service, and a CI service that deploys migrations, detects schema drift, and runs transactional persistence checks.
- Player profiles retain an immutable technical username plus a separately editable display name, public/private visibility, creation time, and last activity time. A one-to-one preference record stores account locale, system/dark/light theme, comfortable/compact density, reduced motion, mute state, and master/music/effects volumes.
- Multiplayer target: authoritative server with matchmaking and turn-based real-time interaction.
- Data model: initial game content should be defined in JSON files.
- Content provenance: each JSON content version is registered in Prisma with a SHA-256 checksum and definition-count manifest. Durable gameplay rows retain the version that created or most recently resolved them; legacy rows use `legacy-unversioned`, and a version identifier cannot be reused for changed definitions.
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
- Decision: Player-facing shell views use one shared 16-pixel horizontal gutter at mobile widths.
  Feature scenes may add internal panel padding, but route-level content must not independently
  remove or duplicate the shell gutter. Focused full-screen surfaces such as live battle remain
  outside this shell rule.
- Reason: Mobile support is a primary target, not a later adaptation.
- Tradeoffs: Mobile-first design forces tighter controls, readable combat state, and careful interaction design. Desktop layouts can expand from the mobile model, but dense desktop-only UI patterns should not drive the core experience.

#### Player App Visual Direction

- Status: decided.
- Decision: Use a dark-first tactical competitive interface. Desktop uses a persistent left sidebar and compact resource top bar; mobile uses a fixed bottom navigation bar. The home view acts as a command center rather than a marketing page.
- Decision: Use medium-density item cards, a distinct display treatment for headings with a neutral sans-serif UI face, restrained rarity borders and glows, element badges with targeted color accents, and fast functional motion with reduced-motion support.
- Decision: Redesign Inventory Items as an artwork-first collection with compact category and filter
  controls, selectable tiles, and one authoritative inspector. Repeated item-card tables and Inspect
  actions should not dominate the collection. Desktop uses a persistent inspector where space
  permits; compact layouts retain accessible modal inspection. The first slice reuses current data,
  artwork, progression, Forge routes, and Equipment rules without inventing mutations or capacity
  limits. See `docs/INVENTORY_ITEMS_REDESIGN.md`.
- Decision: Inventory item inspection is a read-only, server-resolved composition graph. Rings show
  base, Ring-only, and final statistics plus their socketed Gem and enchantment tree; Gems link to
  their containing Ring and enchantment; Monsters and Spells link to the Gem they enchant. Related
  objects select each other within Items rather than opening duplicate detail routes. Equipment,
  Socket, and Enchant remain the authoritative mutation surfaces.
- Decision: Use familiar Lucide icons for navigation and tools, text or icon-plus-text controls for explicit commands, the full BattleNess logo on the home view, and the compact BattleNess icon in the application shell.
- Decision: Standard player-view titles reuse the Forge Hub title treatment and the Battle Hub
  vertical rhythm. Their short localized descriptions move into a shared question-mark help dialog
  beside the title so page headers remain compact. Because the shell header already names the active
  section, standard views omit the duplicate colored eyebrow above their main title. The dialog must inert the application, confine
  keyboard focus, support Escape and backdrop dismissal, restore focus, and remain ready for richer
  help copy or imagery later. Standard headers own no route-specific padding, border, minimum height,
  or stretched grid row: they align to the shell content edge, size to their content, and leave 26
  pixels before the next page block. The question-mark control keeps a 44-pixel interaction area but
  uses a restrained 32-pixel circular visual. Home omits this control because its command-center
  purpose is self-evident. Authentication, focused live combat, and combat outcomes keep their
  specialized contextual hierarchy because they do not duplicate a standard shell section header.
- Decision: The next visual iteration must make the Game App feel like a game rather than a conventional website or dashboard. Favor immersive game surfaces, stronger spatial hierarchy, and purpose-built game panels while reducing generic web cards, tables, and application chrome.
- Decision: Establish and confirm the updated game-first visual language through the shared shell and a representative player workflow before rolling it out across every feature.
- Decision: Section hubs use their staged destination cards as the only route-level navigation. Child
  views replace horizontal section menus with one compact icon link inside the title block, avoiding
  a separate navigation row while returning deterministically to their parent hub. Nested workflows
  preserve their hierarchy, such as Battle Hub to PvP Hub to a matchmaking mode. The link never
  depends on browser history, retains a localized accessible name, and keeps a 44-pixel interaction
  target across desktop and mobile layouts. It uses a visible rounded cyan-accented surface with
  restrained depth so the parent navigation remains easy to identify beside the title.
- Decision: Hub destination cards place their icon beside the eyebrow and title, keep supporting copy
  and useful metrics below, and use the complete card as the single interactive target. Separate
  bottom calls to action are omitted when they only repeat the card destination. Data panels with
  multiple meanings or actions remain non-clickable rather than receiving an ambiguous route.
- Decision: When a hub combines primary destinations with recap statistics, destination cards come
  first in both visual and document order. Battle places its mode cards before account performance;
  Forge places its workshop stations before workshop statistics. This keeps the player's next
  action ahead of supporting intelligence for pointer, keyboard, and assistive-technology users.
- Decision: Hub destinations share the Battle mode-card surface language: an accented top edge,
  environmental artwork, a dark lower information field, consistent corner geometry, and one
  restrained hover/focus treatment. Feature-specific artwork and accent colors remain available for
  orientation. Non-destination hub panels share the quieter Inventory Battle Readiness surface so
  progression, activity, loadout, collection, and recommendation information reads consistently
  without implying that the complete panel is interactive.
- Decision: Give major player workflows a restrained environmental identity where it supports
  orientation. Forge uses a dedicated dark workshop backdrop with amber furnace light and cyan
  crystal accents. Inventory uses a secured vault and armory backdrop with a collection gallery and
  battle-preparation platform. Market uses one shared trading hall with a cool, orderly fixed-game
  exchange and a warmer player bazaar. Profile uses a ceremonial chronicle hall where identity,
  combat history, progression, and personal preferences read as one commander dossier. Real
  localized controls and item artwork remain separate from these backgrounds.
- Decision: Battle workflows outside the live arena should reuse the elemental arena identity where
  possible. Campaign presents its opponent sequence as an operation path leading into a staged
  encounter. PvP uses the same environment as a competitive antechamber, with violet direct
  challenges, cyan casual matchmaking, and gold ranked competition as distinct mode identities.
  Public competitive profiles continue the ranked identity as arena dossiers, with season standing,
  peak rank, and record treated as the only focal information. Leaderboard identities visibly lead
  to those dossiers without weakening the established privacy boundary. The established live-battle
  and result presentations remain unchanged.
- Decision: Authentication uses a full-screen commandery gateway rather than an application card.
  The BattleNess wordmark is the primary entry landmark, while configured OAuth and local
  development providers remain the only available session actions. Authentication presentation must
  not imply additional onboarding, account-merging, or provider behavior.
- Reason: The Game App needs a recognizable player-facing hierarchy while preserving efficient access to battle, forge, inventory, market, and profile workflows on both mobile and desktop.
- Tradeoffs: Increased immersion must preserve legibility, accessibility, responsive behavior, localization, and efficient access to established features. The shared shell and design tokens must be applied incrementally to established feature pages. The permanent Dev Lab keeps technical diagnostics that should not leak into the player-facing presentation.

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
- Decision: Use authenticated WebSocket invalidation events as the primary live multiplayer transport while HTTP APIs and Prisma remain the authoritative state and command boundary.
- Reason: Live turn-based PvP needs bidirectional communication for turn events, reconnects, timers, and match state updates.
- Implementation: Nitro accepts the existing player session during the WebSocket upgrade. Server transactions publish lobby or battle invalidations to every connected tab owned by each participant, and clients reload the relevant HTTP resource. Automatic reconnect, heartbeat, and slower polling fallback protect against transient connection or event delivery failures.
- Tradeoffs: The first connection registry is process-local. Multi-instance deployment requires shared pub/sub so an event produced by one server reaches sockets connected to another server.

#### Multiplayer Mode Direction

- Status: decided.
- Decision: Build live synchronous PvP first when multiplayer work starts, with asynchronous play left as a possible later addition.
- Reason: The intended combat experience is turn-based but interactive, and live play should validate server authority, reconnect behavior, timers, and match flow.
- Tradeoffs: Live PvP requires stronger connection handling than asynchronous play.

#### PvP Information Visibility

- Status: decided and implemented across pre-combat API sanitization, in-battle staged reveal, complete participant result loadouts, and public competitive profiles.
- Apply the same visibility rules to private, casual, and ranked PvP.
- Matchmaking search reveals no opponent information. After a match is created and before combat starts, participants see only the opponent's display name, hero level, visible rank, and readiness state.
- Before use, the opponent's complete loadout, ring count, item identities, rarities, elements, gems, enchantments, and detailed statistics remain server-hidden.
- The implemented pre-combat API projection contains only display name, hero level, visible rank, and readiness. Private lobbies include loadout identifiers, names, and ring counts only on the current player's own participant record. Casual and ranked search responses contain no opponent object, and live battle opponent responses no longer contain a ring count.
- A ring becomes visible when first used and remains visible for the rest of the match. Its socketed gems become visible with that use because their resolved damage, energy, or cooldown values contributed to the action. A spell or monster enchantment remains hidden until it actually casts or summons, then remains visible afterward.
- Reveal state is reconstructed deterministically from the immutable setup and persisted action journal rather than stored as mutable parallel state. Opponent DTOs contain only revealed rings, contributing gems, and triggered enchantments; unrevealed item counts and placeholder records are omitted. The live interface presents revealed items in a separate read-only dock.
- Finished participant results reveal both complete loadouts from the immutable initial setup. The localized result view presents every resolved ring, gem, and enchantment without consulting mutable post-battle inventory state.
- Public competitive profiles expose only the current season's visible rank, rating, peak rank, wins, losses, and match count. Ratings and ranks remain hidden during placement matches. Inventory, equipment, loadouts, item progression, and technical account data are omitted. Public leaderboard names link to these profiles; private players remain anonymous and private profile requests are indistinguishable from unknown players. A player may still preview their own profile while their visibility is private.
- Regression coverage uses one shared player-facing policy for private, casual, and ranked PvP. Its
  test matrix locks anonymous search, limited pre-combat identity, staged live ring and effect
  reveals, own-only lobby loadout details, and complete participant loadouts after battle. API
  integration assertions independently verify that server responses respect the same boundaries.
- A summoned monster immediately reveals all current combat statistics and its skill.
- Finished battle results and participant-accessible replays reveal both complete loadout snapshots, including items that were never used.
- Public PvP profiles show visible rank, rating, peak rank, wins, losses, and match count. They never expose inventory, equipment, or saved loadouts.

#### Multiplayer Concurrency

- Status: decided and implemented for the current PvP lifecycle.
- Decision: Protect queue, acceptance, discipline, battle-action, timeout, and rating transitions with database-owned single-writer claims, optimistic guards, or serializable transactions with bounded retry.
- Reason: Reconnects, retries, multiple tabs, and simultaneous player requests must observe one authoritative result rather than create duplicate battles, penalties, actions, rewards, or rating settlements.
- Testing: Integration coverage sends simultaneous casual queue entries, ranked acceptances, duplicate declines and actions, concurrent proposal expirations, and reconnect reads during both timeout types.

#### Reconnection

- Status: decided.
- Decision: Live matches should be preserved during disconnects and allow players to reconnect.
- Reason: Mobile and browser sessions can be interrupted. Losing a match immediately on transient disconnect would be frustrating.
- Tradeoffs: This requires server-side match state, reconnection tokens or session recovery, and abandonment timeout rules later.

#### Initial PvP Entry Point

- Status: implemented with persistent HTTP state and authenticated WebSocket invalidation.
- Decision: Implement private matches by code before automatic matchmaking.
- Implementation: Prisma stores private matches and their two participants. The host creates a two-hour code, the guest joins it, each player locks an owned non-empty loadout, and the server atomically snapshots both loadouts into a `private_pvp` battle when both participants are ready. The authenticated session is the reconnect identity. Opening element duels have a separate persisted 90-second deadline with hidden locked choices, per-tie reset, one-player concession, no-choice draw, and deterministic resolution after three ties. Active turns have a persisted five-minute deadline that continues during disconnection and expires as a server-side concession. Lobby and battle changes are delivered as WebSocket invalidations with HTTP polling fallback.
- Reason: Private codes are simpler than matchmaking and make early multiplayer testing easier.
- Tradeoffs: Ranked mode is still desired later and requires its own competitive design.

#### Casual Matchmaking

- Status: implemented.
- Decision: Use a five-minute FIFO queue for unranked live PvP. Entering the queue requires an active non-empty loadout and snapshots its ordered ring instance IDs. A player cannot search while another PvP session is active, and cannot enter or create a private lobby while searching.
- Implementation: `CasualQueueEntry` records explicit waiting, matching, matched, cancelled, and expired states. The server atomically claims the oldest available opponent, creates a shared PvP session and `casual_pvp` battle, and links both entries to the result. Casual battles reuse private-PvP authority, reconnection, opening-duel and turn deadlines, hidden opponent rings, history, WebSocket invalidations, and HTTP polling fallback. They currently grant no rewards.
- Reason: Reusing the proven persistent battle lifecycle keeps matchmaking focused on pairing and queue integrity instead of duplicating combat infrastructure.
- Tradeoffs: FIFO matching does not account for player skill or latency. Those constraints belong to the future ranked design.

#### Ranked PvP

- Status: ranked matchmaking, battles, rating settlement, leaderboard, scheduled season lifecycle, and season rewards implemented.
- Rating: Use Glicko-2 with an initial rating of `1500`, initial rating deviation of `350`, initial volatility of `0.06`, volatility constraint `tau = 0.5`, conversion scale `173.7178`, convergence tolerance `0.000001`, and maximum persisted deviation `350`. New players complete five placement matches while their visible rank remains hidden; the internal rating is updated after every placement result.
- Visible ranks: Use Bronze, Silver, Gold, Platinum, Diamond, and Master. Bronze through Diamond each have three divisions; Master has no divisions. The thresholds are Bronze III below `1000`, Bronze II at `1000`, Bronze I at `1100`, Silver III at `1200`, Silver II at `1300`, Silver I at `1400`, Gold III at `1500`, Gold II at `1600`, Gold I at `1700`, Platinum III at `1800`, Platinum II at `1900`, Platinum I at `2000`, Diamond III at `2100`, Diamond II at `2200`, Diamond I at `2300`, and Master at `2400`.
- Matchmaking: Match primarily by rating while also constraining hero-level difference. Start at `+/-100` rating and `+/-2` hero levels, then expand every 15 seconds by `100` rating and two hero levels up to `+/-500` rating and `+/-10` hero levels. Equipment power is not a matchmaking input because match results should naturally incorporate its effect into rating.
- Rating settlement: Use only win, loss, or draw and the opponent's Glicko-2 state. Remaining health, battle duration, and turn count do not modify rating.
- Queue and acceptance: Snapshot the active non-empty loadout on queue entry. A search lasts five minutes. When an opponent is found, both players receive a 20-second acceptance window before the ranked battle is created.
- Queue penalties: Declining or timing out before acceptance does not change rating, but repeated occurrences apply matchmaking lockouts of 1, 5, 15, and 30 minutes. The occurrence streak resets after 24 hours without another miss.
- Abandonment: Leaving, conceding, disconnecting past the authoritative deadline, or otherwise abandoning after both players accept is settled as a normal ranked loss without an additional rating multiplier.
- Seasons: Seasons last eight weeks. A season transition retains 75% of the distance from the central `1500` rating and raises rating deviation to at least `200` so returning certainty is reduced without erasing prior performance.
- Inactivity: Rating decay applies to players who reach Diamond or Master after seven days without ranked play. Each additional complete seven-day period moves rating down by `25`, with a `2000` rating floor. Once decay starts, it continues toward the floor even if the rating crosses below Diamond, avoiding a one-step boundary oscillation.
- Rewards: Eligibility requires five completed placements. The reward uses the highest tier reached after placements, is not reduced by later losses or inactivity, ignores divisions, and grants one bundle rather than cumulative lower-tier bundles. Bronze through Master grant `500`, `750`, `1000`, `1500`, `2000`, and `3000` credits. Each tier grants exactly three deterministic, auditable, non-exclusive materials: Bronze `3 common`; Silver `2 common + 1 refined`; Gold `1 common + 2 refined`; Platinum `2 refined + 1 rare`; Diamond `1 refined + 2 rare`; Master `1 refined + 1 rare + 1 epic`. Every eligible reward also includes a permanent season-and-tier badge and profile title. Grants never expire and require an explicit claim.
- Repeat opponents: Avoid matching the same players again for 30 minutes when the available queue population permits it; this is a preference, not an absolute prohibition.
- Leaderboard: Expose the global top 100 plus the current player's position and nearby players. Only players who completed five placements receive a position. Order by rating descending, deviation ascending, wins descending, then player ID ascending for deterministic ties. Private profiles are anonymized for other viewers.
- Reason: Glicko-2 handles provisional and inactive players more accurately than a fixed Elo delta, while the visible rank structure remains understandable. Acceptance and progressive queue penalties reduce avoidable match abandonment without treating connection failures as completed losses.
- Tradeoffs: Ranked mode requires more persistence, transactional state transitions, scheduled season work, abuse monitoring, and balance parameters than casual matchmaking.
- Foundation implementation: The pure server module implements complete Glicko-2 rating-period updates, visible-rank resolution, range expansion, queue penalties, soft resets, and inactivity arithmetic without depending on Prisma, Nuxt, combat state, or wall-clock time. Prisma stores ranked seasons and one versioned rating, deviation, volatility, placement counter, record, and last-match timestamp per player and season in both SQLite and PostgreSQL. Ranked battle settlement updates both pre-match rating snapshots atomically, uses optimistic versions to reject concurrent writes, and records one immutable adjustment per player and battle. A unique settlement key and the `(battleRecordId, playerId)` constraint make retries idempotent and retain result provenance.
- Matchmaking implementation: Prisma persists ranked queue entries, immutable loadout/rating/hero-level snapshots, pairing keys, acceptance deadlines, accepted timestamps, linked battles, and per-player penalty state in SQLite and PostgreSQL. Matching requires mutually compatible expanded rating and hero-level ranges, prefers opponents not played in the previous 30 minutes, and atomically claims both entries. Bilateral acceptance creates a `ranked_pvp` battle through the existing authoritative PvP lifecycle. Declines and missed acceptances apply the configured lockout only to the responsible player. The localized `/battle/pvp/ranked` view exposes season rating, placements, current ranges, acceptance, penalties, and battle entry through WebSocket invalidations with polling fallback.
- Leaderboard implementation: The authenticated ranked API returns the active season's top 100, the current placed player's exact position, and a five-player window around that position without loading the complete leaderboard into application memory. The ranked view renders a dense responsive table, highlights the current player, and shows a placement requirement instead of assigning provisional players a public position.
- Season lifecycle implementation: Ranked seasons have an explicit one-to-one predecessor/successor relation in SQLite and PostgreSQL. An idempotent maintenance service runs at Nitro startup, hourly, and before ranked reads or queue entry. It advances every overdue eight-week season, closes the predecessor, expires unfinished queue entries, creates reset ratings for the successor, and stores immutable `season_soft_reset` journals. High-rank inactivity uses one unique journal key per player, inactivity anchor, and completed weekly period, so repeated or concurrent maintenance cannot intentionally apply the same decay twice. The UI exposes the previous and reset rating until the player finishes the new season's placements.
- Season reward implementation: Each placed rating persists its post-placement peak. Rollover creates one stable reward grant and one `RankedSeasonReward` per eligible player in the same serializable transition transaction. Material choices are SHA-256-derived from season, player, rarity, and slot, making retries deterministic without introducing globally shared drops. Claiming uses the existing atomic reward pipeline for credits and material stock, then upserts permanent badge and title ownership. Ranked and history views expose both pending and claimed season rewards.

#### Authentication

- Status: foundation and Google provider implemented; provider credentials pending per environment.
- Decision: Prefer OAuth login first, especially Google and Facebook, then add email and password authentication.
- Implementation: Prisma now stores provider identities separately from players and stores revocable, expiring sessions with only a SHA-256 token hash. Player-owned Nuxt APIs resolve a request-scoped player from an HttpOnly SameSite session cookie. Development builds can explicitly create a local `devPlayer` session, and logout suppresses automatic development bootstrap until the player signs in again.
- Google implementation: The Game App uses a server-side authorization-code exchange with browser-bound hashed state, PKCE S256, a ten-minute one-time database attempt, and the OpenID Connect UserInfo endpoint. Google access tokens are used only for the immediate UserInfo request and are not persisted. Accounts are keyed by Google `sub`; verified email is metadata and never an automatic cross-provider merge key.
- Reason: Accounts should be persistent to avoid frustrating data loss. OAuth can reduce account creation friction while email/password remains useful as a fallback or later option.
- Tradeoffs: Google Cloud consent and credentials remain operational configuration. Explicit account-link conflict handling, Facebook, email verification, password hashing, recovery flows, and production session cleanup remain separate implementation work.

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
- Authoring sources that generate active definitions belong under `packages/content/sources/`, while
  generated runtime definitions remain under `packages/content/src/definitions/`. The production v2
  item asset bible is `packages/content/sources/production-items-v2.asset-bible.json`.
- The production v2 asset bible covers all 289 active definitions: 54 rings, 54 gems, 69 monsters,
  42 production spells, and 70 materials. Every entry includes atlas-ready visual direction.
- Its `productionAtlases` manifest records all five item-family atlases as imported.
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
- Initial deployment direction: use OVH VPS hosting with Debian stable, Nginx, one Game App server
  instance, and a separate self-managed PostgreSQL server reachable by public IP with strict firewall
  rules. Deploy `staging.battleness.com` before `battleness.com`, use separate Google OAuth clients,
  and keep development authentication disabled on every public environment.
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
