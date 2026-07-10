/**
 * @description Review-status values surfaced to the frontend.
 * Mirrors the DB `review_status` enum in lowercase, human-readable form.
 */
export type ReviewStatus = "not reviewed" | "in review" | "reviewed";

/**
 * @description Permission-level values surfaced to the frontend reviewer list.
 * The DB `permission_level` enum has four values; EXPORT is mapped to "write"
 * since the reviewer UI only distinguishes three capability tiers.
 */
export type ReviewPermissionLevel = "read" | "write" | "admin";

/** @description Study status as surfaced to the frontend. */
export type ReviewStudyStatus = "ongoing" | "completed";

/** @description A study option shown in the reviews filter dropdown. */
export type ReviewStudyOption = {
  name: string;
  status: ReviewStudyStatus;
};

/** @description A site option shown in the reviews filter dropdown. */
export type ReviewSiteOption = {
  name: string;
};

/**
 * @description A single reviewer-video assignment card in the reviews list.
 * `id` is the source video id and is used to link to `/review/:videoId`.
 * `studyId` and `siteId` are carried alongside the names so the reviews
 * card can pass them as URL params when navigating to the review page
 * (which needs them to scope clips/sequences queries).
 */
export type ReviewVideo = {
  id: string;
  studyId: string;
  siteId: string;
  title?: string;
  reviewerName?: string;
  tags?: string[];
  reviewStatus: ReviewStatus;
  studyName: string;
  siteName: string;
  permissionLevel: ReviewPermissionLevel;
  /** @description ISO datetime string — when the source video was uploaded. */
  uploadedAt: string;
};

/** @description Response shape from `GET /domain/reviews`. */
export type ReviewsResponse = {
  videos: ReviewVideo[];
  totalCount: number;
  studies: ReviewStudyOption[];
  sites: ReviewSiteOption[];
};
