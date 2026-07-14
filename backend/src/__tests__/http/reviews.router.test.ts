import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestApp } from "../helpers/test-app.js";

const { authMock, permissionsMock, reviewsServiceMock } = vi.hoisted(() => ({
  authMock: { auth: { api: { getSession: vi.fn() } } },
  permissionsMock: { resolvePermissionLevel: vi.fn() },
  reviewsServiceMock: {
    listReviewsForUser: vi.fn(),
    getReviewStatus: vi.fn(),
    updateReviewStatus: vi.fn(),
  },
}));

vi.mock("../../lib/auth.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/auth.js")>();
  return { ...actual, auth: authMock.auth };
});

vi.mock("../../lib/permissions.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/permissions.js")>();
  return { ...actual, resolvePermissionLevel: permissionsMock.resolvePermissionLevel };
});

vi.mock("../../middleware/auth.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../middleware/auth.js")>();
  return {
    ...actual,
    requireSession: async (req: any, _res: any, next: any) => {
      req.authSession = await authMock.auth.api.getSession();
      next();
    },
    denyCaregiver: (_req: any, _res: any, next: any) => next(),
    requirePermission: () => (_req: any, _res: any, next: any) => next(),
    requirePermissionContext: () => (req: any, _res: any, next: any) => {
      req.permissionContext = { rows: [], isGlobal: true };
      next();
    },
  };
});

vi.mock("../../domains/reviews/reviews.service.js", () => reviewsServiceMock);

import reviewsRouter from "../../domains/reviews/reviews.router.js";

describe("reviews.router status routes", () => {
  const app = createTestApp("/domain/reviews", reviewsRouter);

  beforeEach(() => {
    vi.resetAllMocks();
    authMock.auth.api.getSession.mockResolvedValue({
      user: { id: "user-1", role: "CLINICAL_REVIEWER" },
    });
  });

  it("GET status returns reviewStatus + permissionLevel", async () => {
    permissionsMock.resolvePermissionLevel.mockReturnValue("WRITE");
    reviewsServiceMock.getReviewStatus.mockResolvedValue("in review");

    const res = await request(app).get("/domain/reviews/v1/s1/site1/status");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ reviewStatus: "in review", permissionLevel: "WRITE" });
    expect(reviewsServiceMock.getReviewStatus).toHaveBeenCalledWith("s1", "v1", "site1");
  });

  it("GET status returns 403 when the user has no level on this resource", async () => {
    permissionsMock.resolvePermissionLevel.mockReturnValue(null);

    const res = await request(app).get("/domain/reviews/v1/s1/site1/status");

    expect(res.status).toBe(403);
    expect(reviewsServiceMock.getReviewStatus).not.toHaveBeenCalled();
  });

  it("PATCH status updates and echoes the new status", async () => {
    reviewsServiceMock.updateReviewStatus.mockResolvedValue("reviewed");

    const res = await request(app)
      .patch("/domain/reviews/v1/s1/site1/status")
      .send({ reviewStatus: "reviewed" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ reviewStatus: "reviewed" });
    expect(reviewsServiceMock.updateReviewStatus).toHaveBeenCalledWith("s1", "v1", "site1", "reviewed");
  });

  it("PATCH status rejects an invalid body with 400", async () => {
    const res = await request(app)
      .patch("/domain/reviews/v1/s1/site1/status")
      .send({ reviewStatus: "bogus" });

    expect(res.status).toBe(400);
    expect(reviewsServiceMock.updateReviewStatus).not.toHaveBeenCalled();
  });
});
