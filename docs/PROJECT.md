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
- Monsters fight alongside the hero and have damage, health, cooldown, and optional skills.
- Spells have unique effects.
- Monsters enter play with cooldown 1, so they cannot act until the next turn.
- The starting player cannot damage the opposing hero on the first turn, but can still summon monsters and cast spells.

### Progression And Item Concepts

- Heroes, rings, gems, monsters, and spells have experience and levels.
- Levels range from 0 to 50.
- Hero levels increase health and energy.
- Ring and gem levels increase damage.
- Monster levels increase damage and health.
- Spell levels reduce energy and cooldown penalties.
- Rings, gems, monsters, and spells have quality from 0 to 100%.
- Rings, gems, monsters, and spells have speed points, which contribute to hero speed.
- Elemental types are electric, fire, and ice.
- Electric beats fire, fire beats ice, and ice beats electric.
- Gems, monsters, and spells can add energy and cooldown penalties to the ring that contains them.
- Item rarity, from least rare to most rare, is normal, magic, rare, and legendary.

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

- Rarity: An item's scarcity and value tier. Current rarity order is normal, magic, rare, legendary.
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
- If both heroes have equal speed, the tie-break rule is not defined yet.
- Both heroes begin battle with their computed maximum health.
- All rings begin battle ready unless a later rule says otherwise.
- No monsters are in play at battle start unless a later rule adds pre-summoned monsters.

### Turn Structure

- Players alternate turns.
- At the start of each turn, the active player's available energy is restored for that turn.
- Turn energy starts at 1 on the first turn of the battle, increases by 1 on each later turn, and caps at 8.
- The active player may perform legal actions while they have available actions and resources.
- The active player may end their turn voluntarily.
- When the active player ends their turn, the other player becomes active.
- Exact timing for reducing cooldown counters is not final and must be decided before engine implementation.

### Legal Player Actions

- Use a ready ring if the active hero has enough energy to pay its current energy cost.
- Use a ready monster controlled by the active player, if monster actions are allowed by the final rules.
- End the turn.
- Other action types are not defined yet.

### Ring Use

- A ring can be used only by the active player.
- A ring can be used only if it is ready.
- A ring can be used only if the active hero can pay its current energy cost.
- Using a ring spends its energy cost.
- Using a ring applies the ring's damage and the damage from its gems to a legal target, unless damage is prevented by another rule.
- Using a ring triggers the enchantments contained by its gems.
- Using a ring puts that ring on cooldown.
- The exact order between ring damage, gem damage, monster summons, spell effects, and win-condition checks is not final.

### Gems And Enchantments

- A gem placed in a ring adds damage to that ring.
- A gem may be enchanted by a monster or a spell.
- When a ring is used, each gem's enchantment triggers.
- A monster enchantment summons that monster to fight alongside the hero.
- A spell enchantment applies that spell's effect.
- The order in which multiple socketed gems trigger is not final.
- The rule for what happens when a monster enchantment triggers while the same monster is already in play is not final.

### Monsters

- A monster is controlled by the player who summoned it.
- A monster has health, damage, cooldown, elemental type, and optionally a skill.
- A monster is destroyed when its health reaches 0.
- A summoned monster enters play with cooldown 1.
- Because summoned monsters enter with cooldown 1, they cannot act on the same turn they are summoned.
- A monster can damage a legal target when it is ready and its controller uses it, if monster actions are confirmed.
- Using a monster puts that monster on cooldown.
- The maximum number of monsters each side can control is not defined yet.
- Targeting restrictions for monsters are not defined yet.

### Spells

- A spell has a specific effect.
- Spell level reduces its energy penalty and cooldown penalty.
- A spell triggers when the ring containing its gem is used.
- Spell effects must eventually be specified as explicit engine effects, not free-form text.
- Spell targeting rules are not defined yet.
- Spell resolution order is not final.

### Cooldowns

- Rings and monsters can have cooldown values.
- A ring or monster on cooldown cannot be used.
- A newly summoned monster starts with cooldown 1.
- The exact moment cooldown counters decrement is not final.
- A proposed default is to decrement a player's cooldowns at the start of that player's turn, before actions are taken.
- Cooldown values should not go below 0.

### Energy

- Energy is restored at the start of each turn.
- Turn energy follows the battle turn number: 1 on turn 1, 2 on turn 2, and so on until the cap of 8.
- Energy not spent during a turn does not carry over unless a later rule changes this.
- A ring's current energy cost is based on its own energy value plus energy penalties from contained gems, monsters, and spells.
- Exact rounding and minimum cost rules are not defined yet.

### Damage And Targeting

- Damage reduces the target's health.
- A target can be a hero or monster if the acting object's targeting rules allow it.
- Health should not go below 0 in displayed state.
- Elemental advantage modifies damage between electric, fire, and ice.
- The exact elemental damage multiplier or formula is not defined yet.
- The starting player cannot damage the opposing hero during the first turn.
- The starting player may still summon monsters and cast spells during the first turn.
- It is not final whether first-turn damage prevention also prevents spell damage, monster damage, indirect damage, or damage to monsters.

### Win And Loss

- A player loses when their hero reaches 0 health.
- The opposing player wins when a hero reaches 0 health.
- If both heroes reach 0 health during the same resolution sequence, the result is not defined yet.
- Win-condition checks should happen at deterministic points during action resolution.

### Rewards

- After combat, rewards may include experience, credits, and materials.
- Equipped items gain experience after combat.
- In solo campaign, victory grants a fixed reward and unlocks the next opponent.
- In solo campaign, defeat grants only a small amount of item experience.
- In PvP, rewards vary based on player level and opponent level.
- In PvP defeat, the player receives a small amount of experience, credits, and 1 to 2 low-rarity materials.
- Exact reward formulas are not defined yet.

### Rule Questions To Resolve

- How is starting-player speed tie resolved?
- Is battle energy based on global turn number or each player's own turn count?
- When exactly do cooldowns decrement?
- Can monsters choose targets, and can they target heroes directly?
- Is there a maximum monster board size?
- Can duplicate monsters be in play from repeated enchantment triggers?
- What is the exact resolution order for ring damage, gem damage, summons, spells, cooldown application, and win checks?
- Does first-turn damage prevention block all damage to the opposing hero or only ring damage?
- What is the elemental advantage formula?
- What are the exact formulas for level, quality, damage, health, energy cost, cooldown, experience, and rewards?

## Technical Baseline

- Target platform: browser.
- UX priority: mobile first.
- Game type: turn-based card/hero battler.
- Persistence target: SQL database.
- Development database: SQLite.
- Production database: PostgreSQL.
- Multiplayer target: authoritative server with matchmaking and turn-based real-time interaction.
- Data model: JSON/config-driven content is being considered, but not decided.
- Engine/framework: not decided yet.
- Architecture: not decided yet.
- Tooling: TypeScript, bundler, tests, linting, and asset pipeline are expected topics, but not decided yet.

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

### Proposed

#### TypeScript Across The Stack

- Status: proposed.
- Decision: Use TypeScript for gameplay logic, frontend code, backend code, and tests where practical.
- Reason: BattleNess has many deterministic rules and nested item interactions. Shared types reduce drift between client, server, rules tests, and content validation.
- Tradeoffs: TypeScript adds build complexity and stricter modeling work up front, but should reduce long-term rule and API mistakes.

#### Pure Deterministic Combat Engine

- Status: proposed.
- Decision: Implement combat rules as a pure TypeScript engine independent from UI, database, sockets, and framework code.
- Reason: Turn-based multiplayer needs authoritative validation, replay/debug support, and strong automated tests.
- Tradeoffs: This adds an explicit boundary to maintain, but it lets the same rule engine power local prototypes, server validation, tests, bots, and simulations.

#### Authoritative Server For Multiplayer

- Status: proposed.
- Decision: Multiplayer matches should be resolved by an authoritative server, with clients sending intended actions instead of final state changes.
- Reason: Competitive turn-based games need consistent state, cheat resistance, reconnect support, and server-owned match outcomes.
- Tradeoffs: Server authority increases backend complexity and requires clear action validation, latency handling, and match lifecycle management.

#### Config-Driven Game Content

- Status: proposed.
- Decision: Define heroes, rings, gems, monsters, spells, materials, recipes, rewards, and similar content in structured config files, likely JSON or a typed superset.
- Reason: BattleNess has many item types and balance values that should be editable without changing engine code.
- Tradeoffs: Config-driven content improves iteration, but requires validation, stable schemas, migrations for saved items, and tooling to avoid invalid content.

#### First Milestone: Local Combat Prototype

- Status: proposed.
- Decision: Build the first playable milestone as a deterministic local combat prototype with hardcoded or minimal config content.
- Reason: The combat model is the core risk. Proving turn flow, energy, cooldowns, rings, gems, summons, spells, and win conditions should come before accounts, economy, matchmaking, or production deployment.
- Tradeoffs: This delays persistence and progression work, but reduces the chance of building backend/UI systems around unclear combat rules.

### Not Decided Yet

- Browser game framework or rendering approach.
- Frontend application framework.
- Backend framework.
- ORM/database migration tool.
- Multiplayer transport.
- Matchmaking design.
- Data/content file format.
- Asset pipeline.
- Test framework.
- Deployment platform.

## Open Technical Topics

- Browser game framework or rendering approach.
- Client/server architecture.
- Authoritative game-state model.
- Multiplayer transport and reconnection behavior.
- Matchmaking scope.
- Data schema for heroes, rings, gems, monsters, spells, materials, recipes, and rewards.
- Content authoring workflow.
- Testing strategy for deterministic game rules.
- Deployment strategy.
