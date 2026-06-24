# State

This file records modifications made to the project during agent-assisted work.

## Current State

- BattleNess is being restarted as a clean rebuild.
- No gameplay/application code has been implemented in this restart yet.
- Technical discussion is in progress before choosing the framework, architecture, data model, and tooling.

## Change Log

### 2026-06-24

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
