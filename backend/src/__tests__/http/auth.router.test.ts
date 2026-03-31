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

  // ========= POST /domain/auth/invite =========

  it("POST /domain/auth/invite requires the admin-secret header", async () => {
    // Input: POST /domain/auth/invite without the admin-secret header.
    // Expected: the route returns status 401 and does not call the invite
    // service.
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

  it("POST /domain/auth/invite fails closed when ADMIN_SECRET is not configured", async () => {
    // Input: POST /domain/auth/invite when the server has no configured admin
    // secret.
    // Expected: the route still returns status 401 and does not call the invite
    // service.
    delete process.env.ADMIN_SECRET;
    authServiceMock.createInvite.mockResolvedValue({
      id: "invite-id",
      token: "activation-token",
    });

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
    // Input: POST /domain/auth/invite with a valid admin header and valid
    // invite payload.
    // Expected: the route calls the invite service with the same payload and
    // returns the service result.
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
    // Input: POST /domain/auth/invite with valid admin header but invalid email
    // and role values.
    // Expected: the route returns status 400 and does not call the invite
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

  it("POST /domain/auth/invite accepts emails with surrounding spaces after normalization", async () => {
    // Input: POST /domain/auth/invite with valid admin header and email
    // " Invitee@Example.com ".
    // Expected: the route accepts the request, normalizes the email to
    // "invitee@example.com", passes the normalized payload to the service, and
    // returns status 200.
    authServiceMock.createInvite.mockResolvedValue({
      id: "invite-id",
      token: "activation-token",
    });

    const response = await request(app)
      .post("/domain/auth/invite")
      .set("admin-secret", "test-admin-secret")
      .send(makeCreateInviteInput({ email: " Invitee@Example.com " }));

    expect(response.status).toBe(200);
    expect(authServiceMock.createInvite).toHaveBeenCalledWith({
      email: "invitee@example.com",
      role: "CAREGIVER",
    });
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

  it("POST /domain/auth/activate normalizes the email before calling the service", async () => {
    // Input: POST /domain/auth/activate with email
    // " Invitee@Example.com " and name " Test User ".
    // Expected: the route forwards the parsed payload with a trimmed name and
    // normalized email.
    authServiceMock.activateInvite.mockResolvedValue({
      success: true,
      message: "Account created. Please sign in.",
    });

    const response = await request(app).post("/domain/auth/activate").send({
      ...makeActivateInviteInput(),
      name: " Test User ",
      email: " Invitee@Example.com ",
    });

    expect(response.status).toBe(200);
    expect(authServiceMock.activateInvite).toHaveBeenCalledWith({
      ...makeActivateInviteInput(),
      name: "Test User",
      email: "invitee@example.com",
    });
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
