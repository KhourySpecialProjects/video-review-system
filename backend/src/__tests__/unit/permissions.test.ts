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

  it("accepts all supported permission row shapes, including scoped combinations", () => {
    // Input: one row for each supported shape.
    // Expected: validation returns true for standalone scopes and site-bounded combinations.
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

    expect(rows.every(validatePermissionShape)).toBe(true);
  });

  it("rejects malformed permission rows", () => {
    // Input: malformed rows with invalid scalar types or permission level values.
    // Expected: validation returns false so permission resolution can ignore them.
    const invalidPermissionLevel = {
      siteId: null,
      studyId: null,
      videoId: null,
      permissionLevel: "OWNER",
    } as PermissionRow;

    const invalidScopeType = {
      siteId: 123,
      studyId: null,
      videoId: null,
      permissionLevel: "READ",
    } as unknown as PermissionRow;

    expect(validatePermissionShape(invalidPermissionLevel)).toBe(false);
    expect(validatePermissionShape(invalidScopeType)).toBe(false);
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

  it("matches site-bounded study permissions only within the same site and study", () => {
    // Input: one row scoped to Study A within Site A and two video targets.
    // Expected: the row matches only the target with both the same site and study.
    const row: PermissionRow = {
      siteId: "site-a",
      studyId: "study-a",
      videoId: null,
      permissionLevel: "WRITE",
    };

    expect(matchesPermissionTarget(row, {
      siteId: "site-a",
      studyId: "study-a",
      videoId: "video-a",
    })).toBe(true);

    expect(matchesPermissionTarget(row, {
      siteId: "site-b",
      studyId: "study-a",
      videoId: "video-a",
    })).toBe(false);
  });

  it("matches study-bounded video permissions across all sites", () => {
    // Input: one row scoped to Video A within Study A and two video targets.
    // Expected: the row matches any site as long as the study and video match.
    const row: PermissionRow = {
      siteId: null,
      studyId: "study-a",
      videoId: "video-a",
      permissionLevel: "WRITE",
    };

    expect(matchesPermissionTarget(row, {
      siteId: "site-a",
      studyId: "study-a",
      videoId: "video-a",
    })).toBe(true);

    expect(matchesPermissionTarget(row, {
      siteId: "site-b",
      studyId: "study-a",
      videoId: "video-a",
    })).toBe(true);

    expect(matchesPermissionTarget(row, {
      siteId: "site-a",
      studyId: "study-b",
      videoId: "video-a",
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

  it("matches site-bounded video permissions only within the same site", () => {
    // Input: one row scoped to Video A within Site A and two video targets.
    // Expected: the row matches only the target with both the same site and video.
    const row: PermissionRow = {
      siteId: "site-a",
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
      siteId: "site-b",
      studyId: "study-a",
      videoId: "video-a",
    })).toBe(false);
  });

  it("matches fully scoped site, study, and video permissions exactly", () => {
    // Input: one row scoped to Video A within Study A within Site A and two targets.
    // Expected: the row matches only the exact site, study, and video combination.
    const row: PermissionRow = {
      siteId: "site-a",
      studyId: "study-a",
      videoId: "video-a",
      permissionLevel: "ADMIN",
    };

    expect(matchesPermissionTarget(row, {
      siteId: "site-a",
      studyId: "study-a",
      videoId: "video-a",
    })).toBe(true);

    expect(matchesPermissionTarget(row, {
      siteId: "site-a",
      studyId: "study-b",
      videoId: "video-a",
    })).toBe(false);
  });

  it("matches a fully specified cross-site study + video row", () => {
    // Input: a study + video row without site restriction and two targets.
    // Expected: the row matches the same study/video combination across sites.
    const row: PermissionRow = {
      siteId: null,
      studyId: "study-a",
      videoId: "video-a",
      permissionLevel: "ADMIN",
    };

    expect(matchesPermissionTarget(row, {
      siteId: "site-a",
      studyId: "study-a",
      videoId: "video-a",
    })).toBe(true);

    expect(matchesPermissionTarget(row, {
      siteId: "site-b",
      studyId: "study-a",
      videoId: "video-a",
    })).toBe(true);
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

  it("lets a more specific scoped combination override a weaker broader match", () => {
    // Input: a site-wide READ row and a stronger site+study+video row for one target.
    // Expected: the exact scoped row wins for that specific target.
    const rows: PermissionRow[] = [
      {
        siteId: "site-a",
        studyId: null,
        videoId: null,
        permissionLevel: "READ",
      },
      {
        siteId: "site-a",
        studyId: "study-a",
        videoId: "video-a",
        permissionLevel: "ADMIN",
      },
    ];

    const result = resolvePermissionLevel(rows, {
      siteId: "site-a",
      studyId: "study-a",
      videoId: "video-a",
    });

    expect(result).toBe("ADMIN");
  });

  it("resolves the strongest level when study + video scope also matches", () => {
    // Input: one study+video row and one weaker video-wide row for the same target.
    // Expected: the more specific stronger row wins.
    const rows: PermissionRow[] = [
      {
        siteId: null,
        studyId: "study-a",
        videoId: "video-a",
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

    expect(result).toBe("ADMIN");
  });
});
