import { describe, expect, it } from "vitest";
import {
  comparePermissionLevels,
  matchesPermissionTarget,
  resolvePermissionLevel,
  validatePermissionShape,
  type PermissionRow,
} from "../../lib/permissions.js";

describe("permissions", () => {
  // ========= validatePermissionShape =========

  it("accepts the four supported permission row shapes", () => {
    // Input: one row for each supported shape.
    // Expected: validation returns true for global, site-wide, study-wide, and
    // video-only rows.
    const rows: PermissionRow[] = [
      {
        siteId: null,
        studyId: null,
        videoId: null,
        permissionLevel: "ADMIN",
      },
      {
        siteId: "site-a",
        studyId: null,
        videoId: null,
        permissionLevel: "EXPORT",
      },
      {
        siteId: null,
        studyId: "study-a",
        videoId: null,
        permissionLevel: "WRITE",
      },
      {
        siteId: null,
        studyId: null,
        videoId: "video-a",
        permissionLevel: "READ",
      },
    ];

    expect(rows.every(validatePermissionShape)).toBe(true);
  });

  it("rejects mixed scope shapes", () => {
    // Input: rows with more than one scope anchor set.
    // Expected: validation returns false for each ambiguous shape.
    const rows: PermissionRow[] = [
      {
        siteId: "site-a",
        studyId: "study-a",
        videoId: null,
        permissionLevel: "READ",
      },
      {
        siteId: "site-a",
        studyId: null,
        videoId: "video-a",
        permissionLevel: "READ",
      },
      {
        siteId: null,
        studyId: "study-a",
        videoId: "video-a",
        permissionLevel: "READ",
      },
      {
        siteId: "site-a",
        studyId: "study-a",
        videoId: "video-a",
        permissionLevel: "READ",
      },
    ];

    expect(rows.every((row) => !validatePermissionShape(row))).toBe(true);
  });

  // ========= comparePermissionLevels =========

  it("orders permission levels by strength", () => {
    // Input: adjacent permission levels in the configured strength order.
    // Expected: stronger levels compare greater than weaker levels.
    expect(comparePermissionLevels("ADMIN", "EXPORT")).toBeGreaterThan(0);
    expect(comparePermissionLevels("EXPORT", "WRITE")).toBeGreaterThan(0);
    expect(comparePermissionLevels("WRITE", "READ")).toBeGreaterThan(0);
    expect(comparePermissionLevels("READ", "READ")).toBe(0);
  });

  // ========= matchesPermissionTarget =========

  it("matches global permissions against any target", () => {
    // Input: a global row and a video target.
    // Expected: the row matches because global permissions apply everywhere.
    const row: PermissionRow = {
      siteId: null,
      studyId: null,
      videoId: null,
      permissionLevel: "ADMIN",
    };

    const matches = matchesPermissionTarget(row, {
      siteId: "site-a",
      studyId: "study-a",
      videoId: "video-a",
    });

    expect(matches).toBe(true);
  });

  it("matches site-wide permissions for resources in the same site only", () => {
    // Input: one site-wide row and two video targets.
    // Expected: the row matches only the target in the same site.
    const row: PermissionRow = {
      siteId: "site-a",
      studyId: null,
      videoId: null,
      permissionLevel: "EXPORT",
    };

    expect(matchesPermissionTarget(row, {
      siteId: "site-a",
      studyId: "study-a",
      videoId: "video-a",
    })).toBe(true);

    expect(matchesPermissionTarget(row, {
      siteId: "site-b",
      studyId: "study-b",
      videoId: "video-b",
    })).toBe(false);
  });

  it("matches study-wide permissions for the same study and its videos only", () => {
    // Input: one study-wide row and a study target plus an unrelated study.
    // Expected: the row matches only targets in the same study.
    const row: PermissionRow = {
      siteId: null,
      studyId: "study-a",
      videoId: null,
      permissionLevel: "WRITE",
    };

    expect(matchesPermissionTarget(row, {
      siteId: "site-a",
      studyId: "study-a",
    })).toBe(true);

    expect(matchesPermissionTarget(row, {
      siteId: "site-b",
      studyId: "study-b",
    })).toBe(false);
  });

  it("matches video-only permissions for the exact video only", () => {
    // Input: one video-only row and two video targets.
    // Expected: the row matches only the exact video ID.
    const row: PermissionRow = {
      siteId: null,
      studyId: null,
      videoId: "video-a",
      permissionLevel: "READ",
    };

    expect(matchesPermissionTarget(row, {
      siteId: "site-a",
      studyId: "study-a",
      videoId: "video-a",
    })).toBe(true);

    expect(matchesPermissionTarget(row, {
      siteId: "site-a",
      studyId: "study-a",
      videoId: "video-b",
    })).toBe(false);
  });

  it("never matches invalid permission row shapes", () => {
    // Input: an invalid mixed-shape row and a video target.
    // Expected: invalid rows are ignored by matching logic.
    const row: PermissionRow = {
      siteId: "site-a",
      studyId: "study-a",
      videoId: null,
      permissionLevel: "ADMIN",
    };

    expect(matchesPermissionTarget(row, {
      siteId: "site-a",
      studyId: "study-a",
      videoId: "video-a",
    })).toBe(false);
  });

  // ========= resolvePermissionLevel =========

  it("returns null when no rows match the target", () => {
    // Input: rows that do not apply to the checked video target.
    // Expected: resolution returns null.
    const rows: PermissionRow[] = [{
      siteId: "site-a",
      studyId: null,
      videoId: null,
      permissionLevel: "READ",
    }];

    const result = resolvePermissionLevel(rows, {
      siteId: "site-b",
      studyId: "study-b",
      videoId: "video-b",
    });

    expect(result).toBeNull();
  });

  it("returns the strongest matching permission level", () => {
    // Input: matching site-wide, study-wide, and video-only rows for one
    // target.
    // Expected: the strongest matching level wins.
    const rows: PermissionRow[] = [
      {
        siteId: "site-a",
        studyId: null,
        videoId: null,
        permissionLevel: "EXPORT",
      },
      {
        siteId: null,
        studyId: "study-a",
        videoId: null,
        permissionLevel: "READ",
      },
      {
        siteId: null,
        studyId: null,
        videoId: "video-a",
        permissionLevel: "WRITE",
      },
    ];

    const result = resolvePermissionLevel(rows, {
      siteId: "site-a",
      studyId: "study-a",
      videoId: "video-a",
    });

    expect(result).toBe("EXPORT");
  });

  it("ignores invalid rows when resolving a target", () => {
    // Input: one invalid stronger row and one valid weaker row.
    // Expected: the invalid row is ignored and the valid row decides the
    // result.
    const rows: PermissionRow[] = [
      {
        siteId: "site-a",
        studyId: "study-a",
        videoId: null,
        permissionLevel: "ADMIN",
      },
      {
        siteId: null,
        studyId: null,
        videoId: "video-a",
        permissionLevel: "READ",
      },
    ];

    const result = resolvePermissionLevel(rows, {
      siteId: "site-a",
      studyId: "study-a",
      videoId: "video-a",
    });

    expect(result).toBe("READ");
  });
});
