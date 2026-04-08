import type { Request, Response, NextFunction } from "express";
import { auth, type Session } from "../lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";
import { AppError } from "./errors";

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

  if (!session) throw AppError.unauthorized();

  req.authSession = session;
  next();
}
