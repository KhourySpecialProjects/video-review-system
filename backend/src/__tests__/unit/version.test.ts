import { describe, it, expect } from "vitest";
import { composeVersion, resolveVersionInfo } from "../../lib/version.js";

describe("composeVersion", () => {
  it("composes base + channel + short sha (canonical example)", () => {
    expect(composeVersion("0.1.0", "next", "a1b2c3d4e5f6")).toBe("0.1.0+next.a1b2c3d");
  });
  it("falls back to local channel and local short when branch/commit are empty", () => {
    expect(composeVersion("0.1.0", "", "")).toBe("0.1.0+local.local");
    expect(composeVersion("0.1.0")).toBe("0.1.0+local.local");
  });
  it("trims whitespace-only branch/commit to the fallbacks", () => {
    expect(composeVersion("0.1.0", "  ", "  ")).toBe("0.1.0+local.local");
  });
});

describe("resolveVersionInfo", () => {
  it("returns a fully-populated VersionInfo", () => {
    const info = resolveVersionInfo({
      base: "0.1.0",
      branch: "develop",
      commit: "abcdef1234567890",
      builtAt: "2026-07-18T00:00:00Z",
    });
    expect(info).toEqual({
      version: "0.1.0+develop.abcdef1",
      base: "0.1.0",
      branch: "develop",
      commit: "abcdef1234567890",
      shortCommit: "abcdef1",
      builtAt: "2026-07-18T00:00:00Z",
    });
  });
  it("normalizes empty branch/commit and null builtAt", () => {
    const info = resolveVersionInfo({ base: "0.1.0" });
    expect(info.version).toBe("0.1.0+local.local");
    expect(info.branch).toBe("local");
    expect(info.commit).toBe("");
    expect(info.shortCommit).toBe("local");
    expect(info.builtAt).toBeNull();
  });
  it("collapses an empty/whitespace builtAt to null (matches the frontend)", () => {
    expect(resolveVersionInfo({ base: "0.1.0", builtAt: "" }).builtAt).toBeNull();
    expect(resolveVersionInfo({ base: "0.1.0", builtAt: "  " }).builtAt).toBeNull();
  });
});
