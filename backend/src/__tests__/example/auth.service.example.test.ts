import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthModuleMock } from "../helpers/auth-mock.js";
import { resetAuthMock } from "../helpers/auth-mock.js";
import type { AuthPrismaMock } from "../helpers/prisma-mock.js";
import { resetAuthPrismaMock } from "../helpers/prisma-mock.js";
import { makeCreateInviteInput, makeInvitation } from "../helpers/fixtures.js";
import { AppError } from "../../middleware/errors.js";

const { prismaMock, authMock } = vi.hoisted(() => {
  const prismaMock = {
    invitation: {
      create: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    account: {
      create: vi.fn(),
    },
    userRole: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  } satisfies AuthPrismaMock;

  const context = {
    password: {
      hash: vi.fn(),
    },
  };

  return {
    prismaMock,
    authMock: {
      auth: {
        $context: Promise.resolve(context),
      },
      context,
    } satisfies AuthModuleMock,
  };
});

vi.mock("../../lib/prisma.js", () => ({
  default: prismaMock,
}));

vi.mock("../../lib/auth.js", () => ({
  auth: authMock.auth,
}));

import { createInvite } from "../../domains/auth/auth.service.js";

describe("example auth service checks", () => {
  beforeEach(() => {
    resetAuthPrismaMock(prismaMock);
    resetAuthMock(authMock);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  it("keeps the existing invite creation behavior green for valid emails", async () => {
    // Input: createInvite(...) receives "Invitee@Example.com".
    // Expected: the stored email becomes "invitee@example.com" and the
    // response returns the invite ID plus token.
    vi.spyOn(crypto, "randomBytes").mockReturnValue(Buffer.alloc(32, 3));
    prismaMock.invitation.create.mockResolvedValue(makeInvitation());

    const result = await createInvite(
      makeCreateInviteInput({ email: "Invitee@Example.com" }),
    );

    expect(prismaMock.invitation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "invitee@example.com",
      }),
    });
    expect(result).toEqual({
      id: expect.any(String),
      token: expect.any(String),
    });
  });

  it("shows the current bug when invite emails contain surrounding spaces", async () => {
    // Input: createInvite(...) receives " Invitee@Example.com ".
    // Expected: the email is trimmed and lowercased to
    // "invitee@example.com", the invitation is created, and the response
    // returns the invite ID plus token.
    prismaMock.invitation.create.mockResolvedValue(makeInvitation());

    await expect(
      createInvite(makeCreateInviteInput({ email: " Invitee@Example.com " })),
    ).resolves.toEqual({
      id: expect.any(String),
      token: expect.any(String),
    });

    expect(prismaMock.invitation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "invitee@example.com",
      }),
    });
  });

  it("keeps AppError factory behavior green in the example suite", () => {
    // Input: AppError.notFound("Missing video") is created.
    // Expected: the returned AppError uses status code 404 and keeps the same
    // message.
    expect(AppError.notFound("Missing video")).toMatchObject({
      message: "Missing video",
      statusCode: 404,
    });
  });
});
