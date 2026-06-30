import { describe, expect, it } from "vitest";
import {
  ContentReferenceError,
  definitions,
  fixtures,
  type ContentReferenceData,
  validateContentReferences,
} from "./index";

describe("content reference validation", () => {
  it("accepts the complete prototype content graph", () => {
    expect(() => validateContentReferences(createReferenceData())).not.toThrow();
  });

  it("reports unknown definitions and owners", () => {
    const data = createReferenceData();
    data.inventory.rings[0].definitionId = "missingRing";
    data.inventory.gems[0].ownerId = "missingPlayer";

    expectIssues(data, [
      'Ring instance "playerOne.ring.emberLoop" references unknown definition "missingRing".',
      'Gem instance "playerOne.gem.rubyShard" has unknown owner "missingPlayer".',
    ]);
  });

  it("reports invalid equipped-ring and socket relationships", () => {
    const data = createReferenceData();
    data.players[0].equippedRingInstanceIds.push("missing.ring", "missing.ring");
    data.inventory.rings[0].socketedGemInstanceIds.push("playerOne.gem.rubyShard");

    expectIssues(data, [
      'Player "playerOne" equipped rings contains duplicate reference "missing.ring".',
      'Player "playerOne" equips unknown ring instance "missing.ring".',
      'Ring instance "playerOne.ring.emberLoop" has 2 socketed gems but only 1 sockets.',
      'Ring instance "playerOne.ring.emberLoop" socketed gems contains duplicate reference "playerOne.gem.rubyShard".',
    ]);
  });

  it("reports missing, foreign, and reused enchantment instances", () => {
    const data = createReferenceData();
    const firstGem = data.inventory.gems[0];
    const secondGem = data.inventory.gems[1];
    const thirdGem = data.inventory.gems[2];

    firstGem.enchantment = {
      type: "spell",
      spellInstanceId: "missing.spell",
    };
    secondGem.enchantment = {
      type: "spell",
      spellInstanceId: "playerTwo.spell.iceShard",
    };
    thirdGem.enchantment = {
      type: "spell",
      spellInstanceId: "playerTwo.spell.iceShard",
    };

    expectIssues(data, [
      'Gem instance "playerOne.gem.rubyShard" references unknown spell instance "missing.spell".',
      'Gem instance "playerOne.gem.frostChip" references spell instance "playerTwo.spell.iceShard" owned by "playerTwo".',
      'Spell instance "playerTwo.spell.iceShard" enchants both "playerOne.gem.frostChip" and "playerOne.gem.sparkPrism".',
    ]);
  });

  it("reports globally duplicated instance IDs and invalid battle setup references", () => {
    const data = createReferenceData();
    data.inventory.spells[0].id = data.inventory.monsters[0].id;
    data.battleSetups[0].playerIds = ["playerOne", "playerOne"];
    data.battleSetups[0].initialMonsters = [
      {
        playerId: "missingPlayer",
        monsterId: "missingMonster",
      },
    ];

    expectIssues(data, [
      'Inventory instance ID "playerOne.monster.iceGuardian" is used by both a monster and a spell.',
      'Battle setup "basicDuel" must reference two different players.',
      'Battle setup "basicDuel" gives an initial monster to non-participant "missingPlayer".',
      'Battle setup "basicDuel" references unknown initial monster definition "missingMonster".',
    ]);
  });
});

function createReferenceData(): ContentReferenceData {
  return structuredClone({
    definitions: {
      rings: definitions.rings,
      gems: definitions.gems,
      monsters: definitions.monsters,
      spells: definitions.spells,
    },
    players: fixtures.players,
    inventory: fixtures.inventories,
    battleSetups: fixtures.battleSetups,
  }) as unknown as ContentReferenceData;
}

function expectIssues(data: ContentReferenceData, expectedIssues: readonly string[]): void {
  try {
    validateContentReferences(data);
    throw new Error("Expected content reference validation to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(ContentReferenceError);
    expect((error as ContentReferenceError).issues).toEqual(
      expect.arrayContaining([...expectedIssues]),
    );
  }
}
