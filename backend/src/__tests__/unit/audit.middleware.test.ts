import type { Request } from "express";
import { describe, expect, it } from "vitest";
import { buildAuditActorContext, getRequestIp } from "../../middleware/audit.js";

function createRequest(
  overrides: Partial<Request> & {
    authSession?: { user?: { id?: string } };
  } = {},
) {
  return {
    headers: {},
    ip: undefined,
    ...overrides,
  } as Request & {
    authSession?: { user?: { id?: string } };
  };
}

describe("audit.middleware", () => {
  it("prefers x-forwarded-for over req.ip", () => {
    const req = createRequest({
      headers: {
        "x-forwarded-for": "203.0.113.10, 198.51.100.8",
      } as Request["headers"],
      ip: "::1",
    });

    expect(getRequestIp(req)).toBe("203.0.113.10");
  });

  it("falls back to req.ip when no forwarded header exists", () => {
    const req = createRequest({
      ip: "198.51.100.8",
    });

    expect(getRequestIp(req)).toBe("198.51.100.8");
  });

  it("captures the actor user id from authSession when present", () => {
    const req = createRequest({
      authSession: {
        user: {
          id: "user-123",
        },
      },
      headers: {
        "x-forwarded-for": "203.0.113.10",
      } as Request["headers"],
    });

    expect(buildAuditActorContext(req)).toEqual({
      actorUserId: "user-123",
      ipAddress: "203.0.113.10",
    });
  });

  it("returns a null actor id for unauthenticated requests", () => {
    const req = createRequest({
      ip: "198.51.100.8",
    });

    expect(buildAuditActorContext(req)).toEqual({
      actorUserId: null,
      ipAddress: "198.51.100.8",
    });
  });
});
