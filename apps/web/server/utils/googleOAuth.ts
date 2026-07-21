import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { H3Event } from "h3";
import { createError, deleteCookie, getCookie, getRequestURL, setCookie } from "h3";
import { createPlayerSession } from "./authSession";
import { publicOrigin, secureCookieRequired } from "./deploymentEnvironment";
import { ensurePlayerOnboarding, seedDevelopmentPlayer, usePrisma } from "./gameState";
import { runAsPlayer } from "./playerContext";

const googleAuthorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
const googleTokenEndpoint = "https://oauth2.googleapis.com/token";
const googleUserInfoEndpoint = "https://openidconnect.googleapis.com/v1/userinfo";
const oauthBindingCookieName = "battleness_oauth_binding";
const oauthAttemptLifetimeMs = 10 * 60 * 1_000;

type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

export function isGoogleOAuthEnabled(): boolean {
  return Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}

export async function beginGoogleOAuth(event: H3Event, requestedReturnTo?: string) {
  const config = googleOAuthConfig(event);
  const state = randomBytes(32).toString("base64url");
  const browserBinding = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(64).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  const expiresAt = new Date(Date.now() + oauthAttemptLifetimeMs);
  const prisma = usePrisma();

  await prisma.$transaction([
    prisma.oAuthLoginAttempt.deleteMany({ where: { expiresAt: { lte: new Date() } } }),
    prisma.oAuthLoginAttempt.create({
      data: {
        stateHash: hashSecret(state),
        provider: "google",
        browserBindingHash: hashSecret(browserBinding),
        codeVerifier,
        returnTo: normalizeReturnTo(requestedReturnTo),
        expiresAt,
      },
    }),
  ]);

  setCookie(event, oauthBindingCookieName, browserBinding, {
    ...oauthCookieOptions(),
    expires: expiresAt,
  });

  const authorizationUrl = new URL(googleAuthorizationEndpoint);
  authorizationUrl.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid profile email",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    include_granted_scopes: "true",
  }).toString();
  return authorizationUrl.toString();
}

export async function completeGoogleOAuth(
  event: H3Event,
  input: { code?: string; state?: string },
): Promise<{ returnTo: string }> {
  if (!input.code || !input.state) {
    throw oauthError("Google did not return the required authorization values.");
  }

  const config = googleOAuthConfig(event);
  const browserBinding = getCookie(event, oauthBindingCookieName);
  const stateHash = hashSecret(input.state);
  const prisma = usePrisma();
  const attempt = await prisma.$transaction(async (transaction) => {
    const storedAttempt = await transaction.oAuthLoginAttempt.findUnique({
      where: { stateHash },
    });
    if (
      !storedAttempt ||
      storedAttempt.provider !== "google" ||
      storedAttempt.expiresAt.getTime() <= Date.now() ||
      !browserBinding ||
      storedAttempt.browserBindingHash !== hashSecret(browserBinding)
    ) {
      throw oauthError("The Google authorization request is invalid or expired.");
    }
    await transaction.oAuthLoginAttempt.delete({ where: { stateHash } });
    return storedAttempt;
  });
  deleteCookie(event, oauthBindingCookieName, oauthCookieOptions());

  const accessToken = await exchangeAuthorizationCode(config, input.code, attempt.codeVerifier);
  const userInfo = await loadGoogleUserInfo(accessToken);
  const playerId = await resolveGooglePlayer(userInfo);
  await runAsPlayer(playerId, async () => {
    await seedDevelopmentPlayer(prisma);
    await ensurePlayerOnboarding(prisma);
  });
  await createPlayerSession(event, playerId);

  return { returnTo: attempt.returnTo };
}

function googleOAuthConfig(event: H3Event): GoogleOAuthConfig {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw createError({
      statusCode: 503,
      statusMessage: "Google authentication is not configured.",
    });
  }
  return {
    clientId,
    clientSecret,
    redirectUri:
      process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ||
      new URL(
        "/api/auth/google/callback",
        publicOrigin() ?? getRequestURL(event).origin,
      ).toString(),
  };
}

async function exchangeAuthorizationCode(
  config: GoogleOAuthConfig,
  code: string,
  codeVerifier: string,
): Promise<string> {
  const response = await fetch(googleTokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await response.json()) as { access_token?: string };
  if (!response.ok || !body.access_token) {
    throw oauthError("Google rejected the authorization code.");
  }
  return body.access_token;
}

async function loadGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(googleUserInfoEndpoint, {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  const userInfo = (await response.json()) as GoogleUserInfo;
  if (!response.ok || !userInfo.sub) {
    throw oauthError("Google did not return a valid account identifier.");
  }
  return userInfo;
}

async function resolveGooglePlayer(userInfo: GoogleUserInfo): Promise<string> {
  const prisma = usePrisma();
  const verifiedEmail = userInfo.email_verified ? userInfo.email?.trim().toLowerCase() : undefined;
  const existing = await prisma.authIdentity.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "google",
        providerAccountId: userInfo.sub!,
      },
    },
  });
  if (existing) {
    await prisma.$transaction([
      prisma.authIdentity.update({
        where: { id: existing.id },
        data: {
          email: verifiedEmail,
          emailVerifiedAt: verifiedEmail ? new Date() : null,
        },
      }),
      prisma.player.update({
        where: { id: existing.playerId },
        data: { lastActiveAt: new Date() },
      }),
    ]);
    return existing.playerId;
  }

  const playerId = randomUUID();
  const displayName = normalizedDisplayName(userInfo.name, verifiedEmail);
  try {
    await prisma.player.create({
      data: {
        id: playerId,
        username: generatedUsername(verifiedEmail, playerId),
        displayName,
        preferences: { create: {} },
        authIdentities: {
          create: {
            provider: "google",
            providerAccountId: userInfo.sub!,
            email: verifiedEmail,
            emailVerifiedAt: verifiedEmail ? new Date() : null,
          },
        },
      },
    });
    return playerId;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const racedIdentity = await prisma.authIdentity.findUniqueOrThrow({
        where: {
          provider_providerAccountId: {
            provider: "google",
            providerAccountId: userInfo.sub!,
          },
        },
      });
      return racedIdentity.playerId;
    }
    throw error;
  }
}

function normalizedDisplayName(name?: string, email?: string): string {
  const value = name?.trim() || email?.split("@")[0]?.trim() || "Player";
  return value.slice(0, 40);
}

function generatedUsername(email: string | undefined, playerId: string): string {
  const base = (email?.split("@")[0] || "player").replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 24);
  return `${base || "player"}-${playerId.slice(0, 8)}`;
}

function normalizeReturnTo(returnTo?: string): string {
  if (
    !returnTo ||
    !returnTo.startsWith("/") ||
    returnTo.startsWith("//") ||
    returnTo.includes("\\") ||
    returnTo.length > 500
  ) {
    return "/";
  }
  return returnTo;
}

function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function oauthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: secureCookieRequired(),
    path: "/api/auth/google",
  };
}

function oauthError(message: string) {
  return createError({ statusCode: 400, statusMessage: message });
}
