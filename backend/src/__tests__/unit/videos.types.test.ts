import { describe, expect, it } from "vitest";
import {
  createVideoSchema,
  completeUploadSchema,
  updateVideoSchema,
} from "../../domains/videos/videos.types.js";

describe("videos.types", () => {
  // ========= createVideoSchema =========

  it("accepts a valid create video payload", () => {
    // Input: createVideoSchema receives all required fields.
    // Expected: the payload parses successfully without changing the fields.
    const payload = {
      videoTitle: "Test video title",
      videoDescription: "Test video description",
      videoName: "test-video.mp4",
      fileSize: 52428800,
      durationSeconds: 42,
      takenAt: "2026-01-01T12:00:00.000Z",
      contentType: "video/mp4" as const,
    };

    expect(createVideoSchema.parse(payload)).toEqual(payload);
  });

  it("rejects create payloads with a missing title", () => {
    // Input: createVideoSchema receives an empty videoTitle.
    // Expected: parsing fails because videoTitle is required.
    const result = createVideoSchema.safeParse({
      videoTitle: "",
      videoName: "test-video.mp4",
      fileSize: 52428800,
      durationSeconds: 42,
      takenAt: "2026-01-01T12:00:00.000Z",
      contentType: "video/mp4",
    });

    expect(result.success).toBe(false);
  });

  it("rejects create payloads with a non-positive duration", () => {
    // Input: createVideoSchema receives durationSeconds -1.
    // Expected: parsing fails because durationSeconds must be a positive
    // integer.
    const result = createVideoSchema.safeParse({
      videoTitle: "Test video title",
      videoName: "test-video.mp4",
      fileSize: 52428800,
      durationSeconds: -1,
      takenAt: "2026-01-01T12:00:00.000Z",
      contentType: "video/mp4",
    });

    expect(result.success).toBe(false);
  });

  it("rejects create payloads with an invalid datetime", () => {
    // Input: createVideoSchema receives takenAt "not-a-date".
    // Expected: parsing fails because takenAt must be an ISO datetime string.
    const result = createVideoSchema.safeParse({
      videoTitle: "Test video title",
      videoName: "test-video.mp4",
      fileSize: 52428800,
      durationSeconds: 42,
      takenAt: "not-a-date",
      contentType: "video/mp4",
    });

    expect(result.success).toBe(false);
  });

  // ========= completeUploadSchema =========

  it("accepts a valid complete upload payload", () => {
    // Input: completeUploadSchema receives an array of parts with partNumber and etag.
    // Expected: the payload parses successfully.
    const payload = {
      parts: [
        { partNumber: 1, etag: '"abc123"' },
        { partNumber: 2, etag: '"def456"' },
      ],
    };

    expect(completeUploadSchema.parse(payload)).toEqual(payload);
  });

  it("rejects complete upload with empty parts array", () => {
    // Input: completeUploadSchema receives an empty parts array.
    // Expected: parsing fails because at least one part is required.
    const result = completeUploadSchema.safeParse({ parts: [] });

    expect(result.success).toBe(false);
  });

  // ========= updateVideoSchema =========

  it("accepts valid update status values", () => {
    // Input: updateVideoSchema receives status "UPLOADED".
    // Expected: the payload parses successfully because "UPLOADED" is an allowed
    // status value.
    expect(updateVideoSchema.parse({ status: "UPLOADED" })).toEqual({
      status: "UPLOADED",
    });
  });

  it("rejects invalid update status values", () => {
    // Input: updateVideoSchema receives status "BROKEN".
    // Expected: parsing fails because "BROKEN" is not in the allowed status
    // enum.
    const result = updateVideoSchema.safeParse({ status: "BROKEN" });

    expect(result.success).toBe(false);
  });

  it("rejects empty update payloads", () => {
    // Input: updateVideoSchema receives {}.
    // Expected: parsing fails because at least one updatable field is required.
    const result = updateVideoSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
