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

  it("accepts invite emails with surrounding spaces after normalization", async () => {
    // Input: createInvite(...) receives " Invitee@Example.com ".
    // Expected: the email is trimmed and lowercased to
    // "invitee@example.com", the invitation is created, and the response
    // returns the invite ID plus token.
    const invitation = makeInvitation();

    prismaMock.invitation.create.mockResolvedValue(invitation);

    await expect(
      createInvite(makeCreateInviteInput({ email: " Invitee@Example.com " })),
    ).resolves.toEqual({
      id: invitation.id,
      token: expect.any(String),
    });

    expect(prismaMock.invitation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "invitee@example.com",
      }),
    });
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
    expect(prismaMock.userRole.create).not.toHaveBeenCalled();
  });

  it("activates an invitation successfully", async () => {
    // Input: activateInvite(...) receives a valid invite token, new email, and
    // password.
    // Expected: the invitation is claimed, the user/account/role records are
    // created, and the success payload is returned.
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
    prismaMock.userRole.create.mockResolvedValue({
      userId: "user-uuid",
      role: "CLINICAL_REVIEWER",
    });

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
      }),
    });
    expect(prismaMock.userRole.create).toHaveBeenCalledWith({
      data: { userId: "user-uuid", role: "CLINICAL_REVIEWER" },
    });
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
    prismaMock.userRole.create.mockResolvedValue({
      userId: "user-uuid",
      role: "CAREGIVER",
    });
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
