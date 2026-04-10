import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthModuleMock } from "../helpers/auth-mock.js";
import { resetAuthMock } from "../helpers/auth-mock.js";
import type { AuthPrismaMock } from "../helpers/prisma-mock.js";
import { resetAuthPrismaMock } from "../helpers/prisma-mock.js";
import {
  makeActivateInviteInput,
  makeCreateInviteInput,
  makeInvitation,
  makeUser,
} from "../helpers/fixtures.js";

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

import {
  activateInvite,
  createInvite,
} from "../../domains/auth/auth.service.js";

describe("auth.service", () => {
  beforeEach(() => {
    resetAuthPrismaMock(prismaMock);
    resetAuthMock(authMock);

    // Input: auth.service.ts uses Prisma's callback transaction form.
    // Expected: the unit test routes that callback back into the same hoisted
    // Prisma mock so transaction calls stay observable.
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: AuthPrismaMock) => Promise<unknown>) =>
        callback(prismaMock),
    );

    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  // ========= createInvite =========

  it("creates an invitation and normalizes the email before storage", async () => {
    // Input: createInvite(...) receives "Invitee@Example.com".
    // Expected: the token is generated, the stored email becomes
    // "invitee@example.com", and the response returns the invite ID plus token.
    const invitation = makeInvitation();
    const randomBytesSpy = vi
      .spyOn(crypto, "randomBytes")
      .mockReturnValue(Buffer.alloc(32, 7));

    prismaMock.invitation.create.mockResolvedValue(invitation);

    const result = await createInvite(
      makeCreateInviteInput({ email: "Invitee@Example.com" }),
    );

    expect(randomBytesSpy).toHaveBeenCalledWith(32);
    expect(prismaMock.invitation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "invitee@example.com",
        role: "CAREGIVER",
        createdBy: "system",
      }),
    });
    expect(prismaMock.invitation.create.mock.calls[0][0].data.tokenHash).toEqual(
      expect.any(String),
    );
    expect(result).toEqual({
      id: invitation.id,
      token: expect.any(String),
    });
  });

  it("stores the hash of the returned token and a 24-hour expiration", async () => {
    // Input: createInvite(...) succeeds at a fixed clock time.
    // Expected: Prisma stores the SHA-256 hash of the returned token and an
    // expiration exactly 24 hours in the future.
    const invitation = makeInvitation();
    const now = new Date("2026-03-31T12:00:00.000Z");

    vi.useFakeTimers();
    vi.setSystemTime(now);
    prismaMock.invitation.create.mockResolvedValue(invitation);

    try {
      const result = await createInvite(makeCreateInviteInput());
      const persistedInvite = prismaMock.invitation.create.mock.calls[0][0].data;

      expect(persistedInvite.tokenHash).toBe(
        crypto.createHash("sha256").update(result.token).digest("hex"),
      );
      expect(persistedInvite.expiresAt).toEqual(
        new Date(now.getTime() + 24 * 60 * 60 * 1000),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not return or log the activation token in production", async () => {
    // Input: createInvite(...) succeeds while NODE_ENV is "production".
    // Expected: the response only exposes the invitation id and the service
    // does not log the dev-only token.
    const invitation = makeInvitation();
    const originalNodeEnv = process.env.NODE_ENV;

    process.env.NODE_ENV = "production";
    prismaMock.invitation.create.mockResolvedValue(invitation);

    try {
      await expect(createInvite(makeCreateInviteInput())).resolves.toEqual({
        id: invitation.id,
      });
      expect(console.log).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  // ========= activateInvite =========

  it("rejects activation when the invitation token is invalid or expired", async () => {
    // Input: activateInvite(...) tries to claim an invitation but Prisma
    // reports count 0.
    // Expected: the service rejects with "Invalid or expired invitation" and
    // no user, account, or role records are created.
    prismaMock.invitation.updateMany.mockResolvedValue({ count: 0 });

    await expect(activateInvite(makeActivateInviteInput())).rejects.toMatchObject({
      message: "Invalid or expired invitation",
      statusCode: 400,
    });

    expect(prismaMock.invitation.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("rejects activation when the email is already registered", async () => {
    // Input: activateInvite(...) claims the invitation but finds an existing
    // user for the normalized email.
    // Expected: the service rejects with a 409 conflict and no account or role
    // record is created.
    prismaMock.invitation.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.invitation.findFirst.mockResolvedValue(makeInvitation());
    prismaMock.user.findUnique.mockResolvedValue(
      makeUser({ email: "invitee@example.com" }),
    );

    await expect(
      activateInvite(
        makeActivateInviteInput({ email: "Invitee@Example.com" }),
      ),
    ).rejects.toMatchObject({
      message: "Email already registered",
      statusCode: 409,
    });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: "invitee@example.com" },
    });
    expect(prismaMock.account.create).not.toHaveBeenCalled();
  });

  it("activates an invitation successfully", async () => {
    // Input: activateInvite(...) receives a valid invite token, new email, and
    // password.
    // Expected: the invitation is claimed, the user/account records are
    // created with role and siteId from the invitation, and the success
    // payload is returned.
    const randomUuidSpy = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("user-uuid")
      .mockReturnValueOnce("account-uuid");

    prismaMock.invitation.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.invitation.findFirst.mockResolvedValue(
      makeInvitation({ role: "CLINICAL_REVIEWER" }),
    );
    prismaMock.user.findUnique.mockResolvedValue(null);
    authMock.context.password.hash.mockResolvedValue("hashed-password");
    prismaMock.user.create.mockResolvedValue(makeUser({ id: "user-uuid" }));
    prismaMock.account.create.mockResolvedValue({ id: "account-uuid" });

    const result = await activateInvite(
      makeActivateInviteInput({ email: "Invitee@Example.com" }),
    );

    expect(randomUuidSpy).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      success: true,
      message: "Account created. Please sign in.",
    });
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "user-uuid",
        name: "Test User",
        email: "invitee@example.com",
        role: "CLINICAL_REVIEWER",
        siteId: "11111111-1111-1111-8111-111111111111",
      }),
    });
  });

  it("rejects activation when the claimed invitation cannot be loaded", async () => {
    // Input: activateInvite(...) claims an invitation but the follow-up lookup
    // returns null.
    // Expected: the service rejects with the same invalid/expired invite error
    // and does not create any user records.
    prismaMock.invitation.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.invitation.findFirst.mockResolvedValue(null);

    await expect(activateInvite(makeActivateInviteInput())).rejects.toMatchObject({
      message: "Invalid or expired invitation",
      statusCode: 400,
    });

    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.account.create).not.toHaveBeenCalled();
  });

  it("hashes the password before creating the credential account", async () => {
    // Input: activateInvite(...) receives raw password "super-secret-123".
    // Expected: the password is hashed first and the account record stores the
    // hashed value instead of the raw password.
    prismaMock.invitation.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.invitation.findFirst.mockResolvedValue(makeInvitation());
    prismaMock.user.findUnique.mockResolvedValue(null);
    authMock.context.password.hash.mockResolvedValue("hashed-password");
    prismaMock.user.create.mockResolvedValue(makeUser({ id: "user-uuid" }));
    prismaMock.account.create.mockResolvedValue({ id: "account-uuid" });
    vi.spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("user-uuid")
      .mockReturnValueOnce("account-uuid");

    await activateInvite(makeActivateInviteInput({ password: "super-secret-123" }));

    expect(authMock.context.password.hash).toHaveBeenCalledWith(
      "super-secret-123",
    );
    expect(prismaMock.account.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "account-uuid",
        userId: "user-uuid",
        providerId: "credential",
        password: "hashed-password",
      }),
    });
  });
});
