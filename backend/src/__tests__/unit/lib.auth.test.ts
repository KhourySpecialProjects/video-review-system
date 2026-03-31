import { beforeEach, describe, expect, it, vi } from "vitest";

const authLibMocks = vi.hoisted(() => {
  const dotenvConfig = vi.fn();
  const betterAuth = vi.fn();
  const prismaAdapter = vi.fn();

  return {
    dotenvConfig,
    betterAuth,
    prismaAdapter,
    prismaInstance: { tag: "prisma" },
    adapterInstance: { tag: "adapter" },
    authInstance: { tag: "auth" },
  };
});

vi.mock("dotenv", () => ({
  default: {
    config: authLibMocks.dotenvConfig,
  },
}));

vi.mock("better-auth", () => ({
  betterAuth: authLibMocks.betterAuth,
}));

vi.mock("better-auth/adapters/prisma", () => ({
  prismaAdapter: authLibMocks.prismaAdapter,
}));

vi.mock("../../lib/prisma.js", () => ({
  default: authLibMocks.prismaInstance,
}));

describe("lib/auth", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    authLibMocks.prismaAdapter.mockReturnValue(authLibMocks.adapterInstance);
    authLibMocks.betterAuth.mockReturnValue(authLibMocks.authInstance);
  });

  // ========= Module Initialization =========

  it("builds Better Auth with the Prisma adapter and custom trusted origin", async () => {
    // Input: ALLOWED_ORIGIN is "https://portal.example.com" at module load
    // time.
    // Expected: dotenv loads the project .env path, prismaAdapter uses the
    // Prisma client with provider "postgresql", and Better Auth uses the custom
    // trusted origin with email/password enabled and sign-up disabled.
    process.env.ALLOWED_ORIGIN = "https://portal.example.com";

    const module = await import("../../lib/auth.js");

    expect(authLibMocks.dotenvConfig).toHaveBeenCalledWith({
      path: expect.stringMatching(/\.env$/),
    });
    expect(authLibMocks.prismaAdapter).toHaveBeenCalledWith(
      authLibMocks.prismaInstance,
      {
        provider: "postgresql",
      },
    );
    expect(authLibMocks.betterAuth).toHaveBeenCalledWith({
      database: authLibMocks.adapterInstance,
      emailAndPassword: {
        enabled: true,
        disableSignUp: true,
      },
      trustedOrigins: ["https://portal.example.com"],
    });
    expect(module.auth).toBe(authLibMocks.authInstance);
  });

  it("falls back to the localhost trusted origin when ALLOWED_ORIGIN is missing", async () => {
    // Input: ALLOWED_ORIGIN is not set at module load time.
    // Expected: Better Auth uses "http://localhost:5173" as the trusted
    // origin fallback.
    delete process.env.ALLOWED_ORIGIN;

    await import("../../lib/auth.js");

    expect(authLibMocks.betterAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        trustedOrigins: ["http://localhost:5173"],
      }),
    );
  });
});
