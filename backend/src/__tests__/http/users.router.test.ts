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
    getUserSiteContext: vi.fn(),
    listUserPermissions: vi.fn(),
    resolvePermissionScopeAccess: vi.fn(),
    createUserPermission: vi.fn(),
    getUserPermission: vi.fn(),
    deleteUserPermission: vi.fn(),
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

  // ========= GET /domain/users/:userId/permissions =========

  it("GET /domain/users/:userId/permissions allows a same-site coordinator", async () => {
    // Input: GET permissions for a user in the coordinator's site.
    // Expected: the route returns the user's current permissions.
    mockSession();
    prismaMock.user.findUnique.mockResolvedValue({
      id: "actor-1",
      role: "SITE_COORDINATOR",
      siteId: "11111111-1111-1111-8111-111111111111",
    });
    usersServiceMock.getUserSiteContext.mockResolvedValue({
      id: "user-1",
      siteId: "11111111-1111-1111-8111-111111111111",
    });
    usersServiceMock.listUserPermissions.mockResolvedValue({
      userPermissions: [
        {
          id: "perm-1",
          userId: "user-1",
          permissionLevel: "READ",
          siteId: "11111111-1111-1111-8111-111111111111",
          studyId: null,
          videoId: null,
        },
      ],
    });

    const response = await request(app).get("/domain/users/user-1/permissions");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      userPermissions: [
        {
          id: "perm-1",
          userId: "user-1",
          permissionLevel: "READ",
          siteId: "11111111-1111-1111-8111-111111111111",
          studyId: null,
          videoId: null,
        },
      ],
    });
  });

  it("GET /domain/users/:userId/permissions returns 403 for a coordinator outside the target site", async () => {
    // Input: GET permissions for a user outside the coordinator's site.
    // Expected: the route rejects before listing permissions.
    mockSession();
    prismaMock.user.findUnique.mockResolvedValue({
      id: "actor-1",
      role: "SITE_COORDINATOR",
      siteId: "11111111-1111-1111-8111-111111111111",
    });
    usersServiceMock.getUserSiteContext.mockResolvedValue({
      id: "user-1",
      siteId: "22222222-2222-2222-8222-222222222222",
    });

    const response = await request(app).get("/domain/users/user-1/permissions");

    expect(response.status).toBe(403);
    expect(usersServiceMock.listUserPermissions).not.toHaveBeenCalled();
  });

  // ========= POST /domain/users/:userId/permissions =========

  it("POST /domain/users/:userId/permissions creates a permission for a sysadmin", async () => {
    // Input: POST a valid permission body as a sysadmin.
    // Expected: the route validates the body, resolves scope, and returns 201 with the created permission.
    mockSession();
    prismaMock.user.findUnique.mockResolvedValue({
      id: "actor-1",
      role: "SYSADMIN",
      siteId: "11111111-1111-1111-8111-111111111111",
    });
    usersServiceMock.getUserSiteContext.mockResolvedValue({
      id: "user-1",
      siteId: "22222222-2222-2222-8222-222222222222",
    });
    usersServiceMock.resolvePermissionScopeAccess.mockResolvedValue({
      isGlobal: false,
      siteIds: ["22222222-2222-2222-8222-222222222222"],
    });
    usersServiceMock.createUserPermission.mockResolvedValue({
      id: "perm-1",
      userId: "user-1",
      permissionLevel: "READ",
      siteId: "22222222-2222-2222-8222-222222222222",
      studyId: null,
      videoId: null,
    });

    const response = await request(app)
      .post("/domain/users/user-1/permissions")
      .send({
        permissionLevel: "READ",
        siteId: "22222222-2222-2222-8222-222222222222",
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: "perm-1",
      userId: "user-1",
      permissionLevel: "READ",
      siteId: "22222222-2222-2222-8222-222222222222",
      studyId: null,
      videoId: null,
    });
    expect(usersServiceMock.createUserPermission).toHaveBeenCalledWith(
      "user-1",
      {
        permissionLevel: "READ",
        siteId: "22222222-2222-2222-8222-222222222222",
        studyId: null,
        videoId: null,
      },
    );
  });

  it("POST /domain/users/:userId/permissions returns 400 for an invalid body", async () => {
    // Input: POST a permission with an invalid siteId.
    // Expected: request validation fails before any service call.
    mockSession();
    prismaMock.user.findUnique.mockResolvedValue({
      id: "actor-1",
      role: "SYSADMIN",
      siteId: "11111111-1111-1111-8111-111111111111",
    });
    usersServiceMock.getUserSiteContext.mockResolvedValue({
      id: "user-1",
      siteId: "22222222-2222-2222-8222-222222222222",
    });

    const response = await request(app)
      .post("/domain/users/user-1/permissions")
      .send({
        permissionLevel: "READ",
        siteId: "not-a-uuid",
      });

    expect(response.status).toBe(400);
    expect(usersServiceMock.resolvePermissionScopeAccess).not.toHaveBeenCalled();
    expect(usersServiceMock.createUserPermission).not.toHaveBeenCalled();
  });

  it("POST /domain/users/:userId/permissions defaults a coordinator permission to the target user's site", async () => {
    // Input: POST a study-scoped permission without siteId as a same-site coordinator.
    // Expected: the route fills in the target user's siteId before resolving and creating the permission.
    mockSession();
    prismaMock.user.findUnique.mockResolvedValue({
      id: "actor-1",
      role: "SITE_COORDINATOR",
      siteId: "11111111-1111-1111-8111-111111111111",
    });
    usersServiceMock.getUserSiteContext.mockResolvedValue({
      id: "user-1",
      siteId: "11111111-1111-1111-8111-111111111111",
    });
    usersServiceMock.resolvePermissionScopeAccess.mockResolvedValue({
      isGlobal: false,
      siteIds: ["11111111-1111-1111-8111-111111111111"],
    });
    usersServiceMock.createUserPermission.mockResolvedValue({
      id: "perm-1",
      userId: "user-1",
      permissionLevel: "READ",
      siteId: "11111111-1111-1111-8111-111111111111",
      studyId: "33333333-3333-3333-8333-333333333333",
      videoId: null,
    });

    const response = await request(app)
      .post("/domain/users/user-1/permissions")
      .send({
        permissionLevel: "READ",
        studyId: "33333333-3333-3333-8333-333333333333",
      });

    expect(response.status).toBe(201);
    expect(usersServiceMock.resolvePermissionScopeAccess).toHaveBeenCalledWith({
      permissionLevel: "READ",
      siteId: "11111111-1111-1111-8111-111111111111",
      studyId: "33333333-3333-3333-8333-333333333333",
      videoId: null,
    });
    expect(usersServiceMock.createUserPermission).toHaveBeenCalledWith("user-1", {
      permissionLevel: "READ",
      siteId: "11111111-1111-1111-8111-111111111111",
      studyId: "33333333-3333-3333-8333-333333333333",
      videoId: null,
    });
  });

  it("POST /domain/users/:userId/permissions returns 403 when a coordinator explicitly assigns another site", async () => {
    // Input: POST a permission that explicitly targets another site.
    // Expected: the route rejects the request before createUserPermission is called.
    mockSession();
    prismaMock.user.findUnique.mockResolvedValue({
      id: "actor-1",
      role: "SITE_COORDINATOR",
      siteId: "11111111-1111-1111-8111-111111111111",
    });
    usersServiceMock.getUserSiteContext.mockResolvedValue({
      id: "user-1",
      siteId: "11111111-1111-1111-8111-111111111111",
    });
    usersServiceMock.resolvePermissionScopeAccess.mockResolvedValue({
      isGlobal: false,
      siteIds: ["22222222-2222-2222-8222-222222222222"],
    });

    const response = await request(app)
      .post("/domain/users/user-1/permissions")
      .send({
        permissionLevel: "READ",
        siteId: "22222222-2222-2222-8222-222222222222",
      });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      status: "error",
      statusCode: 403,
      message: "Site coordinator cannot assign permissions outside their own site",
    });
    expect(usersServiceMock.createUserPermission).not.toHaveBeenCalled();
  });

  it("POST /domain/users/:userId/permissions returns 409 for a duplicate permission", async () => {
    // Input: POST an exact duplicate permission row.
    // Expected: the service conflict is returned as 409.
    mockSession();
    prismaMock.user.findUnique.mockResolvedValue({
      id: "actor-1",
      role: "SYSADMIN",
      siteId: "11111111-1111-1111-8111-111111111111",
    });
    usersServiceMock.getUserSiteContext.mockResolvedValue({
      id: "user-1",
      siteId: "22222222-2222-2222-8222-222222222222",
    });
    usersServiceMock.resolvePermissionScopeAccess.mockResolvedValue({
      isGlobal: false,
      siteIds: ["22222222-2222-2222-8222-222222222222"],
    });
    usersServiceMock.createUserPermission.mockRejectedValue(
      AppError.conflict("Duplicate user permission already exists"),
    );

    const response = await request(app)
      .post("/domain/users/user-1/permissions")
      .send({
        permissionLevel: "READ",
        siteId: "22222222-2222-2222-8222-222222222222",
      });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      status: "error",
      statusCode: 409,
      message: "Duplicate user permission already exists",
    });
  });

  // ========= DELETE /domain/users/:userId/permissions/:permissionId =========

  it("DELETE /domain/users/:userId/permissions/:permissionId removes a permission", async () => {
    // Input: DELETE a valid permission as a sysadmin.
    // Expected: the route returns 204 after deleting the permission.
    mockSession();
    prismaMock.user.findUnique.mockResolvedValue({
      id: "actor-1",
      role: "SYSADMIN",
      siteId: "11111111-1111-1111-8111-111111111111",
    });
    usersServiceMock.getUserSiteContext.mockResolvedValue({
      id: "user-1",
      siteId: "22222222-2222-2222-8222-222222222222",
    });
    usersServiceMock.getUserPermission.mockResolvedValue({
      id: "perm-1",
      userId: "user-1",
      permissionLevel: "READ",
      siteId: "22222222-2222-2222-8222-222222222222",
      studyId: null,
      videoId: null,
    });
    usersServiceMock.resolvePermissionScopeAccess.mockResolvedValue({
      isGlobal: false,
      siteIds: ["22222222-2222-2222-8222-222222222222"],
    });
    usersServiceMock.deleteUserPermission.mockResolvedValue(undefined);

    const response = await request(app).delete(
      "/domain/users/user-1/permissions/perm-1",
    );

    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(usersServiceMock.deleteUserPermission).toHaveBeenCalledWith(
      "user-1",
      "perm-1",
    );
  });

  it("DELETE /domain/users/:userId/permissions/:permissionId returns 403 when a coordinator removes outside their site", async () => {
    // Input: DELETE a permission whose resolved scope reaches another site.
    // Expected: the route rejects before deleting the permission.
    mockSession();
    prismaMock.user.findUnique.mockResolvedValue({
      id: "actor-1",
      role: "SITE_COORDINATOR",
      siteId: "11111111-1111-1111-8111-111111111111",
    });
    usersServiceMock.getUserSiteContext.mockResolvedValue({
      id: "user-1",
      siteId: "11111111-1111-1111-8111-111111111111",
    });
    usersServiceMock.getUserPermission.mockResolvedValue({
      id: "perm-1",
      userId: "user-1",
      permissionLevel: "READ",
      siteId: null,
      studyId: "33333333-3333-3333-8333-333333333333",
      videoId: null,
    });
    usersServiceMock.resolvePermissionScopeAccess.mockResolvedValue({
      isGlobal: false,
      siteIds: [
        "11111111-1111-1111-8111-111111111111",
        "22222222-2222-2222-8222-222222222222",
      ],
    });

    const response = await request(app).delete(
      "/domain/users/user-1/permissions/perm-1",
    );

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      status: "error",
      statusCode: 403,
      message: "Site coordinator cannot remove permissions outside their own site",
    });
    expect(usersServiceMock.deleteUserPermission).not.toHaveBeenCalled();
  });

  it("DELETE /domain/users/:userId/permissions/:permissionId returns 404 when the permission does not exist", async () => {
    // Input: DELETE a missing permission for an existing user.
    // Expected: the route returns the service not-found error.
    mockSession();
    prismaMock.user.findUnique.mockResolvedValue({
      id: "actor-1",
      role: "SYSADMIN",
      siteId: "11111111-1111-1111-8111-111111111111",
    });
    usersServiceMock.getUserSiteContext.mockResolvedValue({
      id: "user-1",
      siteId: "22222222-2222-2222-8222-222222222222",
    });
    usersServiceMock.getUserPermission.mockRejectedValue(
      AppError.notFound("User permission not found"),
    );

    const response = await request(app).delete(
      "/domain/users/user-1/permissions/missing-permission",
    );

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      status: "error",
      statusCode: 404,
      message: "User permission not found",
    });
  });
});
