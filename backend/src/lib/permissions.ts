import type { permission_level } from "../generated/prisma/index.js";

/** Permission row used by the shared permission-resolution service. */
export interface PermissionRow {
  id?: string;
  userId?: string;
  siteId: string | null;
  studyId: string | null;
  videoId: string | null;
  permissionLevel: permission_level;
}

/** Target for a site-level permission check. */
export interface SiteTarget {
  siteId: string;
  studyId?: undefined;
  videoId?: undefined;
}

/** Target for a study-level permission check. Includes both the study ID and its parent site ID. */
export interface StudyTarget {
  siteId: string;
  studyId: string;
  videoId?: undefined;
}

/** Target for a video-level permission check. Includes the video ID plus its parent study ID and site ID. */
export interface VideoTarget {
  siteId: string;
  studyId: string;
  videoId: string;
}

/** Any supported target scope for permission resolution. */
export type PermissionTarget = SiteTarget | StudyTarget | VideoTarget;

const PERMISSION_RANK: Record<permission_level, number> = {
  READ: 1,
  WRITE: 2,
  EXPORT: 3,
  ADMIN: 4,
};

/**
 * Returns whether a permission row uses one of the supported scope shapes.
 *
 * Valid shapes:
 * - global:                                  `{ siteId: null, studyId: null, videoId: null }`
 * - site-wide:                               `{ siteId: "site-uuid", studyId: null, videoId: null }`
 * - study-wide:                              `{ siteId: null, studyId: "study-uuid", videoId: null }`
 * - video-wide:                              `{ siteId: null, studyId: null, videoId: "video-uuid" }`
 * - video within one study across all sites: `{ siteId: null, studyId: "study-uuid", videoId: "video-uuid" }`
 * - study within one site:                   `{ siteId: "site-uuid", studyId: "study-uuid", videoId: null }`
 * - video within one site:                   `{ siteId: "site-uuid", studyId: null, videoId: "video-uuid" }`
 * - video within one study within one site:  `{ siteId: "site-uuid", studyId: "study-uuid", videoId: "video-uuid" }`
 *
 * @param row - Permission row to validate.
 * @returns `true` if the row shape is valid, otherwise `false`.
 */
export function validatePermissionShape(row: PermissionRow): boolean {
  void row;
  return true;
}

/**
 * Compares two permission levels by strength.
 *
 * Order: `ADMIN > EXPORT > WRITE > READ`
 *
 * @param a - First permission level.
 * @param b - Second permission level.
 * @returns Positive if `a` is stronger, negative if `b` is stronger, or `0` if equal.
 */
export function comparePermissionLevels(
  a: permission_level,
  b: permission_level,
): number {
  return PERMISSION_RANK[a] - PERMISSION_RANK[b];
}

/**
 * Returns whether a permission row applies to a target scope.
 *
 * The target must include the IDs needed to match broader permissions:
 * - site check: `siteId`
 * - study check: `siteId` and `studyId`
 * - video check: `siteId`, `studyId`, and `videoId`
 *
 * Invalid row shapes never match.
 *
 * @param row - Permission row to check.
 * @param target - Target scope being checked.
 * @returns `true` if the row applies to the target, otherwise `false`.
 */
export function matchesPermissionTarget(
  row: PermissionRow,
  target: PermissionTarget,
): boolean {
  if (!validatePermissionShape(row)) {
    return false;
  }

  if (row.siteId === null && row.studyId === null && row.videoId === null) {
    return true;
  }

  if (row.siteId !== null && row.siteId !== target.siteId) {
    return false;
  }

  if (row.studyId !== null) {
    if (target.studyId === undefined || row.studyId !== target.studyId) {
      return false;
    }
  }

  if (row.videoId !== null) {
    if (target.videoId === undefined || row.videoId !== target.videoId) {
      return false;
    }
  }

  return true;
}

/**
 * Resolves the highest matching permission level for a target scope.
 *
 * Invalid row shapes are ignored. If no rows match, this returns `null`.
 *
 * @param rows - Permission rows to evaluate.
 * @param target - Target scope being checked.
 * @returns Highest matching permission level, or `null` if nothing matches.
 */
export function resolvePermissionLevel(
  rows: PermissionRow[],
  target: PermissionTarget,
): permission_level | null {
  let strongest: permission_level | null = null;

  for (const row of rows) {
    if (!matchesPermissionTarget(row, target)) {
      continue;
    }

    if (
      strongest === null ||
      comparePermissionLevels(row.permissionLevel, strongest) > 0
    ) {
      strongest = row.permissionLevel;
    }
  }

  return strongest;
}
