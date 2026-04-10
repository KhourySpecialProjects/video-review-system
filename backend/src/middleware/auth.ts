import type { Request, Response, NextFunction } from "express";
import { auth, type Session } from "../lib/auth.js";
import prisma from "../lib/prisma.js";
import { AppError } from "./errors.js";
import { fromNodeHeaders } from "better-auth/node";
import type { user_role } from "../generated/prisma/client.js";

// ────────────────────────────────────────────────────────────
// Extend Express Request to carry the authenticated user
// ────────────────────────────────────────────────────────────

/**
 * Shape of the user object attached to `req.user` after authentication.
 *
 * @property id - the user's primary key from the user table
 * @property email - the user's email address
 * @property role - the user's role enum (CAREGIVER, CLINICAL_REVIEWER, SITE_COORDINATOR, SYSADMIN)
 * @property siteId - uuid of the site the user belongs to
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: user_role;
  siteId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      authSession: Session;
    }
  }
}

// ────────────────────────────────────────────────────────────
// Layer 1: authenticate
// ────────────────────────────────────────────────────────────

/**
 * Express middleware that validates the session from the request headers
 * and attaches it to `req.authSession`. Throws 401 if no valid session exists.
 *
 * The session includes custom user fields (e.g. role) configured via
 * Better Auth's `user.additionalFields`.
 *
 * @description Usage: `router.use(requireSession)` or on individual routes
 */
export async function requireSession(req: Request, _res: Response, next: NextFunction) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) throw AppError.unauthorized();

  req.authSession = session;
  next();
}

/**
 * Express middleware that validates requests from internal services
 * using a shared secret in the `x-internal-secret` header.
 * Throws 401 if the header is missing or does not match.
 *
 * @description Usage: pass as route-level middleware for internal-only endpoints
 */
export async function requireInternalAuth(req: Request, _res: Response, next: NextFunction) {
  const internalSecret = req.headers["x-internal-secret"];

  if (!internalSecret || internalSecret !== process.env.INTERNAL_SECRET_HEADER) {
    throw AppError.unauthorized();
  }

  next();
}

// ────────────────────────────────────────────────────────────
// Layer 2: authorize
// Role-based access control scoped to site, study, and video.
//
// Access model:
//   SYSADMIN            → full access to everything
//   SITE_COORDINATOR    → full governance over their site within their studies
//   CLINICAL_REVIEWER   → read videos + create annotations/notes in their site & study
//   CAREGIVER           → read, write, export their OWN videos in their site & study
// ────────────────────────────────────────────────────────────

/**
 * The action the user is attempting to perform.
 * Used by authorize to determine whether the user's role permits the operation.
 *
 * @value "read"   - viewing or listing a resource
 * @value "write"  - creating or updating a resource
 * @value "export" - downloading or exporting a resource
 * @value "delete" - permanently removing a resource
 * @value "manage" - full administrative control (create, update, delete, configure)
 */
export type Action = "read" | "write" | "export" | "delete" | "manage";

/**
 * The type of resource being accessed.
 * Used by authorize to apply resource-specific ownership and scoping rules.
 *
 * @value "video"      - a video record (ownership checked for CAREGIVER)
 * @value "annotation" - an annotation, note, or drawing on a video
 * @value "clip"       - a video clip carved from a source video
 * @value "sequence"   - a stitched sequence of clips
 * @value "study"      - a study record
 * @value "site"       - a site record
 * @value "user"       - a user account
 */
export type Resource =
  | "video"
  | "annotation"
  | "clip"
  | "sequence"
  | "study"
  | "site"
  | "user";

/**
 * Configuration options for the authorize middleware factory.
 *
 * @property action - the action being performed (read, write, export, delete, manage)
 * @property resource - the type of resource being accessed
 * @property getResourceOwnerId - optional async function to resolve the owner of the resource
 *           for ownership checks (e.g. who uploaded a video). Receives the Express request
 *           and should return the owner's user ID, or null if not found.
 * @property getStudyId - optional async function to resolve which study the resource belongs to,
 *           used to verify the user is enrolled in that study. Receives the Express request
 *           and should return the study ID, or null if not applicable.
 */
export interface AuthorizeOptions {
  action: Action;
  resource: Resource;
  getResourceOwnerId?: (req: Request) => Promise<string | null>;
  getStudyId?: (req: Request) => Promise<string | null>;
  getResourceSiteId?: (req: Request) => Promise<string | null>;
}

/**
 * Checks whether the user belongs to the given study via the caregiver_patient table.
 *
 * @param userId - the user's ID
 * @param studyId - the study to check membership in
 *
 * @returns true if the user is enrolled in the study
 */
async function isUserInStudy(userId: string, studyId: string): Promise<boolean> {
  const membership = await prisma.caregiverPatient.findUnique({
    where: { studyId_userId: { studyId, userId } },
  });
  return membership !== null;
}

/**
 * Checks whether the given study is linked to the given site via the sites_studies table.
 *
 * @param studyId - the study ID
 * @param siteId - the site ID
 *
 * @returns true if the study is associated with the site
 */
async function isStudyInSite(studyId: string, siteId: string): Promise<boolean> {
  const link = await prisma.siteStudy.findUnique({
    where: { studyId_siteId: { studyId, siteId } },
  });
  return link !== null;
}

/**
 * Factory that returns Express middleware enforcing role-based authorization
 * scoped to the user's site, study enrollment, and resource ownership.
 *
 * Access rules:
 * - SYSADMIN: unrestricted access to all resources and actions.
 * - SITE_COORDINATOR: full governance (read, write, delete, manage) over all resources
 *   within their site, but only for studies linked to that site.
 * - CLINICAL_REVIEWER: can read and export videos, and read/write/export annotations,
 *   clips, and sequences within their site and enrolled studies. Can delete annotations,
 *   clips, and sequences they created (ownership enforced). Cannot delete videos or manage.
 * - CAREGIVER: can read, write, export, and delete their OWN videos within their site
 *   and enrolled studies. Cannot access other users' videos or manage resources.
 *
 * @param options - specifies the action, resource type, and optional ownership/study resolvers
 *
 * @returns Express middleware function
 *
 * @throws {AppError} 401 if req.user is not set (authenticate must run first)
 * @throws {AppError} 403 if the user's role does not permit the action on the resource
 *
 * @example
 * // Caregiver can read their own videos
 * router.get("/:id", authenticate, authorize({
 *   action: "read",
 *   resource: "video",
 *   getResourceOwnerId: async (req) => {
 *     const video = await prisma.video.findUnique({ where: { id: req.params.id } });
 *     return video?.uploadedByUserId ?? null;
 *   },
 *   getStudyId: async (req) => {
 *     const vs = await prisma.videoStudy.findFirst({ where: { videoId: req.params.id } });
 *     return vs?.studyId ?? null;
 *   },
 * }), handler);
 *
 * @example
 * // Site coordinator can manage anything in their site
 * router.delete("/:id", authenticate, authorize({
 *   action: "delete",
 *   resource: "video",
 * }), handler);
 *
 * @example
 * // Clinical reviewer can create annotations
 * router.post("/", authenticate, authorize({
 *   action: "write",
 *   resource: "annotation",
 *   getStudyId: async (req) => req.body.studyId ?? null,
 * }), handler);
 */
export function authorize(options: AuthorizeOptions) {
  const { action, resource, getResourceOwnerId, getStudyId, getResourceSiteId } = options;

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;
    if (!user) {
      throw AppError.unauthorized();
    }

    // ── SYSADMIN: unrestricted ──
    if (user.role === "SYSADMIN") {
      next();
      return;
    }

    // ── Resolve study context if provided ──
    const studyId = getStudyId ? await getStudyId(req) : null;

    // ── If we have a study, verify it belongs to the user's site ──
    if (studyId) {
      const studyLinked = await isStudyInSite(studyId, user.siteId);
      if (!studyLinked) {
        throw AppError.forbidden("This study is not associated with your site");
      }
    }

    // ── SITE_COORDINATOR: full governance within their site & studies ──
    if (user.role === "SITE_COORDINATOR") {
      if (getResourceSiteId) {
        const resourceSiteId = await getResourceSiteId(req);
        if (resourceSiteId && resourceSiteId !== user.siteId) {
          throw AppError.forbidden("You can only manage resources within your own site");
        }
      }
 
      next();
      return;
    }

    // ── CLINICAL_REVIEWER ──
    if (user.role === "CLINICAL_REVIEWER") {
      // Verify study enrollment if study context is available
      if (studyId) {
        const enrolled = await isUserInStudy(user.id, studyId);
        if (!enrolled) {
          throw AppError.forbidden("You are not enrolled in this study");
        }
      }

      // Reviewers can READ and EXPORT videos (but never delete or write)
      if (resource === "video" && ["read", "export"].includes(action)) {
        next();
        return;
      }

      // Reviewers can READ, WRITE, EXPORT, and DELETE their own annotations, clips, and sequences
      if (
        ["annotation", "clip", "sequence"].includes(resource) &&
        ["read", "write", "export"].includes(action)
      ) {
        next();
        return;
      }

      // Reviewers can DELETE annotations, clips, and sequences they created (ownership check)
      if (
        ["annotation", "clip", "sequence"].includes(resource) &&
        action === "delete"
      ) {
        if (getResourceOwnerId) {
          const ownerId = await getResourceOwnerId(req);
          if (ownerId !== user.id) {
            throw AppError.forbidden("You can only delete resources you created");
          }
        }
        next();
        return;
      }

      // Reviewers cannot delete videos or manage anything
      throw AppError.forbidden("Clinical reviewers cannot perform this action");
    }

    // ── CAREGIVER ──
    if (user.role === "CAREGIVER") {
      // Verify study enrollment if study context is available
      if (studyId) {
        const enrolled = await isUserInStudy(user.id, studyId);
        if (!enrolled) {
          throw AppError.forbidden("You are not enrolled in this study");
        }
      }

      // Caregivers can only interact with videos (not annotations, clips, etc.)
      if (resource !== "video") {
        throw AppError.forbidden("Caregivers can only access their own videos");
      }

      // Caregivers cannot manage (admin-level operations)
      if (action === "manage") {
        throw AppError.forbidden("Caregivers cannot perform this action");
      }

      // For read, write, export, delete — verify ownership
      if (getResourceOwnerId) {
        const ownerId = await getResourceOwnerId(req);
        if (ownerId !== user.id) {
          throw AppError.forbidden("You can only access your own videos");
        }
      }

      // Action is read, write, export, or delete on their own video
      next();
      return;
    }

    // ── Unknown role — deny by default ──
    throw AppError.forbidden("You do not have permission to perform this action");
  };
}