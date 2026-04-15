import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn());

vi.mock("@aws-sdk/client-ses", () => {
  return {
    SESClient: vi.fn(() => ({ send: sendMock })),
    SendEmailCommand: vi.fn((input: unknown) => input),
  };
});

import { sendInviteEmail, sendPasswordResetEmail } from "../../lib/ses.js";

describe("ses", () => {
  beforeEach(() => {
    sendMock.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  // ========= sendInviteEmail =========

  describe("sendInviteEmail", () => {
    it("sends an invite email with the correct activation URL", async () => {
      process.env.SES_FROM_EMAIL = "noreply@example.com";
      process.env.FRONTEND_URL = "https://app.example.com";

      await sendInviteEmail("user@example.com", "abc123");

      expect(sendMock).toHaveBeenCalledOnce();
      const command = sendMock.mock.calls[0][0];
      expect(command.Source).toBe("noreply@example.com");
      expect(command.Destination.ToAddresses).toEqual(["user@example.com"]);
      expect(command.Message.Subject.Data).toBe("You've been invited");
      expect(command.Message.Body.Html.Data).toContain(
        "https://app.example.com/signup/abc123",
      );
    });

    it("logs the activation URL in non-production", async () => {
      process.env.SES_FROM_EMAIL = "noreply@example.com";
      process.env.FRONTEND_URL = "https://app.example.com";
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";

      try {
        await sendInviteEmail("user@example.com", "token123");

        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining("https://app.example.com/signup/token123"),
        );
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });

    it("does not log the activation URL in production", async () => {
      process.env.SES_FROM_EMAIL = "noreply@example.com";
      process.env.FRONTEND_URL = "https://app.example.com";
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      try {
        await sendInviteEmail("user@example.com", "token123");

        expect(console.log).not.toHaveBeenCalled();
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });

    it("skips sending when SES_FROM_EMAIL is not configured", async () => {
      const original = process.env.SES_FROM_EMAIL;
      delete process.env.SES_FROM_EMAIL;

      try {
        await sendInviteEmail("user@example.com", "abc123");

        expect(sendMock).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining("SES_FROM_EMAIL not configured"),
        );
      } finally {
        if (original) process.env.SES_FROM_EMAIL = original;
      }
    });

    it("uses default FRONTEND_URL when env var is not set", async () => {
      process.env.SES_FROM_EMAIL = "noreply@example.com";
      const original = process.env.FRONTEND_URL;
      delete process.env.FRONTEND_URL;

      try {
        await sendInviteEmail("user@example.com", "token456");

        const command = sendMock.mock.calls[0][0];
        expect(command.Message.Body.Html.Data).toContain(
          "https://localhost:5173/signup/token456",
        );
      } finally {
        if (original) process.env.FRONTEND_URL = original;
      }
    });

    it("propagates SES errors to the caller", async () => {
      process.env.SES_FROM_EMAIL = "noreply@example.com";
      sendMock.mockRejectedValueOnce(new Error("SES rate limit exceeded"));

      await expect(
        sendInviteEmail("user@example.com", "abc123"),
      ).rejects.toThrow("SES rate limit exceeded");
    });
  });

  // ========= sendPasswordResetEmail =========

  describe("sendPasswordResetEmail", () => {
    it("sends a password reset email with the provided URL", async () => {
      process.env.SES_FROM_EMAIL = "noreply@example.com";

      await sendPasswordResetEmail(
        "user@example.com",
        "https://app.example.com/reset-password?token=xyz",
      );

      expect(sendMock).toHaveBeenCalledOnce();
      const command = sendMock.mock.calls[0][0];
      expect(command.Source).toBe("noreply@example.com");
      expect(command.Destination.ToAddresses).toEqual(["user@example.com"]);
      expect(command.Message.Subject.Data).toBe("Reset your password");
      expect(command.Message.Body.Html.Data).toContain(
        "https://app.example.com/reset-password?token=xyz",
      );
    });

    it("logs the reset URL in non-production", async () => {
      process.env.SES_FROM_EMAIL = "noreply@example.com";
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";

      try {
        await sendPasswordResetEmail(
          "user@example.com",
          "https://app.example.com/reset?token=abc",
        );

        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining("https://app.example.com/reset?token=abc"),
        );
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });

    it("skips sending when SES_FROM_EMAIL is not configured", async () => {
      const original = process.env.SES_FROM_EMAIL;
      delete process.env.SES_FROM_EMAIL;

      try {
        await sendPasswordResetEmail("user@example.com", "https://example.com/reset");

        expect(sendMock).not.toHaveBeenCalled();
      } finally {
        if (original) process.env.SES_FROM_EMAIL = original;
      }
    });

    it("propagates SES errors to the caller", async () => {
      process.env.SES_FROM_EMAIL = "noreply@example.com";
      sendMock.mockRejectedValueOnce(new Error("Invalid email address"));

      await expect(
        sendPasswordResetEmail("bad@example.com", "https://example.com/reset"),
      ).rejects.toThrow("Invalid email address");
    });
  });
});
