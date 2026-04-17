export type {
    ReviewStatus,
    ReviewPermissionLevel as PermissionLevel,
    ReviewStudyStatus as StudyStatus,
    ReviewStudyOption as StudyOption,
    ReviewSiteOption as SiteOption,
    ReviewVideo,
    ReviewsResponse,
} from "@shared/review";

import type { ReviewStatus, ReviewsResponse } from "@shared/review";

/** @description Search/filter parameters for the reviews list. */
export type ReviewFilters = {
    /** @description Free-text search across video title / notes. */
    search?: string;
    /** @description Filter by study name (exact). */
    study?: string;
    /** @description Filter by site name (exact). */
    site?: string;
    /** @description Filter by review status. */
    status?: ReviewStatus;
    /** @description Start of upload date range (ISO string). */
    dateFrom?: string;
    /** @description End of upload date range (ISO string). */
    dateTo?: string;
    /** @description Current 1-indexed page number. */
    page?: number;
};

/**
 * @description Data returned by the reviews route loader. `filters` is
 * available immediately; `dataPromise` is deferred so the page streams in
 * with a skeleton via `<Suspense>` + `<Await>`.
 */
export type ReviewsLoaderData = {
    dataPromise: Promise<ReviewsResponse>;
    filters: ReviewFilters;
};
