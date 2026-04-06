/** @description Possible review statuses for a video */
export type ReviewStatus = "not reviewed" | "in review" | "reviewed";

/** @description Permission levels a reviewer can have on a video */
export type PermissionLevel = "read" | "write" | "admin";

/** @description Status of a study */
export type StudyStatus = "ongoing" | "completed";

/** @description A study option for filtering */
export type StudyOption = {
    /** @param name - Display name of the study */
    name: string;
    /** @param status - Current status of the study */
    status: StudyStatus;
};

/** @description A site option for filtering */
export type SiteOption = {
    /** @param name - Display name of the site (hospital) */
    name: string;
};

/** @description A video assigned to a clinical reviewer */
export type ReviewVideo = {
    /** @param id - Unique identifier for the review assignment */
    id: string;
    /** @param title - Optional title of the video */
    title?: string;
    /** @param reviewerName - Name of the assigned reviewer */
    reviewerName?: string;
    /** @param tags - Tags associated with the video */
    tags?: string[];
    /** @param reviewStatus - Current review status */
    reviewStatus: ReviewStatus;
    /** @param studyName - Name of the study this video belongs to */
    studyName: string;
    /** @param siteName - Name of the site (hospital) where the video was recorded */
    siteName: string;
    /** @param permissionLevel - Reviewer's permission level for this video */
    permissionLevel: PermissionLevel;
    /** @param uploadedAt - ISO date string for when the video was uploaded */
    uploadedAt: string;
};

/** @description Search/filter parameters for the reviews list */
export type ReviewFilters = {
    /** @param search - Search query for video title */
    search?: string;
    /** @param study - Filter by study name */
    study?: string;
    /** @param site - Filter by site name */
    site?: string;
    /** @param status - Filter by review status */
    status?: ReviewStatus;
    /** @param dateFrom - Start of upload date range (ISO string) */
    dateFrom?: string;
    /** @param dateTo - End of upload date range (ISO string) */
    dateTo?: string;
    /** @param page - Current page number (1-indexed) */
    page?: number;
};

/** @description Data returned by the reviews route loader */
export type ReviewsLoaderData = {
    /** @param videos - List of review videos for the current page */
    videos: ReviewVideo[];
    /** @param totalCount - Total number of videos matching the current filters */
    totalCount: number;
    /** @param studies - Available study options for the filter dropdown */
    studies: StudyOption[];
    /** @param sites - Available site options for the filter dropdown */
    sites: SiteOption[];
    /** @param filters - The currently applied filters */
    filters: ReviewFilters;
};
