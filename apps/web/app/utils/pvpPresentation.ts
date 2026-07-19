export const pvpBattleModes = ["private_pvp", "casual_pvp", "ranked_pvp"] as const;

export type PvpBattleMode = (typeof pvpBattleModes)[number];
export type PvpVisibilityPhase = "search" | "preCombat" | "live" | "result";
export type PvpOpponentLoadoutVisibility = "hidden" | "staged" | "full";

export type PvpPresentationPolicy = {
  opponentIdentity: boolean;
  opponentLoadout: PvpOpponentLoadoutVisibility;
  currentPlayerLoadout: boolean;
};

const policies: Record<PvpVisibilityPhase, PvpPresentationPolicy> = {
  search: {
    opponentIdentity: false,
    opponentLoadout: "hidden",
    currentPlayerLoadout: true,
  },
  preCombat: {
    opponentIdentity: true,
    opponentLoadout: "hidden",
    currentPlayerLoadout: true,
  },
  live: {
    opponentIdentity: true,
    opponentLoadout: "staged",
    currentPlayerLoadout: true,
  },
  result: {
    opponentIdentity: true,
    opponentLoadout: "full",
    currentPlayerLoadout: true,
  },
};

export function isPvpBattleMode(mode: string): mode is PvpBattleMode {
  return pvpBattleModes.includes(mode as PvpBattleMode);
}

export function pvpPresentationPolicy(
  mode: PvpBattleMode,
  phase: PvpVisibilityPhase,
): PvpPresentationPolicy {
  void mode;
  return policies[phase];
}

export function visiblePvpOpponent<T>(
  mode: PvpBattleMode,
  phase: PvpVisibilityPhase,
  opponent: T | null | undefined,
): T | null {
  return pvpPresentationPolicy(mode, phase).opponentIdentity ? (opponent ?? null) : null;
}

export function canShowPvpParticipantLoadout(
  mode: PvpBattleMode,
  phase: PvpVisibilityPhase,
  isCurrentPlayer: boolean,
): boolean {
  const policy = pvpPresentationPolicy(mode, phase);
  return isCurrentPlayer ? policy.currentPlayerLoadout : policy.opponentLoadout === "full";
}

export function visiblePvpOpponentRings<T>(
  mode: PvpBattleMode,
  phase: PvpVisibilityPhase,
  rings: readonly T[] | undefined,
): readonly T[] {
  return pvpPresentationPolicy(mode, phase).opponentLoadout === "hidden" ? [] : (rings ?? []);
}

export function visibleBattleResultLoadouts<T>(mode: string, loadouts: readonly T[]): readonly T[] {
  if (!isPvpBattleMode(mode)) return loadouts;
  return pvpPresentationPolicy(mode, "result").opponentLoadout === "full" ? loadouts : [];
}
