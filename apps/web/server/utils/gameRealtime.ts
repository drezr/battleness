export type GameRealtimeEvent =
  | { type: "connected"; occurredAt: string }
  | { type: "pong"; occurredAt: string }
  | {
      type: "privateMatchChanged";
      matchId: string;
      reason: "created" | "joined" | "ready" | "left" | "started" | "finished";
      occurredAt: string;
    }
  | {
      type: "battleChanged";
      battleId: string;
      reason: "action" | "timeout";
      occurredAt: string;
    }
  | {
      type: "casualQueueChanged";
      reason: "queued" | "matched" | "cancelled" | "expired";
      battleId: string | null;
      occurredAt: string;
    }
  | {
      type: "rankedQueueChanged";
      reason: "queued" | "proposal" | "accepted" | "matched" | "cancelled" | "declined" | "expired";
      battleId: string | null;
      occurredAt: string;
    };

type RealtimePeer = {
  id: string;
  send: (data: string) => unknown;
};

type PublishableGameRealtimeEvent = GameRealtimeEvent extends infer Event
  ? Event extends { occurredAt: string }
    ? Omit<Event, "occurredAt">
    : never
  : never;

const peersByPlayer = new Map<string, Map<string, RealtimePeer>>();

export function registerGameRealtimePeer(playerId: string, peer: RealtimePeer): void {
  const playerPeers = peersByPlayer.get(playerId) ?? new Map<string, RealtimePeer>();
  playerPeers.set(peer.id, peer);
  peersByPlayer.set(playerId, playerPeers);
}

export function unregisterGameRealtimePeer(playerId: string, peerId: string): void {
  const playerPeers = peersByPlayer.get(playerId);
  if (!playerPeers) {
    return;
  }

  playerPeers.delete(peerId);
  if (playerPeers.size === 0) {
    peersByPlayer.delete(playerId);
  }
}

export function sendGameRealtimeEvent(peer: RealtimePeer, event: GameRealtimeEvent): void {
  try {
    void Promise.resolve(peer.send(JSON.stringify(event))).catch(() => undefined);
  } catch {
    // Transport delivery must never affect authoritative game state.
  }
}

export function publishGameRealtimeEvent(
  playerIds: Iterable<string>,
  event: PublishableGameRealtimeEvent,
): void {
  const payload = JSON.stringify({ ...event, occurredAt: new Date().toISOString() });

  for (const playerId of new Set(playerIds)) {
    const playerPeers = peersByPlayer.get(playerId);
    if (!playerPeers) {
      continue;
    }

    for (const [peerId, peer] of playerPeers) {
      try {
        void Promise.resolve(peer.send(payload)).catch(() =>
          unregisterGameRealtimePeer(playerId, peerId),
        );
      } catch {
        unregisterGameRealtimePeer(playerId, peerId);
      }
    }
  }
}
