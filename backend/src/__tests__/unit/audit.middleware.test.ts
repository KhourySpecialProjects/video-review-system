import type { Request } from "express";
import { describe, expect, it } from "vitest";
import {
  buildAuditActorContext,
  getRequestIp,
  requireAuditActorContext,
} from "../../middleware/audit.js";
import { AppError } from "../../middleware/errors.js";

type MockRequestInput = Omit<Partial<Request>, "authSession"> & {
  authSession?: any;
};

function createRequest(overrides: MockRequestInput = {}) {
  return {
    headers: {},
    ip: undefined,
    ...overrides,
  } as Request & { authSession?: any };
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

  it("returns authenticated audit data when a user is present", () => {
    const req = createRequest({
      authSession: {
        user: {
          id: "user-123",
        },
      },
      ip: "::1",
    });

    expect(requireAuditActorContext(req)).toEqual({
      actorUserId: "user-123",
      ipAddress: "::1",
    });
  });

  it("throws when authenticated audit data is missing", () => {
    const req = createRequest();

    try {
      requireAuditActorContext(req);
      throw new Error("Expected requireAuditActorContext to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusCode).toBe(401);
    }
  });
});
