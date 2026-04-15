import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestApp } from "../helpers/test-app.js";
import { AppError } from "../../middleware/errors.js";

const { authMock, prismaMock, usersServiceMock } = vi.hoisted(() => ({
  authMock: {
    auth: {
      api: {
        getSession: vi.fn(),
      },
    },
  },
  prismaMock: {
    user: {
      findUnique: vi.fn(),
    },
  },
  usersServiceMock: {
    listUsers: vi.fn(),
    getUserDetail: vi.fn(),
  },
}));

vi.mock("../../lib/auth.js", () => ({
  auth: authMock.auth,
}));

vi.mock("../../lib/prisma.js", () => ({
  default: prismaMock,
}));

vi.mock("../../domains/users/users.service.js", () => usersServiceMock);

import usersRouter from "../../domains/users/users.router.js";

describe("users.router", () => {
  const app = createTestApp("/domain/users", usersRouter);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  function mockSession(userId = "actor-1") {
    authMock.auth.api.getSession.mockResolvedValue({
      user: { id: userId },
    });
  }

  // ========= GET /domain/users =========

  it("GET /domain/users returns 401 when no session exists", async () => {
    // Input: GET /domain/users without an authenticated session.
    // Expected: requireSession blocks the request with 401.
    authMock.auth.api.getSession.mockResolvedValue(null);

    const response = await request(app).get("/domain/users");

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      status: "error",
      statusCode: 401,
      message: "Unauthorized",
    });
    expect(usersServiceMock.listUsers).not.toHaveBeenCalled();
  });

  it("GET /domain/users returns 403 for authenticated non-admin users", async () => {
    // Input: GET /domain/users as a caregiver.
    // Expected: the route rejects the request before calling the service.
    mockSession();
    prismaMock.user.findUnique.mockResolvedValue({
      id: "actor-1",
      role: "CAREGIVER",
      siteId: "11111111-1111-1111-8111-111111111111",
    });

    const response = await request(app).get("/domain/users");

    expect(response.status).toBe(403);
    expect(usersServiceMock.listUsers).not.toHaveBeenCalled();
  });

  it("GET /domain/users returns 400 for invalid query params", async () => {
    // Input: GET /domain/users with an invalid siteId value.
    // Expected: query validation fails before the service is called.
    mockSession();
    prismaMock.user.findUnique.mockResolvedValue({
      id: "actor-1",
      role: "SYSADMIN",
      siteId: "11111111-1111-1111-8111-111111111111",
    });

    const response = await request(app)
      .get("/domain/users")
      .query({ siteId: "not-a-uuid" });

    expect(response.status).toBe(400);
    expect(usersServiceMock.listUsers).not.toHaveBeenCalled();
  });

  it("GET /domain/users returns 403 when a coordinator filters another site", async () => {
    // Input: GET /domain/users with a siteId outside the coordinator's site.
    // Expected: the route rejects the request before calling the service.
    mockSession();
    prismaMock.user.findUnique.mockResolvedValue({
      id: "actor-1",
      role: "SITE_COORDINATOR",
      siteId: "11111111-1111-1111-8111-111111111111",
    });

    const response = await request(app)
      .get("/domain/users")
      .query({ siteId: "22222222-2222-2222-8222-222222222222" });

    expect(response.status).toBe(403);
    expect(usersServiceMock.listUsers).not.toHaveBeenCalled();
  });

  it("GET /domain/users returns filtered results for a sysadmin", async () => {
    // Input: GET /domain/users with valid filters as a sysadmin.
    // Expected: the route parses query params and forwards them to the service.
    mockSession();
    prismaMock.user.findUnique.mockResolvedValue({
      id: "actor-1",
      role: "SYSADMIN",
      siteId: "11111111-1111-1111-8111-111111111111",
    });

    const payload = {
      users: [
        {
          id: "user-1",
          name: "Jane Smith",
          email: "jane@hospital.org",
          role: "SITE_COORDINATOR",
          siteId: "11111111-1111-1111-8111-111111111111",
          isDeactivated: false,
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    };

    usersServiceMock.listUsers.mockResolvedValue(payload);

    const response = await request(app)
      .get("/domain/users")
      .query({
        role: "SITE_COORDINATOR",
        includeDeactivated: "false",
        limit: "20",
        offset: "0",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(payload);
    expect(usersServiceMock.listUsers).toHaveBeenCalledWith(
      {
        role: "SITE_COORDINATOR",
        includeDeactivated: false,
        limit: 20,
        offset: 0,
      },
      undefined,
    );
  });

  it("GET /domain/users restricts a coordinator to their own site", async () => {
    // Input: GET /domain/users as a coordinator without a siteId filter.
    // Expected: the service receives the coordinator site restriction.
    mockSession();
    prismaMock.user.findUnique.mockResolvedValue({
      id: "actor-1",
      role: "SITE_COORDINATOR",
      siteId: "11111111-1111-1111-8111-111111111111",
    });

    const payload = {
      users: [],
      total: 0,
      limit: 20,
      offset: 0,
    };

    usersServiceMock.listUsers.mockResolvedValue(payload);

    const response = await request(app).get("/domain/users");

    expect(response.status).toBe(200);
    expect(usersServiceMock.listUsers).toHaveBeenCalledWith(
      {
        includeDeactivated: false,
        limit: 20,
        offset: 0,
      },
      "11111111-1111-1111-8111-111111111111",
    );
  });

  // ========= GET /domain/users/:userId =========

  it("GET /domain/users/:userId allows a sysadmin to view any user", async () => {
    // Input: GET /domain/users/:userId as a sysadmin.
    // Expected: the route returns the service result.
    mockSession();
    prismaMock.user.findUnique.mockResolvedValue({
      id: "actor-1",
      role: "SYSADMIN",
      siteId: "11111111-1111-1111-8111-111111111111",
    });

    const payload = {
      id: "user-1",
      name: "Jane Smith",
      email: "jane@hospital.org",
      role: "SITE_COORDINATOR",
      siteId: "22222222-2222-2222-8222-222222222222",
      isDeactivated: false,
      userPermissions: [],
    };

    usersServiceMock.getUserDetail.mockResolvedValue(payload);

    const response = await request(app).get("/domain/users/user-1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(payload);
  });

  it("GET /domain/users/:userId returns 403 when a coordinator requests another site", async () => {
    // Input: GET /domain/users/:userId for a user outside the coordinator's
    // site.
    // Expected: the route rejects the request after loading the target user.
    mockSession();
    prismaMock.user.findUnique.mockResolvedValue({
      id: "actor-1",
      role: "SITE_COORDINATOR",
      siteId: "11111111-1111-1111-8111-111111111111",
    });

    usersServiceMock.getUserDetail.mockResolvedValue({
      id: "user-1",
      name: "Jane Smith",
      email: "jane@hospital.org",
      role: "CLINICAL_REVIEWER",
      siteId: "22222222-2222-2222-8222-222222222222",
      isDeactivated: false,
      userPermissions: [],
    });

    const response = await request(app).get("/domain/users/user-1");

    expect(response.status).toBe(403);
  });

  it("GET /domain/users/:userId returns 404 when the user does not exist", async () => {
    // Input: GET /domain/users/:userId for a missing user.
    // Expected: the service not-found error is returned as 404.
    mockSession();
    prismaMock.user.findUnique.mockResolvedValue({
      id: "actor-1",
      role: "SYSADMIN",
      siteId: "11111111-1111-1111-8111-111111111111",
    });

    usersServiceMock.getUserDetail.mockRejectedValue(
      AppError.notFound("User not found"),
    );

    const response = await request(app).get("/domain/users/missing-user");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      status: "error",
      statusCode: 404,
      message: "User not found",
    });
  });
});
