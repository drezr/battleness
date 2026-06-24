# Agent Instructions

These instructions are persistent project context for future agents working on BattleNess.

## Documentation

- For all future discussions and implementation work, record project modifications in `docs/STATE.md`.
- `docs/STATE.md` should track changes made to code, docs, configuration, data files, tests, and other project artifacts.
- Keep `docs/STATE.md` concise and ordered by date, with newest entries easy to find.
- Write all new information added to files in `docs/` in English.
- Record persistent project instructions in `docs/AGENT.md`.
- Record the project summary, game rules, and technical decisions in `docs/PROJECT.md`.
- Update `docs/PROJECT.md` when framework, architecture, database, deployment, or gameplay-rule decisions are made.

## Project Direction

- The game is called BattleNess.
- The current effort is a clean rebuild.
- Do not assume the old implementation should be preserved unless the user explicitly asks to reuse something.
- The game targets the browser with a mobile-first experience.
- The game is a turn-based one-versus-one combat game inspired by Hearthstone.
- Persistence should use SQL, with SQLite for development and PostgreSQL for production.
- The first milestone is a local deterministic browser combat prototype focused on the combat engine.
- The first prototype should let one local user control both combat sides through a simple UI.
- Use TypeScript across gameplay logic, frontend, backend, and tests where practical.
- Define early game content and test fixtures in JSON files.
- Initial game content should be split across separate JSON files, such as heroes, rings, gems, monsters, and spells.
- Engine tests should include focused unit tests and full combat scenario tests loaded from JSON fixtures.
- Multiplayer should eventually use an authoritative server, matchmaking, and turn-based real-time interaction.

## Current Discussion Status

- The framework/engine has not been selected yet.
- The architecture has not been selected yet.
- The frontend/backend framework choice has not been selected yet; Nuxt and a Phaser-based frontend are options to discuss later.
- The combat UI direction has not been selected yet; a simple UI is enough for the first prototype.
- Tooling choices such as bundler, tests, linting, and asset pipeline have not been finalized yet.
