import { describe, expect, it } from "vitest";
import {
  canShowPvpParticipantLoadout,
  pvpBattleModes,
  pvpPresentationPolicy,
  visibleBattleResultLoadouts,
  visiblePvpOpponent,
  visiblePvpOpponentRings,
} from "./pvpPresentation";

describe.each(pvpBattleModes)("%s presentation visibility", (mode) => {
  it("keeps matchmaking search anonymous", () => {
    expect(pvpPresentationPolicy(mode, "search")).toEqual({
      opponentIdentity: false,
      opponentLoadout: "hidden",
      currentPlayerLoadout: true,
    });
    expect(visiblePvpOpponent(mode, "search", { displayName: "Hidden" })).toBeNull();
  });

  it("shows only limited identity before combat", () => {
    const opponent = { displayName: "Opponent", level: 4 };
    expect(visiblePvpOpponent(mode, "preCombat", opponent)).toBe(opponent);
    expect(canShowPvpParticipantLoadout(mode, "preCombat", true)).toBe(true);
    expect(canShowPvpParticipantLoadout(mode, "preCombat", false)).toBe(false);
    expect(visiblePvpOpponentRings(mode, "preCombat", ["secret-ring"])).toEqual([]);
  });

  it("renders only the staged opponent rings supplied during combat", () => {
    const revealedRings = ["used-ring"];
    expect(pvpPresentationPolicy(mode, "live").opponentLoadout).toBe("staged");
    expect(visiblePvpOpponentRings(mode, "live", revealedRings)).toBe(revealedRings);
    expect(visiblePvpOpponentRings(mode, "live", undefined)).toEqual([]);
  });

  it("renders both complete loadouts in participant results", () => {
    const loadouts = [{ playerId: "viewer" }, { playerId: "opponent" }];
    expect(pvpPresentationPolicy(mode, "result").opponentLoadout).toBe("full");
    expect(visibleBattleResultLoadouts(mode, loadouts)).toBe(loadouts);
  });
});

it("does not restrict non-PvP battle result loadouts", () => {
  const loadouts = [{ playerId: "campaign-player" }];
  expect(visibleBattleResultLoadouts("campaign", loadouts)).toBe(loadouts);
});
