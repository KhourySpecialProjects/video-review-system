import { z } from "zod";

/**
 * @description Validates and coerces query params for `GET /domain/reviews`.
 * All fields optional. `page` and `limit` are coerced from strings.
 */
export const reviewsQuerySchema = z.object({
    search: z.string().optional(),
    study: z.string().optional(),
    site: z.string().optional(),
    status: z.enum(["not reviewed", "in review", "reviewed"]).optional(),
    dateFrom: z.iso.datetime().optional(),
    dateTo: z.iso.datetime().optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(9),
});

export type ReviewsQuery = z.infer<typeof reviewsQuerySchema>;

export type {
    ReviewStatus,
    ReviewPermissionLevel,
    ReviewStudyStatus,
    ReviewStudyOption,
    ReviewSiteOption,
    ReviewVideo,
    ReviewsResponse,
} from "@shared/review.js";
