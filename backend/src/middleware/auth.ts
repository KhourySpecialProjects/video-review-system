import type { Request, Response, NextFunction } from "express";
import { auth, type Session } from "../lib/auth.js";
import prisma from "../lib/prisma.js";
import { permission_level } from '../generated/prisma';
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

const PERMISSION_HIERARCHY: Record<permission_level, number> = {
  READ: 1,
  WRITE: 2,
  EXPORT: 3,
  ADMIN: 4,
};

/**
 * Resolves the effective permission level a user has for a given resource.
 *
 * Checks grants from most-specific to least-specific:
 *   1. Exact video grant
 *   2. Study-wide grant (covers all videos in that study)
 *   3. Site-wide grant (covers all studies/videos in that site)
 *   4. Global grant (all NULLs)
 *
 * Returns the highest permission_level found across all matching rows,
 * or null if the user has no access.
 */
async function getEffectivePermission(
  userId: string,
  resource: {
    videoId?: string;
    studyId?: string;
    siteId?: string;
  }
): Promise<permission_level | null> {
  // Build an OR filter for every scope that could grant access.
  // A row matches if it targets the exact resource OR is a wildcard
  // that covers it.
  const scopeFilters: any[] = [];

  // 1. Global grant (all NULLs) — always relevant
  scopeFilters.push({
    siteId: null,
    studyId: null,
    videoId: null,
  });

  // 2. Site-wide grant
  if (resource.siteId) {
    scopeFilters.push({
      siteId: resource.siteId,
      studyId: null,
      videoId: null,
    });
  }

  // 3. Study-wide grant
  if (resource.studyId) {
    scopeFilters.push({
      siteId: null,
      studyId: resource.studyId,
      videoId: null,
    });
  }

  // 4. Exact video grant
  if (resource.videoId) {
    scopeFilters.push({
      siteId: null,
      studyId: null,
      videoId: resource.videoId,
    });
  }

  // Queries all filters and finds the strongest permission level across them. 
  // If no rows match, the user has no access.
  const grants = await prisma.userPermission.findMany({
    where: {
      userId,
      OR: scopeFilters,
    },
    select: { permissionLevel: true },
  });

  if (grants.length === 0) return null;

  // Return the strongest grant
  return grants.reduce((best, g) =>
    PERMISSION_HIERARCHY[g.permissionLevel] > PERMISSION_HIERARCHY[best.permissionLevel]
      ? g
      : best
  ).permissionLevel;
}

/**
 * Boolean check: does the user have at least `required` access
 * to the given resource?
 */
async function canAccess(
  userId: string,
  resource: { videoId?: string; studyId?: string; siteId?: string },
  required: permission_level
): Promise<boolean> {
  const effective = await getEffectivePermission(userId, resource);
  if (!effective) return false;
  return PERMISSION_HIERARCHY[effective] >= PERMISSION_HIERARCHY[required];
}