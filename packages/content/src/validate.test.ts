import { applyBattleAction, createBattleState, type BattleAction } from "@battleness/engine";
import { describe, expect, it } from "vitest";
import {
  createBattleSetupFromFixture,
  definitions,
  fixtures,
  locales,
  validateContent,
} from "./index";

describe("content package", () => {
  it("validates all prototype content and fixtures", () => {
    expect(() => validateContent()).not.toThrow();
  });

  it("includes the initial direct-damage spells", () => {
    const spellIds = definitions.spells.map((spell) => spell.id);

    expect(spellIds).toEqual(expect.arrayContaining(["spark", "firebolt", "iceShard"]));
  });

  it("includes the initial scenario fixtures and locale files", () => {
    expect(fixtures.scenarios.map((scenario) => scenario.id)).toEqual(
      expect.arrayContaining(["basicRingAttack", "summonAndTaunt", "spellSelfTargeting"]),
    );
    expect(locales.en["spell.firebolt.name"]).toBe("Firebolt");
    expect(locales.fr["spell.firebolt.name"]).toBe("Boule de feu");
  });

  it("creates a validated BattleSetup from prototype fixtures", () => {
    const setup = createBattleSetupFromFixture("basicDuel");
    const sparkBand = setup.players[0].rings.find((ring) => ring.definitionId === "sparkBand");

    expect(setup.players).toHaveLength(2);
    expect(setup.activePlayerId).toBe("playerOne");
    expect(sparkBand?.gems.length).toBe(2);
    expect(Object.keys(setup.definitions.spells)).toEqual(
      expect.arrayContaining(["spark", "firebolt", "iceShard"]),
    );
  });

  it("executes the initial JSON scenario fixtures through the engine", () => {
    for (const scenario of fixtures.scenarios) {
      let state = createBattleState(
        createBattleSetupFromFixture(scenario.battleSetupId ?? "basicDuel"),
      );

      for (const action of scenario.actions) {
        state = applyBattleAction(state, action as BattleAction).state;
      }

      const eventTypes = state.log.map((event) => event.type);
      expect(eventTypes).toEqual(expect.arrayContaining(scenario.expect.eventTypes ?? []));

      const expectedHealthByTarget =
        "health" in scenario.expect ? (scenario.expect.health ?? {}) : {};

      for (const [targetId, expectedHealth] of Object.entries(expectedHealthByTarget)) {
        const playerId = targetId.replace(".hero", "");
        const player = state.players.find((candidate) => candidate.id === playerId);
        expect(player?.hero.health).toBe(expectedHealth);
      }
    }
  });
});
