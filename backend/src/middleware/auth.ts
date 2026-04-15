import type { Request, Response, NextFunction } from "express";
import { auth, type Session } from "../lib/auth.js";
import { permission_level } from '../generated/prisma';
import { AppError } from "./errors.js";
import { fromNodeHeaders } from "better-auth/node";
import type { user_role } from "../generated/prisma/client.js";

// backend/src/middleware/authorization.ts
// Express middleware wrappers around the core authorization logic

import {
  checkPermission,
  getHighestPermission,
  PERMISSION_RANK,
  type ResourceContext,
} from "../lib/auth.js";

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
// Role gate
// ────────────────────────────────────────────────────────────

/**
 * Simple role check — throws 403 if user's role is not in the list.
 */
export function requireRole(...roles: user_role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const userRole = req.authSession.user.role as user_role;
    if (!roles.includes(userRole)) {
      throw AppError.forbidden("Your role does not have access to this resource.");
    }
    next();
  };
}

// ────────────────────────────────────────────────────────────
// Permission check (single resource)
// ────────────────────────────────────────────────────────────

type ContextResolver =
  | ((req: Request) => Promise<ResourceContext[]>)
  | ((req: Request) => ResourceContext[]);

/**
 * Middleware factory: checks that the user has at least `requiredLevel`
 * permission for the resource resolved from the request.
 *
 * For CAREGIVER: delegates to `caregiverCheck` if provided, otherwise denies.
 */
export function requirePermission(
  requiredLevel: permission_level,
  resolveContexts: ContextResolver,
  caregiverCheck?: (req: Request) => Promise<boolean>
) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const { id: userId, role } = req.authSession.user;

    if (role === "CAREGIVER") {
      if (caregiverCheck && (await caregiverCheck(req))) return next();
      throw AppError.forbidden();
    }

    const contexts = await resolveContexts(req);
    const allowed = await checkPermission(userId, role as user_role, requiredLevel, contexts);
    if (!allowed) throw AppError.forbidden();

    next();
  };
}

// ────────────────────────────────────────────────────────────
// Permission + ownership check (mutations)
// ────────────────────────────────────────────────────────────

interface OwnershipResolver {
  resolveContexts: ContextResolver;
  resolveOwnerId: (req: Request) => Promise<string | null>;
}

/**
 * Middleware factory for PUT/DELETE on annotations, clips, sequences.
 *
 * - User needs at least WRITE for the scope.
 * - If their highest matching level is WRITE (not ADMIN), they must
 *   also be the resource owner.
 * - ADMIN skips the ownership check.
 */
export function requirePermissionWithOwnership(
  requiredLevel: permission_level,
  resolver: OwnershipResolver
) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const { id: userId, role } = req.authSession.user;

    if (role === "CAREGIVER") throw AppError.forbidden();

    const contexts = await resolver.resolveContexts(req);

    const allowed = await checkPermission(userId, role as user_role, requiredLevel, contexts);
    if (!allowed) throw AppError.forbidden();

    const highest = await getHighestPermission(userId, role as user_role, contexts);
    if (!highest) throw AppError.forbidden();

    // ADMIN can edit/delete anyone's resources
    if (highest === "ADMIN") return next();

    // WRITE users can only edit/delete their own
    const ownerId = await resolver.resolveOwnerId(req);
    if (ownerId !== userId) {
      throw AppError.forbidden("You can only modify your own resources.");
    }

    next();
  };
}