import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestApp } from "../helpers/test-app.js";
import {
  makeActivateInviteInput,
  makeCreateInviteInput,
} from "../helpers/fixtures.js";

const { authMock, authServiceMock } = vi.hoisted(() => ({
  authMock: {
    auth: {
      api: {
        getSession: vi.fn(),
      },
    },
  },
  authServiceMock: {
    createInvite: vi.fn(),
    activateInvite: vi.fn(),
  },
}));

vi.mock("../../lib/auth.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/auth.js")>();

  return {
    ...actual,
    auth: authMock.auth,
  };
});

vi.mock("../../domains/auth/auth.service.js", () => authServiceMock);

import authRouter from "../../domains/auth/auth.router.js";

describe("auth.router", () => {
  const app = createTestApp("/domain/auth", authRouter);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  function mockSession(role: string = "SYSADMIN", userId = "actor-1") {
    authMock.auth.api.getSession.mockResolvedValue({
      user: { id: userId, role },
    });
  }

  // ========= POST /domain/auth/invite =========

  it("POST /domain/auth/invite requires a valid session", async () => {
    // Input: POST /domain/auth/invite without an authenticated session.
    // Expected: requireSession blocks the request with 401.
    authMock.auth.api.getSession.mockResolvedValue(null);

    const response = await request(app)
      .post("/domain/auth/invite")
      .send(makeCreateInviteInput());

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      status: "error",
      statusCode: 401,
      message: "Unauthorized",
    });
    expect(authServiceMock.createInvite).not.toHaveBeenCalled();
  });

  it("POST /domain/auth/invite forbids non-sysadmin users", async () => {
    // Input: POST /domain/auth/invite as a site coordinator.
    // Expected: the route returns 403 before calling the service.
    mockSession("SITE_COORDINATOR");

    const response = await request(app)
      .post("/domain/auth/invite")
      .send(makeCreateInviteInput());

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      status: "error",
      statusCode: 403,
      message: "Forbidden",
    });
    expect(authServiceMock.createInvite).not.toHaveBeenCalled();
  });

  it("POST /domain/auth/invite validates the body and forwards it to the service", async () => {
    // Input: POST /domain/auth/invite as a sysadmin with a valid payload.
    // Expected: the route calls the invite service with the same payload and returns the service result.
    mockSession("SYSADMIN");
    const input = makeCreateInviteInput();
    const payload = { id: "invite-id", token: "activation-token" };

    authServiceMock.createInvite.mockResolvedValue(payload);

    const response = await request(app)
      .post("/domain/auth/invite")
      .send(input);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(payload);
    expect(authServiceMock.createInvite).toHaveBeenCalledWith(input);
  });

  it("POST /domain/auth/invite rejects invalid payloads before the service is called", async () => {
    // Input: POST /domain/auth/invite as a sysadmin with invalid email and role values.
    // Expected: the route returns status 400 and does not call the invite service.
    mockSession("SYSADMIN");
    const response = await request(app)
      .post("/domain/auth/invite")
      .send({ email: "bad-email", role: "INVALID_ROLE" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: "error",
      statusCode: 400,
      message: "Validation failed",
    });
    expect(authServiceMock.createInvite).not.toHaveBeenCalled();
  });

  // ========= POST /domain/auth/activate =========

  it("POST /domain/auth/activate validates the body and forwards it to the service", async () => {
    // Input: POST /domain/auth/activate with a valid activation payload.
    // Expected: the route calls the activation service with the same payload
    // and returns the service response.
    const input = makeActivateInviteInput();
    const payload = {
      success: true,
      message: "Account created. Please sign in.",
    };

    authServiceMock.activateInvite.mockResolvedValue(payload);

    const response = await request(app)
      .post("/domain/auth/activate")
      .send(input);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(payload);
    expect(authServiceMock.activateInvite).toHaveBeenCalledWith(input);
  });

  it("POST /domain/auth/activate rejects invalid payloads before the service is called", async () => {
    // Input: POST /domain/auth/activate with invalid token, name, email, and
    // password values.
    // Expected: the route returns status 400 and does not call the activation
    // service.
    const response = await request(app).post("/domain/auth/activate").send({
      token: "",
      name: " ",
      email: "not-an-email",
      password: "short",
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: "error",
      statusCode: 400,
      message: "Validation failed",
    });
    expect(authServiceMock.activateInvite).not.toHaveBeenCalled();
  });
});
