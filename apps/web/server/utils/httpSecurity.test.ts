import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { createEvent, type H3Event } from "h3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyHttpSecurity, clearHttpRateLimitsForTests } from "./httpSecurity";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = {
    ...originalEnv,
    BATTLENESS_APP_ENV: "staging",
    BATTLENESS_PUBLIC_ORIGIN: "https://staging.battleness.com",
    BATTLENESS_DATABASE_URL: "postgresql://battleness:secret@203.0.113.10:5432/battleness",
    BATTLENESS_DEV_AUTH: "disabled",
    GOOGLE_OAUTH_CLIENT_ID: "google-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: "google-client-secret",
    GOOGLE_OAUTH_REDIRECT_URI: "https://staging.battleness.com/api/auth/google/callback",
  };
  clearHttpRateLimitsForTests();
});

afterEach(() => {
  process.env = { ...originalEnv };
  clearHttpRateLimitsForTests();
});

describe("HTTP security baseline", () => {
  it("sets coarse security headers without exposing diagnostics", () => {
    const event = requestEvent("/api/health/live", "GET");

    applyHttpSecurity(event);

    expect(event.node.res.getHeader("x-content-type-options")).toBe("nosniff");
    expect(event.node.res.getHeader("x-frame-options")).toBe("DENY");
    expect(event.node.res.getHeader("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(event.node.res.getHeader("permissions-policy")).toBe(
      "camera=(), microphone=(), geolocation=()",
    );
    expect(event.node.res.getHeader("strict-transport-security")).toBe(
      "max-age=31536000; includeSubDomains",
    );
    expect(event.node.res.getHeader("cache-control")).toBe("no-store");
  });

  it("rejects public state-changing API requests without a trusted origin", () => {
    const event = requestEvent("/api/market/game", "POST", {
      "content-length": "128",
      origin: "https://attacker.example",
    });

    expect(captureHttpSecurityError(event)).toMatchObject({
      statusCode: 403,
      statusMessage: "Request origin is not trusted.",
    });
  });

  it("accepts state-changing requests from the configured public origin", () => {
    const event = requestEvent("/api/market/game", "POST", {
      "content-length": "128",
      origin: "https://staging.battleness.com",
    });

    expect(() => applyHttpSecurity(event)).not.toThrow();
  });

  it("rejects oversized mutation bodies before route handlers parse them", () => {
    const event = requestEvent("/api/battle/live/battle-1/actions", "POST", {
      "content-length": String(20 * 1024),
      origin: "https://staging.battleness.com",
    });

    expect(captureHttpSecurityError(event)).toMatchObject({
      statusCode: 413,
      statusMessage: "Request body is too large.",
    });
  });

  it("rate limits authentication requests by forwarded client address", () => {
    for (let index = 0; index < 30; index += 1) {
      applyHttpSecurity(
        requestEvent("/api/auth/google", "GET", {
          "x-forwarded-for": "198.51.100.12",
        }),
      );
    }

    expect(
      captureHttpSecurityError(
        requestEvent("/api/auth/google", "GET", {
          "x-forwarded-for": "198.51.100.12",
        }),
      ),
    ).toMatchObject({
      statusCode: 429,
      statusMessage: "Too many requests.",
    });
  });

  it("leaves local development requests permissive", () => {
    process.env.BATTLENESS_APP_ENV = "local";
    delete process.env.BATTLENESS_PUBLIC_ORIGIN;
    const event = requestEvent("/api/market/game", "POST", {
      "content-length": String(200 * 1024),
      origin: "https://attacker.example",
    });

    expect(() => applyHttpSecurity(event)).not.toThrow();
    expect(event.node.res.getHeader("strict-transport-security")).toBeUndefined();
  });
});

function requestEvent(path: string, method: string, headers: Record<string, string> = {}): H3Event {
  const socket = new Socket();
  const request = new IncomingMessage(socket);
  request.url = path;
  request.method = method;
  request.headers = { ...headers };
  const response = new ServerResponse(request);
  return createEvent(request, response);
}

function captureHttpSecurityError(event: H3Event): unknown {
  try {
    applyHttpSecurity(event);
    return null;
  } catch (error) {
    return error;
  }
}
