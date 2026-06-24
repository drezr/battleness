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

## Proposed Technical Direction

The following are proposals, not final decisions:

- Use TypeScript across gameplay logic, frontend, backend, and tests.
- Implement combat rules as a pure deterministic TypeScript engine independent from UI, database, sockets, and framework code.
- Use an authoritative server for multiplayer.
- Make game content config-driven, likely JSON or a typed structured format.
- Make the first milestone a deterministic local combat prototype with hardcoded or minimal config content.

## Not Decided Yet

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

Suggested next step:

- Continue with point 4: decide the first milestone before choosing framework/tools. The current proposal is a local deterministic combat prototype.

## Rule Questions Still Open

These questions are listed in `docs/PROJECT.md` and should be resolved before implementing the combat engine:

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

## Important Agent Behavior

- Do not implement code unless the user asks to move from discussion into implementation.
- Do not assume old code should be preserved.
- Prefer documenting proposals and asking the user to confirm/correct them during the planning phase.
- When implementation starts, keep the combat rules engine deterministic and separate from UI/framework/database concerns unless the user decides otherwise.
