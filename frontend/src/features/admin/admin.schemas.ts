import { z } from "zod";

/** @description Validation schema for the invite user form. */
export const inviteUserSchema = z.object({
  email: z.email("Please enter a valid email address"),
  role: z.enum(
    ["CAREGIVER", "CLINICAL_REVIEWER", "SITE_COORDINATOR", "SYSADMIN"],
    { message: "Please select a role" },
  ),
  siteId: z.uuid("Please select a site"),
});

/** @description Validation schema for the create site form. */
export const createSiteSchema = z.object({
  name: z.string().min(3, "Site name must be at least 3 characters"),
});

/** @description Validation schema for the simple create study form. */
export const createStudySchema = z.object({
  name: z.string().min(3, "Study name must be at least 3 characters"),
  siteId: z.uuid("Please select a site"),
});

/**
 * @description Validation schema for creating a study with multi-site
 * linking and optional caregiver enrollment.
 */
export const createStudyWithEnrollmentSchema = z.object({
  name: z.string().min(3, "Study name must be at least 3 characters"),
  siteIds: z
    .array(z.uuid("Invalid site ID"))
    .min(1, "Select at least one site"),
  addAllCaregivers: z.boolean().optional().default(false),
  caregiverUserIds: z.array(z.string()).optional().default([]),
});

/** @description Validation schema for the add permission form. */
export const createPermissionSchema = z.object({
  permissionLevel: z.enum(["READ", "WRITE", "EXPORT", "ADMIN"], {
    message: "Please select a permission level",
  }),
  siteId: z.uuid().nullable(),
  studyId: z.uuid().nullable(),
  videoId: z.uuid().nullable(),
});
