import { createError, getHeader, getMethod, getRequestURL, setResponseHeader } from "h3";
import type { H3Event } from "h3";
import { isPublicDeployment, publicOrigin } from "./deploymentEnvironment";

type RateLimitRule = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitBucket = {
  resetAt: number;
  count: number;
};

const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const rateLimitBuckets = new Map<string, RateLimitBucket>();
const maximumBuckets = 10_000;

export function applyHttpSecurity(event: H3Event): void {
  setSecurityHeaders(event);
  if (!isPublicDeployment()) {
    return;
  }

  enforceRequestSize(event);
  enforceTrustedOrigin(event);
  enforceRateLimit(event);
}

export function clearHttpRateLimitsForTests(): void {
  rateLimitBuckets.clear();
}

function setSecurityHeaders(event: H3Event): void {
  setResponseHeader(event, "x-content-type-options", "nosniff");
  setResponseHeader(event, "x-frame-options", "DENY");
  setResponseHeader(event, "referrer-policy", "strict-origin-when-cross-origin");
  setResponseHeader(event, "permissions-policy", "camera=(), microphone=(), geolocation=()");

  if (isPublicDeployment()) {
    setResponseHeader(event, "strict-transport-security", "max-age=31536000; includeSubDomains");
  }

  if (safePath(event).startsWith("/api/")) {
    setResponseHeader(event, "cache-control", "no-store");
  }
}

function enforceTrustedOrigin(event: H3Event): void {
  if (!isStateChangingApiRequest(event)) {
    return;
  }

  const expectedOrigin = publicOrigin();
  const suppliedOrigin = getHeader(event, "origin")?.trim() || originFromReferer(event);
  if (!expectedOrigin || suppliedOrigin !== expectedOrigin) {
    throw createError({
      statusCode: 403,
      statusMessage: "Request origin is not trusted.",
    });
  }
}

function enforceRequestSize(event: H3Event): void {
  if (!isStateChangingApiRequest(event)) {
    return;
  }

  const contentLength = getHeader(event, "content-length")?.trim();
  if (!contentLength) {
    return;
  }
  const parsed = Number(contentLength);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw createError({ statusCode: 400, statusMessage: "Invalid request size." });
  }
  if (parsed > requestSizeLimitBytes(event)) {
    throw createError({ statusCode: 413, statusMessage: "Request body is too large." });
  }
}

function enforceRateLimit(event: H3Event): void {
  const rule = rateLimitRule(event);
  if (!rule) {
    return;
  }

  const now = Date.now();
  pruneExpiredBuckets(now);
  const bucketKey = `${rule.key}:${clientIdentifier(event)}`;
  const bucket = rateLimitBuckets.get(bucketKey);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(bucketKey, { count: 1, resetAt: now + rule.windowMs });
    return;
  }

  bucket.count += 1;
  if (bucket.count > rule.limit) {
    throw createError({
      statusCode: 429,
      statusMessage: "Too many requests.",
    });
  }
}

function isStateChangingApiRequest(event: H3Event): boolean {
  return safePath(event).startsWith("/api/") && mutatingMethods.has(safeMethod(event));
}

function requestSizeLimitBytes(event: H3Event): number {
  const path = safePath(event);
  if (path.startsWith("/api/auth/")) return 8 * 1024;
  if (path.startsWith("/api/battle/live/") && path.endsWith("/actions")) return 16 * 1024;
  if (path.startsWith("/api/market/")) return 32 * 1024;
  if (path.startsWith("/api/pvp/")) return 16 * 1024;
  return 64 * 1024;
}

function rateLimitRule(event: H3Event): RateLimitRule | null {
  const path = safePath(event);
  const method = safeMethod(event);

  if (path.startsWith("/api/auth/")) {
    return { key: "auth", limit: 30, windowMs: 5 * 60 * 1_000 };
  }
  if (method === "POST" && path.startsWith("/api/battle/live/") && path.endsWith("/actions")) {
    return { key: "combat", limit: 60, windowMs: 60 * 1_000 };
  }
  if (method === "POST" && path.startsWith("/api/pvp/")) {
    return { key: "matchmaking", limit: 30, windowMs: 60 * 1_000 };
  }
  if ((method === "POST" || method === "DELETE") && path.startsWith("/api/market/")) {
    return { key: "market", limit: 60, windowMs: 60 * 1_000 };
  }
  if (isStateChangingApiRequest(event)) {
    return { key: "mutation", limit: 120, windowMs: 60 * 1_000 };
  }
  return null;
}

function clientIdentifier(event: H3Event): string {
  const forwardedFor = getHeader(event, "x-forwarded-for")?.split(",")[0]?.trim();
  if (forwardedFor) {
    return forwardedFor;
  }
  const realIp = getHeader(event, "x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }
  return event.node.req.socket.remoteAddress ?? "unknown";
}

function originFromReferer(event: H3Event): string | null {
  const referer = getHeader(event, "referer")?.trim();
  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function pruneExpiredBuckets(now: number): void {
  if (rateLimitBuckets.size <= maximumBuckets) {
    return;
  }

  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
  if (rateLimitBuckets.size <= maximumBuckets) {
    return;
  }

  for (const key of rateLimitBuckets.keys()) {
    rateLimitBuckets.delete(key);
    if (rateLimitBuckets.size <= maximumBuckets) {
      return;
    }
  }
}

function safePath(event: H3Event): string {
  try {
    return getRequestURL(event).pathname;
  } catch {
    return "";
  }
}

function safeMethod(event: H3Event): string {
  try {
    return getMethod(event).toUpperCase();
  } catch {
    return "";
  }
}
