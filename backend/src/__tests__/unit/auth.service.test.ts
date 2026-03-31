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

    // The service uses Prisma's callback transaction form, so unit tests route
    // that callback back into the same hoisted mock object.
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: AuthPrismaMock) => Promise<unknown>) =>
        callback(prismaMock),
    );

    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  it("creates an invitation and normalizes the email before storage", async () => {
    // Tests the invite-creation happy path: token generation, lowercased email,
    // and persisted invitation metadata before the response is returned.
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

  it("rejects activation when the invitation token is invalid or expired", async () => {
    // Covers the guard clause that stops activation before any account writes
    // when the invite cannot be atomically claimed.
    prismaMock.invitation.updateMany.mockResolvedValue({ count: 0 });

    await expect(activateInvite(makeActivateInviteInput())).rejects.toMatchObject({
      message: "Invalid or expired invitation",
      statusCode: 400,
    });

    expect(prismaMock.invitation.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("rejects activation when the email is already registered", async () => {
    // Verifies duplicate-user protection inside the transaction so an invite
    // cannot be used to create a second account for an existing email address.
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
    // Exercises the full success path: claim invite, create user/account/role,
    // and return the final API success payload.
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
    // Focuses specifically on credential handling to ensure raw passwords never
    // reach the account record and the hashed value is what gets persisted.
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
