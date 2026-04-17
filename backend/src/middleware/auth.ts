import type { Request, Response, NextFunction } from "express";
import { auth, type Session } from "../lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";
import { AppError } from "./errors.js";

declare global {
  namespace Express {
    interface Request {
      authSession: Session;
    }
  }
}

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

  if (!session) throw AppError.unauthorized("No valid session");

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
    throw AppError.unauthorized("Invalid internal secret");
  }

  next();
}
