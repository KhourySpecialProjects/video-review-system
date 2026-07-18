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
    builtAt: input.builtAt ?? null,
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

/** Resolve the running app's version from the filesystem + Coolify env. Impure. */
export function getVersionInfo(): VersionInfo {
  return resolveVersionInfo({
    base: readVersionBase(),
    branch: process.env.COOLIFY_BRANCH,
    commit: process.env.SOURCE_COMMIT,
    builtAt: readBuiltAt(),
  });
}
