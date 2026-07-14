import { afterEach, describe, expect, it, vi } from "vitest";
import {
  publishGameRealtimeEvent,
  registerGameRealtimePeer,
  unregisterGameRealtimePeer,
} from "./gameRealtime";

const playerIds = ["player-one", "player-two"];
const peerIds = ["peer-one", "peer-two", "peer-three"];

afterEach(() => {
  for (const playerId of playerIds) {
    for (const peerId of peerIds) {
      unregisterGameRealtimePeer(playerId, peerId);
    }
  }
});

describe("game realtime event hub", () => {
  it("publishes only to every connection owned by the selected players", () => {
    const firstTab = { id: "peer-one", send: vi.fn() };
    const secondTab = { id: "peer-two", send: vi.fn() };
    const otherPlayer = { id: "peer-three", send: vi.fn() };
    registerGameRealtimePeer("player-one", firstTab);
    registerGameRealtimePeer("player-one", secondTab);
    registerGameRealtimePeer("player-two", otherPlayer);

    publishGameRealtimeEvent(["player-one"], {
      type: "privateMatchChanged",
      matchId: "match-1",
      reason: "ready",
    });

    expect(firstTab.send).toHaveBeenCalledOnce();
    expect(secondTab.send).toHaveBeenCalledOnce();
    expect(otherPlayer.send).not.toHaveBeenCalled();
    expect(JSON.parse(firstTab.send.mock.calls[0]![0])).toMatchObject({
      type: "privateMatchChanged",
      matchId: "match-1",
      reason: "ready",
      occurredAt: expect.any(String),
    });
  });

  it("removes a connection that fails while receiving an event", () => {
    const failedPeer = {
      id: "peer-one",
      send: vi.fn(() => {
        throw new Error("closed");
      }),
    };
    registerGameRealtimePeer("player-one", failedPeer);

    publishGameRealtimeEvent(["player-one"], {
      type: "battleChanged",
      battleId: "battle-1",
      reason: "action",
    });
    publishGameRealtimeEvent(["player-one"], {
      type: "battleChanged",
      battleId: "battle-1",
      reason: "action",
    });

    expect(failedPeer.send).toHaveBeenCalledOnce();
  });

  it("removes a connection whose asynchronous delivery is rejected", async () => {
    const failedPeer = {
      id: "peer-one",
      send: vi.fn(() => Promise.reject(new Error("closed"))),
    };
    registerGameRealtimePeer("player-one", failedPeer);

    publishGameRealtimeEvent(["player-one"], {
      type: "battleChanged",
      battleId: "battle-1",
      reason: "action",
    });
    await Promise.resolve();
    await Promise.resolve();
    publishGameRealtimeEvent(["player-one"], {
      type: "battleChanged",
      battleId: "battle-1",
      reason: "action",
    });

    expect(failedPeer.send).toHaveBeenCalledOnce();
  });
});
