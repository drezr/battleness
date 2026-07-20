export type BattlenessAppEnvironment = "local" | "staging" | "production";

export type DeploymentValidationResult = {
  environment: BattlenessAppEnvironment;
  publicDeployment: boolean;
  ok: boolean;
  errors: string[];
  publicOrigin: string | null;
};

const appEnvironmentVariable = "BATTLENESS_APP_ENV";
const publicOriginVariable = "BATTLENESS_PUBLIC_ORIGIN";

export function battlenessAppEnvironment(): BattlenessAppEnvironment {
  const configured = process.env[appEnvironmentVariable]?.trim();
  if (!configured) {
    return process.env.NODE_ENV === "production" ? "production" : "local";
  }
  if (configured === "local" || configured === "staging" || configured === "production") {
    return configured;
  }
  throw new Error(`${appEnvironmentVariable} must be local, staging, or production.`);
}

export function isPublicDeployment(): boolean {
  const environment = battlenessAppEnvironment();
  return environment === "staging" || environment === "production";
}

export function secureCookieRequired(): boolean {
  return isPublicDeployment() || process.env.NODE_ENV === "production";
}

export function isDevelopmentAuthAllowed(): boolean {
  return battlenessAppEnvironment() === "local" && process.env.BATTLENESS_DEV_AUTH !== "disabled";
}

export function publicOrigin(): string | null {
  const configured = process.env[publicOriginVariable]?.trim();
  return configured ? normalizePublicOrigin(configured) : null;
}

export function validateDeploymentEnvironment(): DeploymentValidationResult {
  const errors: string[] = [];
  let environment: BattlenessAppEnvironment;
  let origin: string | null = null;

  try {
    environment = battlenessAppEnvironment();
  } catch (error) {
    environment = "production";
    errors.push(error instanceof Error ? error.message : "Invalid application environment.");
  }

  const publicDeployment = environment === "staging" || environment === "production";

  try {
    origin = publicOrigin();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Invalid public origin.");
  }

  if (publicDeployment) {
    if (!origin) {
      errors.push(`${publicOriginVariable} is required for staging and production.`);
    }

    const databaseUrl = process.env.BATTLENESS_DATABASE_URL?.trim();
    if (!databaseUrl) {
      errors.push("BATTLENESS_DATABASE_URL is required for staging and production.");
    } else if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) {
      errors.push("BATTLENESS_DATABASE_URL must use PostgreSQL for staging and production.");
    }

    if (process.env.BATTLENESS_DEV_AUTH !== "disabled") {
      errors.push("BATTLENESS_DEV_AUTH must be disabled for staging and production.");
    }

    if (!process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()) {
      errors.push("GOOGLE_OAUTH_CLIENT_ID is required for staging and production.");
    }
    if (!process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()) {
      errors.push("GOOGLE_OAUTH_CLIENT_SECRET is required for staging and production.");
    }
    if (!process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim()) {
      errors.push("GOOGLE_OAUTH_REDIRECT_URI is required for staging and production.");
    }
  }

  return {
    environment,
    publicDeployment,
    ok: errors.length === 0,
    errors,
    publicOrigin: origin,
  };
}

export function assertValidDeploymentEnvironment(): DeploymentValidationResult {
  const result = validateDeploymentEnvironment();
  if (!result.ok) {
    throw new Error(`Invalid BattleNess deployment environment: ${result.errors.join(" ")}`);
  }
  return result;
}

function normalizePublicOrigin(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${publicOriginVariable} must be a valid absolute URL.`);
  }

  if (url.protocol !== "https:" && url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
    throw new Error(`${publicOriginVariable} must use HTTPS outside local development.`);
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${publicOriginVariable} must contain only scheme, host, and optional port.`);
  }
  return url.origin;
}
