import { randomUUID } from "node:crypto";
import { getHeader, getMethod, getRequestURL, setResponseHeader, type H3Event } from "h3";

const maximumStoredRecords = 100;
const maximumMessageLength = 500;
const validCorrelationId = /^[A-Za-z0-9._:-]{1,100}$/;
const records: OperationalErrorRecord[] = [];

export type OperationalErrorCategory =
  | "authentication"
  | "battle"
  | "market"
  | "matchmaking"
  | "server";

export type OperationalErrorRecord = {
  id: string;
  timestamp: string;
  severity: "warning" | "error";
  category: OperationalErrorCategory;
  source: "request" | "background";
  correlationId: string;
  statusCode: number;
  errorName: string;
  message: string;
  method: string | null;
  path: string | null;
  playerId: string | null;
  battleId: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

type BackgroundFailureInput = {
  category?: OperationalErrorCategory;
  correlationId?: string;
  error: unknown;
  metadata?: Record<string, string | number | boolean | null>;
};

export function initializeRequestObservability(event: H3Event): string {
  const suppliedId = getHeader(event, "x-request-id")?.trim();
  const correlationId =
    suppliedId && validCorrelationId.test(suppliedId) ? suppliedId : randomUUID();

  event.context.correlationId = correlationId;
  setResponseHeader(event, "x-request-id", correlationId);
  return correlationId;
}

export function captureRequestError(error: unknown, event: H3Event): OperationalErrorRecord {
  const path = safeRequestPath(event);
  const statusCode = errorStatusCode(error);
  const record: OperationalErrorRecord = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    severity: statusCode >= 500 ? "error" : "warning",
    category: requestCategory(path),
    source: "request",
    correlationId: contextString(event, "correlationId") ?? initializeRequestObservability(event),
    statusCode,
    errorName: errorName(error),
    message: errorMessage(error),
    method: safeRequestMethod(event),
    path,
    playerId: contextString(event, "playerId"),
    battleId: requestBattleId(event, path),
    metadata: {},
  };

  storeRecord(record);
  return record;
}

export function captureOperationalFailure(input: BackgroundFailureInput): OperationalErrorRecord {
  const record: OperationalErrorRecord = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    severity: "error",
    category: input.category ?? "server",
    source: "background",
    correlationId:
      input.correlationId && validCorrelationId.test(input.correlationId)
        ? input.correlationId
        : randomUUID(),
    statusCode: 500,
    errorName: errorName(input.error),
    message: errorMessage(input.error),
    method: null,
    path: null,
    playerId: null,
    battleId: null,
    metadata: input.metadata ?? {},
  };

  storeRecord(record);
  return record;
}

export function listOperationalErrors(): OperationalErrorRecord[] {
  return records.map((record) => ({ ...record, metadata: { ...record.metadata } })).reverse();
}

export function clearOperationalErrors(): number {
  const cleared = records.length;
  records.length = 0;
  return cleared;
}

export function operationalErrorCapacity(): number {
  return maximumStoredRecords;
}

function storeRecord(record: OperationalErrorRecord): void {
  records.push(record);
  if (records.length > maximumStoredRecords) {
    records.splice(0, records.length - maximumStoredRecords);
  }

  const output = JSON.stringify({ event: "operational_error", ...record });
  if (record.severity === "error") console.error(output);
  else console.warn(output);
}

function requestCategory(path: string | null): OperationalErrorCategory {
  if (!path) return "server";
  if (path.startsWith("/api/auth/")) return "authentication";
  if (path.startsWith("/api/pvp/")) return "matchmaking";
  if (path.startsWith("/api/battle/")) return "battle";
  if (path.startsWith("/api/market/")) return "market";
  return "server";
}

function requestBattleId(event: H3Event, path: string | null): string | null {
  const params = event.context.params as Record<string, unknown> | undefined;
  const parameterId = params?.battleId;
  if (typeof parameterId === "string" && parameterId) return parameterId;

  const match = path?.match(/^\/api\/battle\/live\/([^/]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function safeRequestPath(event: H3Event): string | null {
  try {
    return getRequestURL(event).pathname;
  } catch {
    return null;
  }
}

function safeRequestMethod(event: H3Event): string | null {
  try {
    return getMethod(event);
  } catch {
    return null;
  }
}

function contextString(event: H3Event, key: string): string | null {
  const value = event.context[key];
  return typeof value === "string" && value ? value : null;
}

function errorStatusCode(error: unknown): number {
  if (typeof error !== "object" || error === null) return 500;
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return typeof statusCode === "number" && statusCode >= 400 && statusCode <= 599
    ? statusCode
    : 500;
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown server error.";
  return message.slice(0, maximumMessageLength);
}
