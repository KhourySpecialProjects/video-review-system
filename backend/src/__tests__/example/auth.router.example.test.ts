import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestApp } from "../helpers/test-app.js";
import { makeCreateInviteInput } from "../helpers/fixtures.js";

const { authServiceMock } = vi.hoisted(() => ({
  authServiceMock: {
    createInvite: vi.fn(),
    activateInvite: vi.fn(),
  },
}));

vi.mock("../../domains/auth/auth.service.js", () => authServiceMock);

import authRouter from "../../domains/auth/auth.router.js";

describe("example auth router checks", () => {
  const app = createTestApp("/domain/auth", authRouter);

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.ADMIN_SECRET = "test-admin-secret";
  });

  it("keeps the existing unauthorized invite behavior green", async () => {
    // POST /domain/auth/invite should still return 401 when the admin-secret
    // header is missing.
    const response = await request(app)
      .post("/domain/auth/invite")
      .send(makeCreateInviteInput());

    expect(response.status).toBe(401);
    expect(authServiceMock.createInvite).not.toHaveBeenCalled();
  });

  it("shows the current router behavior for invite emails with surrounding spaces", async () => {
    // A request with a valid admin header but an email wrapped in spaces
    // currently fails at schema validation. If a developer expected trimming at
    // the HTTP boundary, this failure points to the invite schema/router path.
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
});
