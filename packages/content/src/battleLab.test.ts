import { describe, expect, it } from "vitest";
import {
  createBattleSetupFromLab,
  parseBattleLabConfigJson,
  serializeBattleLabConfig,
  type BattleLabConfig,
} from "./battleLab";

const config: BattleLabConfig = {
  id: "battleLab",
  seed: "battle-lab-seed",
  players: [
    {
      id: "labPlayerOne",
      username: "Lab Player One",
      level: 3,
      rings: [
        {
          definitionId: "sparkBand",
          level: 2,
          quality: 60,
          gems: [
            {
              definitionId: "sparkPrism",
              level: 2,
              quality: 55,
              enchantment: {
                type: "spell",
                definitionId: "spark",
                level: 2,
                quality: 50,
              },
            },
          ],
        },
      ],
    },
    {
      id: "labPlayerTwo",
      username: "Lab Player Two",
      level: 4,
      rings: [
        {
          definitionId: "frostSeal",
          level: 3,
          quality: 70,
          gems: [
            {
              definitionId: "staticPearl",
              level: 3,
              quality: 65,
              enchantment: {
                type: "monster",
                definitionId: "iceGuardian",
                level: 3,
                quality: 60,
              },
            },
          ],
        },
      ],
    },
  ],
};

describe("Battle Lab setup", () => {
  it("resolves editable loadouts through the regular battle setup pipeline", () => {
    const setup = createBattleSetupFromLab(config);

    expect(setup.players[0].level).toBe(3);
    expect(setup.players[0].rings[0]?.definitionId).toBe("sparkBand");
    expect(setup.players[0].rings[0]?.gems[0]?.enchantment).toMatchObject({
      type: "spell",
      spellId: "spark",
    });
    expect(setup.players[1].rings[0]?.gems[0]?.enchantment).toMatchObject({
      type: "monster",
      monsterId: "iceGuardian",
    });
  });

  it("rejects invalid ring and socket limits", () => {
    expect(() =>
      createBattleSetupFromLab({
        ...config,
        players: [{ ...config.players[0], rings: [] }, config.players[1]],
      }),
    ).toThrow("must equip between 1 and 10 rings");

    expect(() =>
      createBattleSetupFromLab({
        ...config,
        players: [
          {
            ...config.players[0],
            rings: [
              {
                ...config.players[0].rings[0]!,
                gems: Array.from({ length: 4 }, () => ({
                  definitionId: "sparkPrism",
                  level: 1,
                  quality: 50,
                })),
              },
            ],
          },
          config.players[1],
        ],
      }),
    ).toThrow("cannot socket more than 3 gems");
  });

  it("round-trips valid JSON and rejects malformed or unknown content", () => {
    expect(parseBattleLabConfigJson(serializeBattleLabConfig(config))).toEqual(config);
    expect(() => parseBattleLabConfigJson("{broken")).toThrow("Battle Lab JSON is not valid JSON.");
    expect(() =>
      parseBattleLabConfigJson(
        JSON.stringify({
          ...config,
          players: [
            {
              ...config.players[0],
              rings: [{ ...config.players[0].rings[0], definitionId: "missingRing" }],
            },
            config.players[1],
          ],
        }),
      ),
    ).toThrow("Ring definition missingRing was not found.");
  });
});
