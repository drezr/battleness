import { defineWebSocketHandler } from "h3";
import { readPlayerSessionFromCookieHeader } from "../utils/authSession";
import {
  registerGameRealtimePeer,
  sendGameRealtimeEvent,
  unregisterGameRealtimePeer,
} from "../utils/gameRealtime";

function playerIdFromContext(context: Record<string, unknown>): string | null {
  return typeof context.playerId === "string" ? context.playerId : null;
}

export default defineWebSocketHandler({
  async upgrade(request) {
    const session = await readPlayerSessionFromCookieHeader(request.headers.get("cookie"));
    if (!session) {
      throw new Response("Authentication is required.", { status: 401 });
    }

    request.context.playerId = session.player.id;
    request.context.sessionId = session.id;
  },
  open(peer) {
    const playerId = playerIdFromContext(peer.context);
    if (!playerId) {
      peer.close(1008, "Authentication is required.");
      return;
    }

    registerGameRealtimePeer(playerId, peer);
    sendGameRealtimeEvent(peer, { type: "connected", occurredAt: new Date().toISOString() });
  },
  message(peer, message) {
    try {
      const payload = JSON.parse(message.text()) as { type?: unknown };
      if (payload.type === "ping") {
        sendGameRealtimeEvent(peer, { type: "pong", occurredAt: new Date().toISOString() });
      }
    } catch {
      // Client messages are optional heartbeats; invalid payloads do not affect game state.
    }
  },
  close(peer) {
    const playerId = playerIdFromContext(peer.context);
    if (playerId) {
      unregisterGameRealtimePeer(playerId, peer.id);
    }
  },
});
