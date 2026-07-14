import type { H3Event } from "h3";
import { requirePlayerSession } from "./authSession";
import { developmentPlayerId, runAsPlayer } from "./playerContext";

type PlayerHandler<T> = (event: H3Event) => T | Promise<T>;

export function definePlayerHandler<T>(handler: PlayerHandler<T>) {
  return defineEventHandler(async (event) => {
    if (process.env.NODE_ENV === "test" && !("node" in event)) {
      return runAsPlayer(developmentPlayerId, () => handler(event));
    }

    const session = await requirePlayerSession(event);
    event.context.playerId = session.player.id;
    event.context.sessionId = session.id;
    return runAsPlayer(session.player.id, () => handler(event));
  });
}
