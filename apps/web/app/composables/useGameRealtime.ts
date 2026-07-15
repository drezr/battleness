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

export type GameRealtimeStatus = "connecting" | "connected" | "disconnected";

export function useGameRealtime(onEvent: (event: GameRealtimeEvent) => void) {
  const status = ref<GameRealtimeStatus>("disconnected");
  let socket: WebSocket | undefined;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let reconnectAttempt = 0;
  let stopped = false;

  function clearHeartbeat(): void {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = undefined;
    }
  }

  function scheduleReconnect(): void {
    if (stopped || reconnectTimer) {
      return;
    }

    const delay = Math.min(1_000 * 2 ** reconnectAttempt, 10_000);
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      connect();
    }, delay);
  }

  function connect(): void {
    if (import.meta.server || stopped) {
      return;
    }

    status.value = "connecting";
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    socket = new WebSocket(`${protocol}//${window.location.host}/_realtime`);

    socket.addEventListener("open", () => {
      status.value = "connected";
      reconnectAttempt = 0;
      clearHeartbeat();
      heartbeatTimer = setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "ping" }));
        }
      }, 25_000);
    });
    socket.addEventListener("message", (message) => {
      try {
        onEvent(JSON.parse(String(message.data)) as GameRealtimeEvent);
      } catch {
        // Invalid transport payloads are ignored; HTTP remains authoritative.
      }
    });
    socket.addEventListener("close", () => {
      clearHeartbeat();
      status.value = "disconnected";
      scheduleReconnect();
    });
    socket.addEventListener("error", () => socket?.close());
  }

  onMounted(connect);
  onUnmounted(() => {
    stopped = true;
    clearHeartbeat();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    socket?.close();
  });

  return { status: readonly(status) };
}
