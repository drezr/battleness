# Agent Instructions

These instructions are persistent project context for future agents working on BattleNess.

## Documentation

- For all future discussions and implementation work, record project modifications in `docs/STATE.md`.
- `docs/STATE.md` should track changes made to code, docs, configuration, data files, tests, and other project artifacts.
- Keep `docs/STATE.md` concise and ordered by date, with newest entries easy to find.
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
- Multiplayer should eventually use an authoritative server, matchmaking, and turn-based real-time interaction.

## Current Discussion Status

- The framework/engine has not been selected yet.
- The architecture has not been selected yet.
- The data model approach has not been selected yet, though JSON/config-driven content is being considered.
- Tooling choices such as TypeScript, bundler, tests, linting, and asset pipeline have not been finalized yet.
