import prisma from "../../lib/prisma.js";
import type {
    UserPermission,
    permission_level,
    review_status,
    Prisma,
} from "../../generated/prisma/client.js";
import type {
    ReviewPermissionLevel,
    ReviewStatus,
    ReviewStudyStatus,
    ReviewsQuery,
    ReviewsResponse,
} from "./reviews.types.js";

/**
 * @description Ranks used to pick the highest permission a user has for a
 * given VideoStudy tuple when multiple UserPermission rows match it.
 */
const PERMISSION_RANK: Record<permission_level, number> = {
    READ: 1,
    WRITE: 2,
    EXPORT: 3,
    ADMIN: 4,
};

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
 * @description Builds the Prisma `where` fragment for a single UserPermission
 * row, treating null fields as wildcards. The returned object is meant to be
 * OR'd together with other rows' fragments when filtering VideoStudy.
 * @param perm - A UserPermission row.
 * @returns A VideoStudy `where` fragment; `{}` for full wildcards.
 */
function permissionToWhere(perm: UserPermission): Prisma.VideoStudyWhereInput {
    const where: Prisma.VideoStudyWhereInput = {};
    if (perm.studyId !== null) where.studyId = perm.studyId;
    if (perm.siteId !== null) where.siteId = perm.siteId;
    if (perm.videoId !== null) where.videoId = perm.videoId;
    return where;
}

/**
 * @description Returns the highest-ranked permission the user has that
 * matches the given VideoStudy tuple. Callers must guarantee at least one
 * row matches (the caller already filtered by the same rules).
 * @param perms - All of the user's permissions.
 * @param vs - The VideoStudy tuple to match against.
 * @returns The matching permission_level with the highest rank.
 */
function highestPermissionFor(
    perms: UserPermission[],
    vs: { studyId: string; siteId: string; videoId: string },
): permission_level {
    let best: permission_level = "READ";
    let bestRank = 0;
    for (const p of perms) {
        if (p.studyId !== null && p.studyId !== vs.studyId) continue;
        if (p.siteId !== null && p.siteId !== vs.siteId) continue;
        if (p.videoId !== null && p.videoId !== vs.videoId) continue;
        const rank = PERMISSION_RANK[p.permissionLevel];
        if (rank > bestRank) {
            bestRank = rank;
            best = p.permissionLevel;
        }
    }
    return best;
}

/**
 * @description Lists the reviewer-video assignments visible to the given user,
 * filtered + paginated by the provided query. Also returns the distinct
 * studies and sites the user has access to (for the filter dropdowns).
 *
 * Visibility is determined by UserPermission rows: a VideoStudy row is
 * visible if the user has at least READ permission whose (studyId, siteId,
 * videoId) tuple matches (with null = wildcard).
 *
 * @param userId - The authenticated user's id.
 * @param query - Parsed & validated query params from the URL.
 * @returns The page of ReviewVideos plus totalCount and dropdown options.
 */
export async function listReviewsForUser(
    userId: string,
    query: ReviewsQuery,
): Promise<ReviewsResponse> {
    const permissions = await prisma.userPermission.findMany({ where: { userId } });

    if (permissions.length === 0) {
        return { videos: [], totalCount: 0, studies: [], sites: [] };
    }

    // A permission with all three scope fields null (e.g. SYSADMIN) means
    // "see everything". Detect that up front so we can skip the OR filter
    // entirely — Prisma's behavior for an `OR` branch of `{}` is ambiguous
    // across versions, so the safe path is to not add a scope filter at all.
    const hasWildcard = permissions.some(
        (p) => p.studyId === null && p.siteId === null && p.videoId === null,
    );
    const permissionConditions = permissions.map(permissionToWhere);

    const where: Prisma.VideoStudyWhereInput = {};
    if (!hasWildcard) where.OR = permissionConditions;

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

    // Same wildcard handling for the dropdown lookups: if the user sees
    // everything, don't filter the Study/Site lists by permission scope.
    const dropdownScopeFilter = hasWildcard
        ? {}
        : { videoStudies: { some: { OR: permissionConditions } } };

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

    const videos: ReviewsResponse["videos"] = rows.map((row) => ({
        id: row.videoId,
        studyId: row.studyId,
        siteId: row.siteId,
        title: row.video.caregiverMetadata[0]?.privateTitle,
        reviewStatus: REVIEW_STATUS_LABEL[row.reviewStatus],
        studyName: row.study.name,
        siteName: row.site.name,
        permissionLevel: PERMISSION_LABEL[
            highestPermissionFor(permissions, {
                studyId: row.studyId,
                siteId: row.siteId,
                videoId: row.videoId,
            })
        ],
        uploadedAt: row.video.createdAt.toISOString(),
    }));

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
