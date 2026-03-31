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
    // createInvite(...) should still lowercase a valid email and return the
    // invite ID plus token in non-production mode.
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
    // Surrounding spaces in the email currently fail validation before the
    // service can trim and normalize the value. A developer reading this
    // failure can trace it to schema validation happening before `trim()`.
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
    // AppError.notFound(...) should still produce a 404 error object.
    expect(AppError.notFound("Missing video")).toMatchObject({
      message: "Missing video",
      statusCode: 404,
    });
  });
});
