import type { Request } from "express";
import type {
  AuditActorContext,
  AuthenticatedAuditContext,
} from "../domains/audit/audit.types.js";
import { AppError } from "./errors.js";

type RequestWithOptionalAuth = Request & {
  authSession?: {
    user?: {
      id?: string;
    };
  };
};

/** Returns the first IP from an `x-forwarded-for` header. */
function getFirstForwardedIp(header: string | string[] | undefined): string | null {
  if (!header) {
    return null;
  }

  const value = Array.isArray(header) ? header[0] : header;
  const [first] = value.split(",");
  const normalized = first?.trim();

  return normalized ? normalized : null;
}

/** Returns the client IP. */
export function getRequestIp(req: Request): string | null {
  const forwardedIp = getFirstForwardedIp(req.headers["x-forwarded-for"]);
  if (forwardedIp) {
    return forwardedIp;
  }

  return req.ip ?? null;
}

/** Returns request data used for audit writes. This is not an audit log row. */
export function buildAuditActorContext(req: Request): AuditActorContext {
  const requestWithOptionalAuth = req as RequestWithOptionalAuth;

  return {
    actorUserId: requestWithOptionalAuth.authSession?.user?.id ?? null,
    ipAddress: getRequestIp(req),
  };
}

/** Returns authenticated request data used for audit writes. */
export function requireAuditActorContext(
  req: Request,
): AuthenticatedAuditContext {
  const audit = buildAuditActorContext(req);

  if (!audit.actorUserId) {
    throw AppError.unauthorized();
  }

  return {
    actorUserId: audit.actorUserId,
    ipAddress: audit.ipAddress,
  };
}
