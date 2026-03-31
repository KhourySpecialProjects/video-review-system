import { describe, expect, it } from "vitest";
import {
  createVideoSchema,
  updateVideoSchema,
} from "../../domains/videos/videos.types.js";

describe("videos.types", () => {
  // ========= createVideoSchema =========

  it("accepts a valid create video payload", () => {
    // Input: createVideoSchema receives a valid patientId, durationSeconds, and
    // takenAt value.
    // Expected: the payload parses successfully without changing the fields.
    const payload = {
      patientId: "550e8400-e29b-41d4-a716-446655440000",
      durationSeconds: 42,
      takenAt: "2026-01-01T12:00:00.000Z",
    };

    expect(createVideoSchema.parse(payload)).toEqual(payload);
  });

  it("rejects create payloads with an invalid patientId", () => {
    // Input: createVideoSchema receives patientId "not-a-uuid".
    // Expected: parsing fails because patientId is not a valid UUID.
    const result = createVideoSchema.safeParse({
      patientId: "not-a-uuid",
    });

    expect(result.success).toBe(false);
  });

  it("rejects create payloads with a non-positive duration", () => {
    // Input: createVideoSchema receives durationSeconds -1.
    // Expected: parsing fails because durationSeconds must be a positive
    // integer.
    const result = createVideoSchema.safeParse({
      patientId: "550e8400-e29b-41d4-a716-446655440000",
      durationSeconds: -1,
    });

    expect(result.success).toBe(false);
  });

  it("rejects create payloads with an invalid datetime", () => {
    // Input: createVideoSchema receives takenAt "not-a-date".
    // Expected: parsing fails because takenAt must be an ISO datetime string.
    const result = createVideoSchema.safeParse({
      patientId: "550e8400-e29b-41d4-a716-446655440000",
      takenAt: "not-a-date",
    });

    expect(result.success).toBe(false);
  });

  // ========= updateVideoSchema =========

  it("accepts valid update status values", () => {
    // Input: updateVideoSchema receives status "READY".
    // Expected: the payload parses successfully because "READY" is an allowed
    // status value.
    expect(updateVideoSchema.parse({ status: "READY" })).toEqual({
      status: "READY",
    });
  });

  it("rejects invalid update status values", () => {
    // Input: updateVideoSchema receives status "BROKEN".
    // Expected: parsing fails because "BROKEN" is not in the allowed status
    // enum.
    const result = updateVideoSchema.safeParse({ status: "BROKEN" });

    expect(result.success).toBe(false);
  });
});
