import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { createEvent, createError, type H3Event } from "h3";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  captureOperationalFailure,
  captureRequestError,
  clearOperationalErrors,
  initializeRequestObservability,
  listOperationalErrors,
  operationalErrorCapacity,
} from "./observability";

describe("server observability", () => {
  beforeEach(() => {
    clearOperationalErrors();
    vi.restoreAllMocks();
  });

  it("accepts a safe incoming correlation ID and returns it in the response", () => {
    const event = requestEvent("/api/player", "GET", "client-request.42");

    expect(initializeRequestObservability(event)).toBe("client-request.42");
    expect(event.context.correlationId).toBe("client-request.42");
    expect(event.node.res.getHeader("x-request-id")).toBe("client-request.42");
  });

  it("records request failures with safe battle and player context", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const event = requestEvent("/api/battle/live/battle-17/actions?secret=ignored", "POST");
    event.context.playerId = "devPlayer";
    event.context.params = { battleId: "battle-17" };
    initializeRequestObservability(event);

    const record = captureRequestError(
      createError({ statusCode: 409, statusMessage: "Stale action count." }),
      event,
    );

    expect(record).toMatchObject({
      severity: "warning",
      category: "battle",
      source: "request",
      statusCode: 409,
      method: "POST",
      path: "/api/battle/live/battle-17/actions",
      playerId: "devPlayer",
      battleId: "battle-17",
    });
    expect(record.correlationId).toMatch(/^[a-f0-9-]{36}$/);
    expect(JSON.stringify(record)).not.toContain("secret");
  });

  it("keeps a bounded newest-first development buffer", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    for (let index = 0; index <= operationalErrorCapacity(); index += 1) {
      captureOperationalFailure({
        category: "matchmaking",
        error: new Error(`failure-${index}`),
        metadata: { operation: "test" },
      });
    }

    const records = listOperationalErrors();
    expect(records).toHaveLength(operationalErrorCapacity());
    expect(records[0]?.message).toBe(`failure-${operationalErrorCapacity()}`);
    expect(records.at(-1)?.message).toBe("failure-1");
  });
});

function requestEvent(path: string, method: string, requestId?: string): H3Event {
  const socket = new Socket();
  const request = new IncomingMessage(socket);
  request.url = path;
  request.method = method;
  if (requestId) request.headers["x-request-id"] = requestId;
  const response = new ServerResponse(request);
  return createEvent(request, response);
}
