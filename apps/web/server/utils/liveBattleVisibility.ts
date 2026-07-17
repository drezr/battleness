import type { BattleState, GemCombatInstance, RingCombatInstance } from "@battleness/engine";

export type LiveBattleRevealState = {
  ringIds: ReadonlySet<string>;
  gemIds: ReadonlySet<string>;
  enchantmentGemIds: ReadonlySet<string>;
};

type VisibilityState = Pick<BattleState, "players" | "log">;

export function liveBattleRevealState(
  state: VisibilityState,
  playerId: string,
): LiveBattleRevealState {
  const player = state.players.find((candidate) => candidate.id === playerId);
  const ringIds = new Set<string>();
  const gemIds = new Set<string>();
  const enchantmentGemIds = new Set<string>();
  let activeRing: RingCombatInstance | null = null;
  let pendingMonsterGems: GemCombatInstance[] = [];

  if (!player) {
    return { ringIds, gemIds, enchantmentGemIds };
  }

  const gemById = new Map(
    player.rings.flatMap((ring) => ring.gems.map((gem) => [gem.id, gem] as const)),
  );

  for (const event of state.log) {
    if (event.type === "ringUsed") {
      activeRing =
        event.playerId === playerId
          ? (player.rings.find((ring) => ring.id === event.ringInstanceId) ?? null)
          : null;
      pendingMonsterGems = activeRing
        ? activeRing.gems.filter((gem) => gem.enchantment?.type === "monster")
        : [];

      if (activeRing) {
        ringIds.add(activeRing.id);
        for (const gem of activeRing.gems) {
          gemIds.add(gem.id);
        }
      }
      continue;
    }

    if (event.type === "spellCast") {
      const gem = gemById.get(event.sourceGemId);
      if (gem) {
        gemIds.add(gem.id);
        enchantmentGemIds.add(gem.id);
      }
      continue;
    }

    if (event.type === "monsterSummoned" && event.playerId === playerId && activeRing) {
      const gemIndex = pendingMonsterGems.findIndex(
        (gem) =>
          gem.enchantment?.type === "monster" && gem.enchantment.monsterId === event.monsterId,
      );
      if (gemIndex >= 0) {
        const [gem] = pendingMonsterGems.splice(gemIndex, 1);
        if (gem) {
          gemIds.add(gem.id);
          enchantmentGemIds.add(gem.id);
        }
      }
      continue;
    }

    if (
      event.type === "monsterUsed" ||
      event.type === "turnEnded" ||
      event.type === "battleEnded"
    ) {
      activeRing = null;
      pendingMonsterGems = [];
    }
  }

  return { ringIds, gemIds, enchantmentGemIds };
}
