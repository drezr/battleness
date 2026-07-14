import { AsyncLocalStorage } from "node:async_hooks";

type PlayerRequestContext = {
  playerId: string;
};

export const developmentPlayerId = "devPlayer";

const playerRequestStorage = new AsyncLocalStorage<PlayerRequestContext>();

export function runAsPlayer<T>(playerId: string, operation: () => T): T {
  return playerRequestStorage.run({ playerId }, operation);
}

export function currentPlayerId(): string {
  return playerRequestStorage.getStore()?.playerId ?? developmentPlayerId;
}
