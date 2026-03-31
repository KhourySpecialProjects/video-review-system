import { describe, expect, it } from "vitest";
import {
  activateInviteSchema,
  createInviteSchema,
  roleSchema,
} from "../../domains/auth/auth.types.js";

describe("auth.types", () => {
  // ========= roleSchema =========

  it("accepts valid role values", () => {
    // Input: roleSchema receives "CAREGIVER".
    // Expected: parsing succeeds because the role is part of the allowed enum.
    expect(roleSchema.parse("CAREGIVER")).toBe("CAREGIVER");
  });

  it("rejects invalid role values", () => {
    // Input: roleSchema receives "INVALID_ROLE".
    // Expected: parsing fails because the role is not part of the allowed enum.
    const result = roleSchema.safeParse("INVALID_ROLE");

    expect(result.success).toBe(false);
  });

  // ========= createInviteSchema =========

  it("accepts a valid invite payload", () => {
    // Input: createInviteSchema receives a valid email and role.
    // Expected: the payload parses successfully without changing the fields.
    const payload = {
      email: "invitee@example.com",
      role: "CAREGIVER",
    };

    expect(createInviteSchema.parse(payload)).toEqual(payload);
  });

  it("rejects invite payloads with an invalid email", () => {
    // Input: createInviteSchema receives email "bad-email".
    // Expected: parsing fails because the email is not valid.
    const result = createInviteSchema.safeParse({
      email: "bad-email",
      role: "CAREGIVER",
    });

    expect(result.success).toBe(false);
  });

  // ========= activateInviteSchema =========

  it("accepts a valid activation payload", () => {
    // Input: activateInviteSchema receives a valid token, name, email, and
    // password.
    // Expected: the payload parses successfully and trims the name field.
    const payload = {
      token: "invite-token",
      name: " Test User ",
      email: "invitee@example.com",
      password: "securepassword123",
    };

    expect(activateInviteSchema.parse(payload)).toEqual({
      ...payload,
      name: "Test User",
    });
  });

  it("rejects activation payloads with invalid fields", () => {
    // Input: activateInviteSchema receives empty token, blank name, invalid
    // email, and short password.
    // Expected: parsing fails because all four fields violate validation rules.
    const result = activateInviteSchema.safeParse({
      token: "",
      name: " ",
      email: "bad-email",
      password: "short",
    });

    expect(result.success).toBe(false);
  });
});
