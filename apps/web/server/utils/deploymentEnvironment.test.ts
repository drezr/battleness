import { afterEach, describe, expect, it } from "vitest";
import {
  battlenessAppEnvironment,
  isDevelopmentAuthAllowed,
  secureCookieRequired,
  validateDeploymentEnvironment,
} from "./deploymentEnvironment";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("deployment environment", () => {
  it("defaults to local development outside production", () => {
    process.env.NODE_ENV = "test";
    delete process.env.BATTLENESS_APP_ENV;
    delete process.env.BATTLENESS_PUBLIC_ORIGIN;

    expect(battlenessAppEnvironment()).toBe("local");
    expect(isDevelopmentAuthAllowed()).toBe(true);
    expect(secureCookieRequired()).toBe(false);
    expect(validateDeploymentEnvironment()).toMatchObject({
      environment: "local",
      publicDeployment: false,
      ok: true,
      publicOrigin: null,
    });
  });

  it("requires explicit public deployment settings for staging", () => {
    process.env.BATTLENESS_APP_ENV = "staging";
    delete process.env.BATTLENESS_PUBLIC_ORIGIN;
    delete process.env.BATTLENESS_DATABASE_URL;
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    delete process.env.GOOGLE_OAUTH_REDIRECT_URI;
    delete process.env.BATTLENESS_DEV_AUTH;

    const result = validateDeploymentEnvironment();

    expect(result).toMatchObject({
      environment: "staging",
      publicDeployment: true,
      ok: false,
    });
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "BATTLENESS_PUBLIC_ORIGIN is required for staging and production.",
        "BATTLENESS_DATABASE_URL is required for staging and production.",
        "BATTLENESS_DEV_AUTH must be disabled for staging and production.",
        "GOOGLE_OAUTH_CLIENT_ID is required for staging and production.",
        "GOOGLE_OAUTH_CLIENT_SECRET is required for staging and production.",
        "GOOGLE_OAUTH_REDIRECT_URI is required for staging and production.",
      ]),
    );
  });

  it("accepts a complete staging configuration", () => {
    process.env.BATTLENESS_APP_ENV = "staging";
    process.env.BATTLENESS_PUBLIC_ORIGIN = "https://staging.battleness.com/";
    process.env.BATTLENESS_DATABASE_URL =
      "postgresql://battleness:secret@203.0.113.10:5432/battleness_staging";
    process.env.BATTLENESS_DEV_AUTH = "disabled";
    process.env.GOOGLE_OAUTH_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "google-client-secret";
    process.env.GOOGLE_OAUTH_REDIRECT_URI =
      "https://staging.battleness.com/api/auth/google/callback";

    expect(isDevelopmentAuthAllowed()).toBe(false);
    expect(secureCookieRequired()).toBe(true);
    expect(validateDeploymentEnvironment()).toEqual({
      environment: "staging",
      publicDeployment: true,
      ok: true,
      errors: [],
      publicOrigin: "https://staging.battleness.com",
    });
  });

  it("rejects insecure public origins and non-PostgreSQL public databases", () => {
    process.env.BATTLENESS_APP_ENV = "production";
    process.env.BATTLENESS_PUBLIC_ORIGIN = "http://battleness.com";
    process.env.BATTLENESS_DATABASE_URL = "file:../data/battleness.prisma.sqlite";
    process.env.BATTLENESS_DEV_AUTH = "disabled";
    process.env.GOOGLE_OAUTH_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "google-client-secret";
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://battleness.com/api/auth/google/callback";

    expect(validateDeploymentEnvironment().errors).toEqual(
      expect.arrayContaining([
        "BATTLENESS_PUBLIC_ORIGIN must use HTTPS outside local development.",
        "BATTLENESS_DATABASE_URL must use PostgreSQL for staging and production.",
      ]),
    );
  });
});
