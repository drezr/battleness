import { createHash, randomBytes } from "node:crypto";
import type { H3Event } from "h3";
import { createError, deleteCookie, getCookie, setCookie } from "h3";
import { seedDevelopmentPlayer, usePrisma } from "./gameState";
import { developmentPlayerId, runAsPlayer } from "./playerContext";

const sessionCookieName = "battleness_session";
const signedOutCookieName = "battleness_signed_out";
const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1_000;
const sessionRenewalWindowMs = 7 * 24 * 60 * 60 * 1_000;
const developmentPlayerIds = new Set([developmentPlayerId, "devPlayer2"]);

export type AuthenticatedPlayerSession = {
  id: string;
  expiresAt: Date;
  player: {
    id: string;
    username: string;
    displayName: string;
  };
};

export function isDevelopmentAuthEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.BATTLENESS_DEV_AUTH !== "disabled";
}

export async function readPlayerSession(
  event: H3Event,
  options: { bootstrapDevelopment?: boolean } = {},
): Promise<AuthenticatedPlayerSession | null> {
  const rawToken = getCookie(event, sessionCookieName);

  if (rawToken) {
    const session = await findValidSession(rawToken);
    if (session) {
      await renewSessionIfNeeded(event, rawToken, session);
      return sessionView(session);
    }
    deleteCookie(event, sessionCookieName, sessionCookieOptions());
  }

  const mayBootstrapDevelopment =
    options.bootstrapDevelopment !== false &&
    isDevelopmentAuthEnabled() &&
    getCookie(event, signedOutCookieName) !== "1";

  if (!mayBootstrapDevelopment) {
    return null;
  }

  return createDevelopmentSession(event);
}

export async function readPlayerSessionFromCookieHeader(
  cookieHeader: string | null,
): Promise<AuthenticatedPlayerSession | null> {
  const rawToken = readCookieHeaderValue(cookieHeader, sessionCookieName);
  if (!rawToken) {
    return null;
  }

  const session = await findValidSession(rawToken);
  return session ? sessionView(session) : null;
}

export async function requirePlayerSession(event: H3Event): Promise<AuthenticatedPlayerSession> {
  const session = await readPlayerSession(event);
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "Authentication is required." });
  }
  return session;
}

export async function createDevelopmentSession(
  event: H3Event,
  playerId = developmentPlayerId,
): Promise<AuthenticatedPlayerSession> {
  if (!isDevelopmentAuthEnabled()) {
    throw createError({ statusCode: 404, statusMessage: "Not found." });
  }

  if (!developmentPlayerIds.has(playerId)) {
    throw createError({ statusCode: 400, statusMessage: "Unknown development player." });
  }

  const prisma = usePrisma();
  await runAsPlayer(playerId, () => seedDevelopmentPlayer(prisma));
  await prisma.authIdentity.upsert({
    where: {
      provider_providerAccountId: {
        provider: "local",
        providerAccountId: playerId,
      },
    },
    create: {
      playerId,
      provider: "local",
      providerAccountId: playerId,
    },
    update: { playerId },
  });

  deleteCookie(event, signedOutCookieName, sessionCookieOptions());
  return createPlayerSession(event, playerId);
}

export async function createPlayerSession(
  event: H3Event,
  playerId: string,
): Promise<AuthenticatedPlayerSession> {
  const prisma = usePrisma();
  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionLifetimeMs);
  const session = await prisma.playerSession.create({
    data: {
      playerId,
      tokenHash: hashToken(rawToken),
      expiresAt,
    },
    include: { player: true },
  });

  deleteCookie(event, signedOutCookieName, sessionCookieOptions());
  setSessionCookie(event, rawToken, expiresAt);
  return sessionView(session);
}

export async function revokePlayerSession(event: H3Event): Promise<void> {
  const rawToken = getCookie(event, sessionCookieName);
  if (rawToken) {
    await usePrisma().playerSession.updateMany({
      where: { tokenHash: hashToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  deleteCookie(event, sessionCookieName, sessionCookieOptions());
  setCookie(event, signedOutCookieName, "1", {
    ...sessionCookieOptions(),
    maxAge: 24 * 60 * 60,
  });
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function readCookieHeaderValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) {
      continue;
    }
    return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return null;
}

async function findValidSession(rawToken: string) {
  const session = await usePrisma().playerSession.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { player: true },
  });

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }
  return session;
}

async function renewSessionIfNeeded(
  event: H3Event,
  rawToken: string,
  session: NonNullable<Awaited<ReturnType<typeof findValidSession>>>,
): Promise<void> {
  const now = Date.now();
  const expiresSoon = session.expiresAt.getTime() - now <= sessionRenewalWindowMs;
  const expiresAt = expiresSoon ? new Date(now + sessionLifetimeMs) : session.expiresAt;

  await usePrisma().playerSession.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date(now), ...(expiresSoon ? { expiresAt } : {}) },
  });
  if (expiresSoon) {
    session.expiresAt = expiresAt;
    setSessionCookie(event, rawToken, expiresAt);
  }
}

function setSessionCookie(event: H3Event, rawToken: string, expiresAt: Date): void {
  setCookie(event, sessionCookieName, rawToken, {
    ...sessionCookieOptions(),
    expires: expiresAt,
  });
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

function sessionView(
  session: NonNullable<Awaited<ReturnType<typeof findValidSession>>>,
): AuthenticatedPlayerSession {
  return {
    id: session.id,
    expiresAt: session.expiresAt,
    player: {
      id: session.player.id,
      username: session.player.username,
      displayName: session.player.displayName ?? session.player.username,
    },
  };
}
