import { createBattleSetupFromLab, type BattleLabConfig } from "@battleness/content";
import {
  applyBattleAction,
  createBattleState,
  type BattleAction,
  type BattleResult,
  type BattleState,
  type TargetId,
} from "@battleness/engine";

export type BattleLabSimulationResult = {
  preferredTieWinnerId: string;
  startingPlayerId: string | null;
  result: BattleResult | null;
  actionCount: number;
  turnCount: number;
  timedOut: boolean;
  finalHealth: Record<string, number>;
};

const maxSimulationActions = 500;

export function runBattleLabBatch(config: BattleLabConfig): BattleLabSimulationResult[] {
  return config.players.map((player) => runBattleLabSimulation(config, player.id));
}

export function runBattleLabSimulation(
  config: BattleLabConfig,
  preferredTieWinnerId: string,
): BattleLabSimulationResult {
  let state = createBattleState(createBattleSetupFromLab(config));
  let actionCount = 0;
  let turnCount = 0;

  if (state.status === "choosingFirstPlayer") {
    const preferredIndex = state.players.findIndex((player) => player.id === preferredTieWinnerId);
    if (preferredIndex < 0) {
      throw new Error(`Preferred tie winner ${preferredTieWinnerId} is not in the battle.`);
    }

    const elements = preferredIndex === 0 ? (["fire", "ice"] as const) : (["ice", "fire"] as const);
    for (const [index, player] of state.players.entries()) {
      state = applyBattleAction(state, {
        type: "chooseElement",
        playerId: player.id,
        element: elements[index]!,
      }).state;
      actionCount += 1;
    }
  }

  while (state.status === "active" && actionCount < maxSimulationActions) {
    const action = chooseGreedyAction(state);
    state = applyBattleAction(state, action).state;
    actionCount += 1;
    if (action.type === "endTurn") {
      turnCount += 1;
    }
  }

  return {
    preferredTieWinnerId,
    startingPlayerId: state.startingPlayerId,
    result: state.result,
    actionCount,
    turnCount,
    timedOut: state.status !== "finished",
    finalHealth: Object.fromEntries(state.players.map((player) => [player.id, player.hero.health])),
  };
}

function chooseGreedyAction(state: BattleState): BattleAction {
  const player = state.players.find((candidate) => candidate.id === state.activePlayerId);
  const opponent = state.players.find((candidate) => candidate.id !== state.activePlayerId);
  if (!player || !opponent) {
    throw new Error("Active Battle Lab simulation player or opponent was not found.");
  }

  const tauntTargets = opponent.monsters
    .filter((monster) => monster.skill === "taunt")
    .map((monster) => monster.id as TargetId);
  const targets = tauntTargets.length > 0 ? tauntTargets : ([`${opponent.id}.hero`] as TargetId[]);
  const firstTurnHeroProtection =
    player.id === state.startingPlayerId &&
    player.energy.turnCount === 1 &&
    tauntTargets.length === 0;

  const candidates: Array<{ action: BattleAction; score: number; id: string }> = [];

  for (const monster of player.monsters) {
    if (monster.currentCooldown > 0 || firstTurnHeroProtection) {
      continue;
    }
    for (const targetId of targets) {
      candidates.push({
        action: {
          type: "useMonster",
          playerId: player.id,
          monsterInstanceId: monster.id,
          targetId,
        },
        score: monster.damage,
        id: monster.id,
      });
    }
  }

  for (const ring of player.rings) {
    if (ring.currentCooldown > 0 || ring.energyCost > player.energy.current) {
      continue;
    }
    const hasSummon = ring.gems.some((gem) => gem.enchantment?.type === "monster");
    if (firstTurnHeroProtection && !hasSummon) {
      continue;
    }

    for (const targetId of targets) {
      const spellGems = ring.gems.filter((gem) => gem.enchantment?.type === "spell");
      const spellTargets = [targetId];
      const opponentHeroId = `${opponent.id}.hero` as TargetId;
      if (targetId !== opponentHeroId && spellGems.length > 0) {
        spellTargets.push(opponentHeroId);
      }

      for (const spellTarget of spellTargets) {
        const enchantmentTargets = Object.fromEntries(
          spellGems.map((gem) => [gem.id, spellTarget]),
        );
        candidates.push({
          action: {
            type: "useRing",
            playerId: player.id,
            ringInstanceId: ring.id,
            targetId,
            enchantmentTargets,
          },
          score: ringDamageScore(state, ring),
          id: `${ring.id}:${spellTarget}`,
        });
      }
    }
  }

  candidates.sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));

  for (const candidate of candidates) {
    try {
      applyBattleAction(state, candidate.action);
      return candidate.action;
    } catch {
      // A later enchantment can invalidate an otherwise legal target; try the next action.
    }
  }

  return {
    type: "endTurn",
    playerId: player.id,
  };
}

function ringDamageScore(
  state: BattleState,
  ring: BattleState["players"][number]["rings"][number],
): number {
  let score = ring.damage + ring.gems.reduce((sum, gem) => sum + gem.damage, 0);

  for (const gem of ring.gems) {
    if (gem.enchantment?.type !== "spell") {
      continue;
    }
    const spellId = gem.enchantment.resolvedDefinitionId ?? gem.enchantment.spellId;
    const spell = state.definitions.spells[spellId];
    score +=
      spell?.effects.reduce(
        (sum, effect) => sum + (effect.type === "dealDamage" ? effect.amount : 0),
        0,
      ) ?? 0;
  }

  return score;
}
