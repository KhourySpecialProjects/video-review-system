import { z } from "zod";

/**
 * @description Validation schema for creating a new study.
 *
 * @field name - The study's display name
 * @field siteId - The site to attach the study to
 */
export const createStudySchema = z.object({
  name: z.string().min(1, "Study name is required"),
  siteId: z.uuid("Invalid site ID"),
});

/**
 * @description Extended study creation schema that supports linking to
 * multiple sites and optionally enrolling caregivers. Used by the admin
 * create-study dialog.
 *
 * @field name - The study's display name.
 * @field siteIds - Array of site IDs to link the study to.
 * @field addAllCaregivers - If true, enroll all caregivers from the selected sites.
 * @field caregiverUserIds - Specific caregiver IDs to enroll (ignored if addAllCaregivers is true).
 */
export const createStudyWithEnrollmentSchema = z.object({
  name: z.string().min(3, "Study name must be at least 3 characters"),
  siteIds: z.array(z.uuid("Invalid site ID")).min(1, "Select at least one site"),
  addAllCaregivers: z.boolean().optional().default(false),
  caregiverUserIds: z.array(z.string()).optional().default([]),
});

/**
 * @description Validation schema for listing all studies.
 *
 * @field siteId - Optional filter by site.
 * @field status - Optional filter by study status.
 * @field name - Optional name search (case-insensitive contains).
 * @field limit - Page size.
 * @field offset - Page offset.
 */
export const listStudiesQuerySchema = z.object({
  siteId: z.uuid("Invalid site ID").optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "FINISHED"]).optional(),
  name: z.string().optional(),
  limit: z.coerce.number().int().positive().optional().default(20),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

/**
 * @description Validation schema for updating a study's name or status.
 * Both fields are optional; at least one must be provided.
 *
 * @field name - New study name (at least 3 characters).
 * @field status - New study status.
 */
export const updateStudySchema = z.object({
  name: z.string().min(3, "Study name must be at least 3 characters").optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "FINISHED"]).optional(),
});

/**
 * @description Validation schema for adding users to a study.
 *
 * @field userIds - Array of user IDs to add to the study.
 */
export const addStudyUsersSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1, "At least one user is required"),
});

export type CreateStudyInput = z.infer<typeof createStudySchema>;
export type UpdateStudyInput = z.infer<typeof updateStudySchema>;
export type AddStudyUsersInput = z.infer<typeof addStudyUsersSchema>;
export type ListStudiesQuery = z.infer<typeof listStudiesQuerySchema>;
