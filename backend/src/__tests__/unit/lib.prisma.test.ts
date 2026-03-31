import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaLibMocks = vi.hoisted(() => {
  const dotenvConfig = vi.fn();
  const Pool = vi.fn();
  const PrismaPg = vi.fn();
  const PrismaClient = vi.fn();

  return {
    dotenvConfig,
    Pool,
    PrismaPg,
    PrismaClient,
    poolInstance: { tag: "pool" },
    adapterInstance: { tag: "adapter" },
    prismaInstance: { tag: "prisma" },
  };
});

vi.mock("dotenv", () => ({
  default: {
    config: prismaLibMocks.dotenvConfig,
  },
}));

vi.mock("pg", () => ({
  default: {
    Pool: prismaLibMocks.Pool,
  },
}));

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: prismaLibMocks.PrismaPg,
}));

vi.mock("../../generated/prisma/client.js", () => ({
  PrismaClient: prismaLibMocks.PrismaClient,
}));

describe("lib/prisma", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    process.env.DIRECT_DATABASE_URL = "postgresql://demo:demo@localhost:5432/demo";

    prismaLibMocks.Pool.mockReturnValue(prismaLibMocks.poolInstance);
    prismaLibMocks.PrismaPg.mockReturnValue(prismaLibMocks.adapterInstance);
    prismaLibMocks.PrismaClient.mockReturnValue(prismaLibMocks.prismaInstance);
  });

  // ========= Module Initialization =========

  it("builds the Prisma client from DIRECT_DATABASE_URL", async () => {
    // Input: DIRECT_DATABASE_URL is
    // "postgresql://demo:demo@localhost:5432/demo" at module load time.
    // Expected: dotenv loads the project .env path, pg.Pool uses that
    // connection string, PrismaPg wraps the pool, and PrismaClient uses the
    // adapter.
    const module = await import("../../lib/prisma.js");

    expect(prismaLibMocks.dotenvConfig).toHaveBeenCalledWith({
      path: expect.stringMatching(/\.env$/),
    });
    expect(prismaLibMocks.Pool).toHaveBeenCalledWith({
      connectionString: "postgresql://demo:demo@localhost:5432/demo",
    });
    expect(prismaLibMocks.PrismaPg).toHaveBeenCalledWith(
      prismaLibMocks.poolInstance,
    );
    expect(prismaLibMocks.PrismaClient).toHaveBeenCalledWith({
      adapter: prismaLibMocks.adapterInstance,
    });
    expect(module.default).toBe(prismaLibMocks.prismaInstance);
  });

  it("reads the current env value each time the module is evaluated fresh", async () => {
    // Input: DIRECT_DATABASE_URL changes before a fresh module import.
    // Expected: pg.Pool uses the latest env value after module cache reset.
    process.env.DIRECT_DATABASE_URL = "postgresql://next:next@localhost:5432/next";

    await import("../../lib/prisma.js");

    expect(prismaLibMocks.Pool).toHaveBeenCalledWith({
      connectionString: "postgresql://next:next@localhost:5432/next",
    });
  });
});
