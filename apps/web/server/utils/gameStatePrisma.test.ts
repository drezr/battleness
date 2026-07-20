import { afterEach, describe, expect, it } from "vitest";
import { disconnectGameStateClientForTests, seedDevelopmentPlayer, usePrisma } from "./gameState";

const originalEnv = { ...process.env };

afterEach(async () => {
  process.env = { ...originalEnv };
  await disconnectGameStateClientForTests();
});

describe("Prisma client lifecycle", () => {
  it("reuses the same client in production for a stable database URL", async () => {
    process.env.NODE_ENV = "production";
    process.env.BATTLENESS_DATABASE_URL = "file:./production-cache-test.sqlite";

    expect(usePrisma()).toBe(usePrisma());
  });

  it("does not seed development data in public deployments", async () => {
    process.env.BATTLENESS_APP_ENV = "staging";
    const client = new Proxy(
      {},
      {
        get() {
          throw new Error("Development seed should not touch Prisma in public deployments.");
        },
      },
    );

    await expect(seedDevelopmentPlayer(client as never)).resolves.toBeUndefined();
  });
});
