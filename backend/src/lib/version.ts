import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// KEEP IN SYNC with frontend/src/lib/version.ts — see
// docs/superpowers/specs/2026-07-18-version-release-numbering-design.md

export interface VersionInfo {
  /** Full release string, e.g. "0.1.0+next.a1b2c3d". */
  version: string;
  /** SemVer base from /VERSION, e.g. "0.1.0". */
  base: string;
  /** Deploy channel (git branch), or "local". */
  branch: string;
  /** Full commit SHA, or "" when unknown. */
  commit: string;
  /** First 7 chars of the SHA, or "local". */
  shortCommit: string;
  /** ISO build timestamp, or null when not stamped. */
  builtAt: string | null;
}

/** Compose the full version string. Pure. Format is duplicated in the frontend. */
export function composeVersion(base: string, branch?: string, commit?: string): string {
  const channel = (branch ?? "").trim() || "local";
  const trimmedCommit = (commit ?? "").trim();
  const short = trimmedCommit ? trimmedCommit.slice(0, 7) : "local";
  return `${base}+${channel}.${short}`;
}

/** Build a VersionInfo from already-resolved parts. Pure. */
export function resolveVersionInfo(input: {
  base: string;
  branch?: string;
  commit?: string;
  builtAt?: string | null;
}): VersionInfo {
  const base = input.base.trim() || "0.0.0";
  const branch = (input.branch ?? "").trim() || "local";
  const commit = (input.commit ?? "").trim();
  const shortCommit = commit ? commit.slice(0, 7) : "local";
  return {
    version: composeVersion(base, branch, commit),
    base,
    branch,
    commit,
    shortCommit,
    // Match the frontend: empty/whitespace collapses to null, per the doc above.
    builtAt: (input.builtAt ?? "").trim() || null,
  };
}

/** Read the base from /VERSION across dev (cwd=backend/) and Docker (cwd=/app). */
function readVersionBase(): string {
  const candidates = [
    resolve(process.cwd(), "VERSION"), // Docker runtime: /app/VERSION
    resolve(process.cwd(), "../VERSION"), // local dev: repo-root VERSION
  ];
  for (const path of candidates) {
    try {
      const contents = readFileSync(path, "utf8").trim();
      if (contents) return contents;
    } catch {
      // try next candidate
    }
  }
  return "0.0.0";
}

/** Read the Docker build timestamp, if the image stamped one. */
function readBuiltAt(): string | null {
  const candidates = [
    resolve(process.cwd(), "BUILD_TIME"),
    resolve(process.cwd(), "../BUILD_TIME"),
  ];
  for (const path of candidates) {
    try {
      const contents = readFileSync(path, "utf8").trim();
      if (contents) return contents;
    } catch {
      // try next candidate
    }
  }
  return null;
}

/**
 * Read a git anchor (COMMIT/BRANCH) baked into the image at build time, across
 * dev (cwd=backend/) and Docker (cwd=/app). Returns null when absent or blank.
 */
function readAnchorFile(filename: string): string | null {
  const candidates = [
    resolve(process.cwd(), filename),
    resolve(process.cwd(), `../${filename}`),
  ];
  for (const path of candidates) {
    try {
      const contents = readFileSync(path, "utf8").trim();
      if (contents) return contents;
    } catch {
      // try next candidate
    }
  }
  return null;
}

/**
 * Choose the effective anchor value. A non-empty value baked at BUILD time wins;
 * the runtime env is only a fallback. This is the crux of the FE/BE parity fix:
 * Coolify supplies SOURCE_COMMIT/COOLIFY_BRANCH as build args (baked here, like
 * the frontend), NOT as runtime env — so reading env alone left the backend at
 * "local" while the frontend reported the real {channel}.{sha}. Pure.
 */
export function pickAnchor(baked: string | null, env: string | undefined): string | undefined {
  const trimmed = (baked ?? "").trim();
  if (trimmed) return trimmed;
  return env;
}

/**
 * Resolve the running app's version from the filesystem + Coolify env. Impure.
 * Memoized: VERSION/BUILD_TIME are baked into the image and the env is fixed at
 * runtime, so this reads disk once rather than on every `/api/version` hit (the
 * route is unauthenticated and polled per open tab).
 */
let cachedVersionInfo: VersionInfo | undefined;
export function getVersionInfo(): VersionInfo {
  return (cachedVersionInfo ??= resolveVersionInfo({
    base: readVersionBase(),
    branch: pickAnchor(readAnchorFile("BRANCH"), process.env.COOLIFY_BRANCH),
    commit: pickAnchor(readAnchorFile("COMMIT"), process.env.SOURCE_COMMIT),
    builtAt: readBuiltAt(),
  }));
}
