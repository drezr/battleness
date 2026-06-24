# Resume

This file is a handoff for continuing BattleNess development on another computer or with another agent.

## Read First

Read these files before making changes:

- `docs/AGENT.md`: persistent instructions for future agents.
- `docs/PROJECT.md`: project summary, rules, glossary, proposed rules specification, and technical decisions.
- `docs/STATE.md`: change log for agent-assisted project modifications.

## Current Project State

- Project name: BattleNess.
- Current phase: planning and technical discussion before implementation.
- User intent: clean rebuild of an already-started game.
- No gameplay/application code has been implemented for the rebuild yet.
- The user handles commits and pushes to GitHub themselves.
- The `docs/` directory is currently untracked in git unless the user has staged it elsewhere.
- The first milestone is a local deterministic combat prototype focused on the combat engine.

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
- Monsters fight alongside the hero and have damage, health, cooldown, elemental type, and optional skills.
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

## Proposed Technical Direction

The following are proposals, not final decisions:

- Use an authoritative server for multiplayer.

## Not Decided Yet

- Browser game framework or rendering approach.
- Frontend application framework.
- Backend framework.
- ORM/database migration tool.
- Multiplayer transport.
- Matchmaking design.
- Asset pipeline.
- Test framework.
- Deployment platform.
- Combat UI direction beyond a simple prototype interface.

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

- Resolve the core combat rule questions before implementing the combat engine.

## Rule Questions Still Open

These questions are listed in `docs/PROJECT.md` and should be resolved before implementing the combat engine:

- What are the exact formulas for level, quality, damage, health, energy cost, cooldown, experience, and rewards?

## Recent Combat Rule Decisions

- Speed determines the starting player. If speed is tied, the lower-level hero starts. If speed and level are tied, an element choice duel decides the starting player.
- Each player has their own energy progression: 1 on that player's first turn, then +1 per own turn, capped at 8.
- Cooldowns decrement at the start of the controller's turn before actions.
- Players can use as many ready rings and ready monsters as energy, cooldowns, and rules allow.
- Rings and monsters can target heroes or monsters by default.
- Taunt prevents the opponent from targeting non-Taunt targets controlled by the Taunt owner's side.
- Taunt blocks opposing rings, monsters, and direct-damage spells unless a rule or effect explicitly allows otherwise.
- Enemy Taunt does not restrict a player targeting their own hero or their own monsters.
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
- BattleNess should not include healing mechanics, to keep combat dynamic.
- The initial combat engine should support explicit spell effects and include three direct-damage test spells: Spark, Firebolt, and Ice Shard.
- The initial direct-damage spell can target heroes or monsters, allies or enemies, including self-damage or damaging allied monsters.
- Spells do not directly add damage to their triggering ring; they resolve after ring and gem damage and apply their own effects afterward.
- The first combat prototype should read health, damage, energy cost, cooldown, and similar combat values directly from JSON content.
- Initial content should be split across separate JSON files, such as heroes, rings, gems, monsters, and spells.
- The engine should keep a clear stat-input boundary so level, quality, and progression formulas can be added later without rewriting core combat resolution.
- Engine tests should include both focused unit tests and full combat scenario tests loaded from JSON fixtures.
- Win-condition checks happen after each complete action resolution. If a hero is at 0 health at that point, the battle ends immediately.

## Elemental Design Direction

- Fire is oriented toward high damage and high cooldown time. Its associated special skills include Pierce and Rage.
- Electric is oriented toward low energy cost, high speed points, and low damage. Its associated special skills include Haste and MultiHit.
- Ice is oriented toward high health, low cooldown time, high energy cost, and low speed points. Its associated special skills include Taunt and Shield.

## Important Agent Behavior

- Do not implement code unless the user asks to move from discussion into implementation.
- Do not assume old code should be preserved.
- Prefer documenting proposals and asking the user to confirm/correct them during the planning phase.
- When implementation starts, keep the combat rules engine deterministic and separate from UI/framework/database concerns unless the user decides otherwise.
