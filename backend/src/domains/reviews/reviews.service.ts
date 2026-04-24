import prisma from "../../lib/prisma.js";
import { buildScopeFilter, type PermissionContext } from "../../middleware/auth.js";
import { resolvePermissionLevel } from "../../lib/permissions.js";
import type {
    Prisma,
    permission_level,
    review_status,
} from "../../generated/prisma/client.js";
import type {
    ReviewPermissionLevel,
    ReviewStatus,
    ReviewStudyStatus,
    ReviewsQuery,
    ReviewsResponse,
} from "./reviews.types.js";

/**
 * @description Maps DB permission_level enum to the lowercase string the
 * reviewer UI expects. EXPORT is folded into "write" since the UI only
 * distinguishes read / write / admin.
 */
const PERMISSION_LABEL: Record<permission_level, ReviewPermissionLevel> = {
    READ: "read",
    WRITE: "write",
    EXPORT: "write",
    ADMIN: "admin",
};

/** @description Maps the DB review_status enum to the UI's lowercase string. */
const REVIEW_STATUS_LABEL: Record<review_status, ReviewStatus> = {
    NOT_REVIEWED: "not reviewed",
    IN_REVIEW: "in review",
    REVIEWED: "reviewed",
};

/** @description Inverse of REVIEW_STATUS_LABEL — used when filtering by status. */
const REVIEW_STATUS_TO_DB: Record<ReviewStatus, review_status> = {
    "not reviewed": "NOT_REVIEWED",
    "in review": "IN_REVIEW",
    "reviewed": "REVIEWED",
};

/** @description Maps the DB study_status enum to the UI's two-bucket label. */
const STUDY_STATUS_LABEL: Record<"NOT_STARTED" | "IN_PROGRESS" | "FINISHED", ReviewStudyStatus> = {
    NOT_STARTED: "ongoing",
    IN_PROGRESS: "ongoing",
    FINISHED: "completed",
};

/**
 * @description Lists the reviewer-video assignments visible to the given user,
 * filtered + paginated by the provided query. Also returns the distinct
 * studies and sites the user has access to (for the filter dropdowns).
 *
 * @param permissionCtx - Pre-fetched permission context from middleware
 * @param query - Parsed & validated query params from the URL
 * @returns The page of ReviewVideos plus totalCount and dropdown options
 */
export async function listReviewsForUser(
    permissionCtx: PermissionContext,
    query: ReviewsQuery,
): Promise<ReviewsResponse> {
    const scopeFilter = buildScopeFilter(permissionCtx);

    const where: Prisma.VideoStudyWhereInput = { ...scopeFilter };

    if (query.study) where.study = { name: query.study };
    if (query.site) where.site = { name: query.site };
    if (query.status) where.reviewStatus = REVIEW_STATUS_TO_DB[query.status];

    const videoWhere: Prisma.VideoWhereInput = { status: "UPLOADED" };
    if (query.dateFrom || query.dateTo) {
        videoWhere.createdAt = {};
        if (query.dateFrom) videoWhere.createdAt.gte = new Date(query.dateFrom);
        if (query.dateTo) videoWhere.createdAt.lte = new Date(query.dateTo);
    }
    if (query.search) {
        videoWhere.caregiverMetadata = {
            some: {
                OR: [
                    { privateTitle: { contains: query.search, mode: "insensitive" } },
                    { privateNotes: { contains: query.search, mode: "insensitive" } },
                ],
            },
        };
    }
    where.video = videoWhere;

    const skip = (query.page - 1) * query.limit;

    const dropdownScopeFilter = permissionCtx.isGlobal
        ? {}
        : { videoStudies: { some: scopeFilter } };

    const [rows, totalCount, studies, sites] = await Promise.all([
        prisma.videoStudy.findMany({
            where,
            include: {
                video: {
                    select: {
                        id: true,
                        createdAt: true,
                        caregiverMetadata: { select: { privateTitle: true } },
                    },
                },
                study: { select: { name: true } },
                site: { select: { name: true } },
            },
            orderBy: { video: { createdAt: "desc" } },
            skip,
            take: query.limit,
        }),
        prisma.videoStudy.count({ where }),
        prisma.study.findMany({
            where: dropdownScopeFilter,
            select: { name: true, status: true },
            orderBy: { name: "asc" },
        }),
        prisma.site.findMany({
            where: dropdownScopeFilter,
            select: { name: true },
            orderBy: { name: "asc" },
        }),
    ]);

    const videos: ReviewsResponse["videos"] = rows.map((row) => {
        const level = resolvePermissionLevel(permissionCtx.rows, {
            studyId: row.studyId,
            siteId: row.siteId,
            videoId: row.videoId,
        });

        return {
            id: row.videoId,
            studyId: row.studyId,
            siteId: row.siteId,
            title: row.video.caregiverMetadata[0]?.privateTitle,
            reviewStatus: REVIEW_STATUS_LABEL[row.reviewStatus],
            studyName: row.study.name,
            siteName: row.site.name,
            permissionLevel: PERMISSION_LABEL[level ?? "READ"],
            uploadedAt: row.video.createdAt.toISOString(),
        };
    });

    return {
        videos,
        totalCount,
        studies: studies.map((s) => ({
            name: s.name,
            status: STUDY_STATUS_LABEL[s.status],
        })),
        sites: sites.map((s) => ({ name: s.name })),
    };
}
