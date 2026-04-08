import type { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth.js";
import prisma from "../lib/prisma.js";
import { AppError } from "./errors.js";
import type { permission_level, user_role } from "../generated/prisma/client.js";

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
    }
  }
}

// ────────────────────────────────────────────────────────────
// Layer 1: authenticate
// ────────────────────────────────────────────────────────────

/**
 * Express middleware that validates the better-auth session cookie
 * and attaches the authenticated user to `req.user`.
 *
 * @param req - Express request object (must carry the session cookie)
 * @param _res - Express response object (unused)
 * @param next - Express next function
 *
 * @returns void — calls next() on success
 *
 * @throws {AppError} 401 if no valid session cookie is present or session has expired
 * @throws {AppError} 401 if the user account is not found or has been deactivated
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  });

  if (!session) {
    throw AppError.unauthorized("Invalid or expired session");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, role: true, siteId: true, isDeactivated: true },
  });

  if (!user || user.isDeactivated) {
    throw AppError.unauthorized("Account not found or deactivated");
  }

  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    siteId: user.siteId,
  };

  next();
}

// ────────────────────────────────────────────────────────────
// Layer 2: authorize
// ────────────────────────────────────────────────────────────

/**
 * Checks whether a user's granted permission level exactly matches the required level.
 * Each permission (READ, WRITE, EXPORT, ADMIN) is independent
 *
 * @param userLevel - the permission level the user has been granted
 * @param requiredLevel - the exact permission level needed for the action
 *
 * @returns true if userLevel matches requiredLevel exactly
 */
function hasExactPermission(
  userLevel: permission_level,
  requiredLevel: permission_level
): boolean {
  return userLevel === requiredLevel;
}

/**
 * Configuration options for the authorize middleware factory.
 *
 * @property allowedRoles - roles that are always granted access regardless of permissions
 * @property requiredPermission - the exact permission_level(s) that grant access; accepts a
 *           single level or an array when a route should accept any of several (e.g. ["READ", "WRITE"])
 * @property resourceKeys - custom param/body field names for resolving studyId, siteId, videoId
 */
export interface AuthorizeOptions {
  /** Roles that are always allowed (e.g. SYSADMIN bypasses everything). */
  allowedRoles?: user_role[];

  /**
   * The exact permission level(s) that grant access. Each level is independent —
   * WRITE does not imply READ, ADMIN does not imply EXPORT.
   * Pass a single level or an array when multiple levels should be accepted.
   */
  requiredPermission?: permission_level | permission_level[];

  /**
   * Where to find the resource IDs for permission scoping.
   * Defaults to checking req.params, then req.body.
   */
  resourceKeys?: {
    studyId?: string;
    siteId?: string;
    videoId?: string;
  };
}

/**
 * Factory that returns Express middleware for role-based and permission-based authorization.
 *
 * Permissions are checked as exact matches — each level (READ, WRITE, EXPORT, ADMIN)
 * is independent. Having WRITE does not grant READ access.
 *
 * Checks are applied in this order:
 * 1. If the user's role is in `allowedRoles`, access is granted immediately.
 * 2. If the user is a SYSADMIN, access is always granted (implicit bypass).
 * 3. If `requiredPermission` is set, the user_permissions table is queried for
 *    an entry that exactly matches one of the required levels, scoped to the
 *    resource IDs found in req.params, req.body, or req.query.
 * 4. If none of the above succeed, a 403 Forbidden error is thrown.
 *
 * @param options - configuration for which roles and/or permission levels to require
 *
 * @returns Express middleware function
 *
 * @throws {AppError} 401 if req.user is not set (authenticate must run first)
 * @throws {AppError} 403 if the user lacks the required role or permission
 *
 * @example
 * // Require exact READ permission
 * router.get("/:id", authenticate, authorize({
 *   requiredPermission: "READ",
 * }), handler);
 *
 * @example
 * // Accept either READ or WRITE permission
 * router.get("/:id", authenticate, authorize({
 *   requiredPermission: ["READ", "WRITE"],
 * }), handler);
 */
export function authorize(options: AuthorizeOptions) {
  const acceptedLevels: permission_level[] = options.requiredPermission
    ? Array.isArray(options.requiredPermission)
      ? options.requiredPermission
      : [options.requiredPermission]
    : [];

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;
    if (!user) {
      throw AppError.unauthorized();
    }

    // ── Role check: if user has an allowed role, skip permission lookup ──
    if (options.allowedRoles?.includes(user.role)) {
      next();
      return;
    }

    // ── SYSADMIN always passes (implicit) ──
    if (user.role === "SYSADMIN") {
      next();
      return;
    }

    // ── Permission table check ──
    if (acceptedLevels.length > 0) {
      // Resolve resource IDs from params, body, or query
      const studyId = (
        req.params[options.resourceKeys?.studyId ?? "studyId"] ??
        req.body?.[options.resourceKeys?.studyId ?? "studyId"] ??
        (req.query?.studyId as string | undefined)
      ) as string | undefined;

      const siteId = (
        req.params[options.resourceKeys?.siteId ?? "siteId"] ??
        req.body?.[options.resourceKeys?.siteId ?? "siteId"] ??
        (req.query?.siteId as string | undefined) ??
        user.siteId // fall back to the user's own site
      ) as string;

      const videoId = (
        req.params[options.resourceKeys?.videoId ?? "videoId"] ??
        req.body?.[options.resourceKeys?.videoId ?? "videoId"] ??
        req.params.id // common pattern: /videos/:id
      ) as string | undefined;

      // Build a flexible where clause — match any permission that covers
      // the requested resource (site-wide, study-wide, or video-specific)
      const permissions = await prisma.userPermission.findMany({
        where: {
          userId: user.id,
          OR: [
            // Site-level permission (covers everything in the site)
            ...(siteId ? [{ siteId, studyId: null, videoId: null }] : []),
            // Study-level permission
            ...(studyId ? [{ studyId, videoId: null }] : []),
            // Video-level permission
            ...(videoId ? [{ videoId }] : []),
            // Study + site combo
            ...(studyId && siteId ? [{ studyId, siteId }] : []),
          ],
        },
      });

      const hasPermission = permissions.some((p) =>
        acceptedLevels.some((level) => hasExactPermission(p.permissionLevel, level))
      );

      if (hasPermission) {
        next();
        return;
      }
    }

    // ── No allowed role matched, no permission found ──
    throw AppError.forbidden("You do not have permission to perform this action");
  };
}

// ────────────────────────────────────────────────────────────
// Convenience shortcuts for common patterns
// ────────────────────────────────────────────────────────────

/**
 * Restricts access to SYSADMIN users only.
 *
 * @throws {AppError} 401 if req.user is not set
 * @throws {AppError} 403 if the user is not a SYSADMIN
 */
export const requireSysadmin = authorize({ allowedRoles: ["SYSADMIN"] });

/**
 * Restricts access to SYSADMIN and SITE_COORDINATOR users.
 *
 * @throws {AppError} 401 if req.user is not set
 * @throws {AppError} 403 if the user is not a SYSADMIN or SITE_COORDINATOR
 */
export const requireCoordinatorOrAbove = authorize({
  allowedRoles: ["SYSADMIN", "SITE_COORDINATOR"],
});

/**
 * Requires exactly READ permission from the user_permissions table.
 * Does not grant access to users with WRITE, EXPORT, or ADMIN — each level is independent.
 * SYSADMIN users bypass this check automatically.
 *
 * @throws {AppError} 401 if req.user is not set
 * @throws {AppError} 403 if the user lacks a READ permission entry
 */
export const requireRead = authorize({ requiredPermission: "READ" });

/**
 * Requires exactly WRITE permission from the user_permissions table.
 * Does not grant access to users with READ, EXPORT, or ADMIN — each level is independent.
 * SYSADMIN users bypass this check automatically.
 *
 * @throws {AppError} 401 if req.user is not set
 * @throws {AppError} 403 if the user lacks a WRITE permission entry
 */
export const requireWrite = authorize({ requiredPermission: "WRITE" });

/**
 * Requires exactly EXPORT permission from the user_permissions table.
 * Does not grant access to users with READ, WRITE, or ADMIN — each level is independent.
 * SYSADMIN users bypass this check automatically.
 *
 * @throws {AppError} 401 if req.user is not set
 * @throws {AppError} 403 if the user lacks an EXPORT permission entry
 */
export const requireExport = authorize({ requiredPermission: "EXPORT" });

/**
 * Requires exactly ADMIN permission from the user_permissions table.
 * Does not grant access to users with READ, WRITE, or EXPORT — each level is independent.
 * SYSADMIN users bypass this check automatically.
 *
 * @throws {AppError} 401 if req.user is not set
 * @throws {AppError} 403 if the user lacks an ADMIN permission entry
 */
export const requireAdmin = authorize({ requiredPermission: "ADMIN" });