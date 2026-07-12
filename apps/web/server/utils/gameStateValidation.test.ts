import { describe, expect, it } from "vitest";
import {
  type PlayerGameStateSnapshot,
  validatePlayerGameStateSnapshot,
} from "./gameStateValidation";

const baseSnapshot = {
  player: { id: "playerOne", activeLoadoutId: null },
  inventoryItems: [
    item({ id: "playerOne.ring.emberLoop", type: "ring", definitionId: "emberLoop", socketCount: 2 }),
    item({ id: "playerOne.gem.rubyShard", type: "gem", definitionId: "rubyShard" }),
    item({ id: "playerOne.monster.emberImp", type: "monster", definitionId: "emberImp" }),
    item({ id: "playerOne.spell.firebolt", type: "spell", definitionId: "firebolt" }),
  ],
  materialStock: [{ playerId: "playerOne", materialId: "aluminium", quantity: 2 }],
  ringSockets: [
    {
      playerId: "playerOne",
      ringItemId: "playerOne.ring.emberLoop",
      socketIndex: 0,
      gemItemId: "playerOne.gem.rubyShard",
    },
  ],
  gemEnchantments: [
    {
      playerId: "playerOne",
      gemItemId: "playerOne.gem.rubyShard",
      targetItemId: "playerOne.spell.firebolt",
      targetType: "spell",
    },
  ],
  equippedRings: [
    {
      playerId: "playerOne",
      ringItemId: "playerOne.ring.emberLoop",
      slotIndex: 0,
    },
  ],
  loadouts: [
    {
      id: "loadoutOne",
      playerId: "playerOne",
      rings: [
        {
          loadoutId: "loadoutOne",
          ringItemId: "playerOne.ring.emberLoop",
          slotIndex: 0,
        },
      ],
    },
  ],
  rewardGrants: [
    {
      playerId: "playerOne",
      status: "unclaimed",
      credits: 100,
      heroExperience: 0,
      materials: [{ materialId: "aluminium", quantity: 1 }],
      items: [{ inventoryItemId: "playerOne.ring.emberLoop", experience: 8 }],
    },
  ],
} satisfies PlayerGameStateSnapshot;

describe("validatePlayerGameStateSnapshot", () => {
  it("accepts a consistent player game state", () => {
    expect(validatePlayerGameStateSnapshot(baseSnapshot)).toEqual([]);
  });

  it("reports invalid socket ownership, type, and capacity", () => {
    const issues = validatePlayerGameStateSnapshot({
      ...baseSnapshot,
      inventoryItems: [
        item({
          id: "playerOne.ring.emberLoop",
          type: "ring",
          definitionId: "emberLoop",
          socketCount: 1,
        }),
        item({ id: "playerOne.spell.firebolt", type: "spell", definitionId: "firebolt" }),
      ],
      ringSockets: [
        {
          playerId: "playerTwo",
          ringItemId: "playerOne.ring.emberLoop",
          socketIndex: 1,
          gemItemId: "playerOne.spell.firebolt",
        },
      ],
      gemEnchantments: [],
      loadouts: [],
      rewardGrants: [],
    });

    expect(issues).toContain('Ring socket for ring "playerOne.ring.emberLoop" is owned by "playerTwo".');
    expect(issues).toContain('Ring socket index is invalid for ring "playerOne.ring.emberLoop".');
    expect(issues).toContain('Ring socket references non-gem item "playerOne.spell.firebolt".');
  });

  it("reports invalid gem enchantment targets", () => {
    const issues = validatePlayerGameStateSnapshot({
      ...baseSnapshot,
      gemEnchantments: [
        {
          playerId: "playerOne",
          gemItemId: "playerOne.gem.rubyShard",
          targetItemId: "playerOne.monster.emberImp",
          targetType: "spell",
        },
      ],
    });

    expect(issues).toContain(
      'Gem enchantment target "playerOne.monster.emberImp" does not match target type.',
    );
  });

  it("reports equipped-ring and loadout limit violations", () => {
    const equippedRings = Array.from({ length: 11 }, (_, index) => ({
      playerId: "playerOne",
      ringItemId: "playerOne.ring.emberLoop",
      slotIndex: index,
    }));
    const loadoutRings = equippedRings.map((ring) => ({
      loadoutId: "loadoutOne",
      ringItemId: ring.ringItemId,
      slotIndex: ring.slotIndex,
    }));

    const issues = validatePlayerGameStateSnapshot({
      ...baseSnapshot,
      equippedRings,
      loadouts: [
        {
          id: "loadoutOne",
          playerId: "playerOne",
          rings: loadoutRings,
        },
      ],
    });

    expect(issues).toContain('Player "playerOne" has more than 10 equipped rings.');
    expect(issues).toContain('Loadout "loadoutOne" has more than 10 rings.');
    expect(issues).toContain('Equipped ring "playerOne.ring.emberLoop" has invalid slot index.');
    expect(issues).toContain('Loadout ring "playerOne.ring.emberLoop" has invalid slot index.');
  });

  it("reports invalid reward references", () => {
    const issues = validatePlayerGameStateSnapshot({
      ...baseSnapshot,
      rewardGrants: [
        {
          playerId: "playerOne",
          status: "paid",
          credits: -1,
          heroExperience: -1,
          materials: [{ materialId: "missingMaterial", quantity: -1 }],
          items: [{ inventoryItemId: "missingItem", experience: -1 }],
        },
      ],
    });

    expect(issues).toContain('Reward grant has invalid status "paid".');
    expect(issues).toContain("Reward grant has invalid credits.");
    expect(issues).toContain("Reward grant has invalid hero experience.");
    expect(issues).toContain('Reward grant references unknown material "missingMaterial".');
    expect(issues).toContain('Reward material "missingMaterial" has invalid quantity.');
    expect(issues).toContain('Reward item references missing inventory item "missingItem".');
    expect(issues).toContain('Reward item "missingItem" has invalid experience.');
  });
});

function item(input: {
  id: string;
  type: string;
  definitionId: string;
  playerId?: string;
  socketCount?: number | null;
}) {
  return {
    id: input.id,
    playerId: input.playerId ?? "playerOne",
    type: input.type,
    definitionId: input.definitionId,
    experience: 0,
    quality: 0,
    socketCount: input.socketCount ?? null,
    socketedGemInstanceIds: "[]",
    enchantment: null,
    equipped: input.type === "ring",
  };
}
