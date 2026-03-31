import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestApp } from "../helpers/test-app.js";
import {
  makeActivateInviteInput,
  makeCreateInviteInput,
} from "../helpers/fixtures.js";

const { authServiceMock } = vi.hoisted(() => ({
  authServiceMock: {
    createInvite: vi.fn(),
    activateInvite: vi.fn(),
  },
}));

vi.mock("../../domains/auth/auth.service.js", () => authServiceMock);

import authRouter from "../../domains/auth/auth.router.js";

describe("auth.router", () => {
  const app = createTestApp("/domain/auth", authRouter);

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.ADMIN_SECRET = "test-admin-secret";
  });

  it("POST /domain/auth/invite requires the admin-secret header", async () => {
    // POST /domain/auth/invite should return 401 when the request does not
    // include the correct `admin-secret` header, and it should not call the
    // invite service.
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

  it("POST /domain/auth/invite validates the body and forwards it to the service", async () => {
    // POST /domain/auth/invite should accept a valid admin header and request
    // body, call the service with that body, and return the service result.
    const input = makeCreateInviteInput();
    const payload = { id: "invite-id", token: "activation-token" };

    authServiceMock.createInvite.mockResolvedValue(payload);

    const response = await request(app)
      .post("/domain/auth/invite")
      .set("admin-secret", "test-admin-secret")
      .send(input);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(payload);
    expect(authServiceMock.createInvite).toHaveBeenCalledWith(input);
  });

  it("POST /domain/auth/invite rejects invalid payloads before the service is called", async () => {
    // POST /domain/auth/invite should return 400 for an invalid email or role,
    // even when the admin header is correct, and it should not call the invite
    // service.
    const response = await request(app)
      .post("/domain/auth/invite")
      .set("admin-secret", "test-admin-secret")
      .send({ email: "bad-email", role: "INVALID_ROLE" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: "error",
      statusCode: 400,
      message: "Validation failed",
    });
    expect(authServiceMock.createInvite).not.toHaveBeenCalled();
  });

  it("POST /domain/auth/activate validates the body and forwards it to the service", async () => {
    // POST /domain/auth/activate should accept a valid body, call the
    // activation service with that body, and return the service response.
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
    // POST /domain/auth/activate should return 400 when token, name, email, or
    // password are invalid, and it should not call the activation service.
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
