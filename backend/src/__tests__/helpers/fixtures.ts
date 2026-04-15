import type {
  ActivateInviteInput,
  CreateInviteInput,
} from "../../domains/auth/auth.types.js";
import type {
  CreateVideoInput,
  UpdateVideoInput,
} from "../../domains/videos/videos.types.js";

/**
 * Builds a valid invite-creation payload with optional overrides.
 *
 * @param overrides Field overrides for the default fixture.
 * @returns A request body accepted by `createInviteSchema`.
 */
export function makeCreateInviteInput(
  overrides: Partial<CreateInviteInput> = {},
): CreateInviteInput {
  return {
    email: "invitee@example.com",
    role: "CAREGIVER",
    siteId: "11111111-1111-1111-8111-111111111111",
    ...overrides,
  };
}

/**
 * Builds a valid invite-activation payload with optional overrides.
 *
 * @param overrides Field overrides for the default fixture.
 * @returns A request body accepted by `activateInviteSchema`.
 */
export function makeActivateInviteInput(
  overrides: Partial<ActivateInviteInput> = {},
): ActivateInviteInput {
  return {
    token: "invite-token",
    name: "Test User",
    email: "invitee@example.com",
    password: "securepassword123",
    ...overrides,
  };
}

/**
 * Builds a valid video-creation payload with optional overrides.
 *
 * @param overrides Field overrides for the default fixture.
 * @returns A request body accepted by `createVideoSchema`.
 */
export function makeCreateVideoInput(
  overrides: Partial<CreateVideoInput> = {},
): CreateVideoInput {
  return {
    videoTitle: "Test video title",
    videoDescription: "Test video description",
    videoName: "test-video.mp4",
    fileSize: 52428800,
    durationSeconds: 42,
    takenAt: "2026-01-01T12:00:00.000Z",
    contentType: "video/mp4",
    ...overrides,
  };
}

/**
 * Builds a valid video-update payload with optional overrides.
 *
 * @param overrides Field overrides for the default fixture.
 * @returns A request body accepted by `updateVideoSchema`.
 */
export function makeUpdateVideoInput(
  overrides: Partial<UpdateVideoInput> = {},
): UpdateVideoInput {
  return {
    status: "UPLOADED",
    durationSeconds: 42,
    takenAt: "2026-01-01T12:00:00.000Z",
    ...overrides,
  };
}

/**
 * Builds a representative video record for service and router tests.
 *
 * @param overrides Field overrides for the default fixture.
 * @returns A plain object shaped like the Prisma video model.
 */
export function makeVideo(overrides: Record<string, unknown> = {}) {
  return {
    id: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
    patientId: "550e8400-e29b-41d4-a716-446655440000",
    uploadedByUserId: "user-123",
    s3Key: "6ba7b810-9dad-41d1-80b4-00c04fd430c8/test-video.mp4",
    s3UploadId: null,
    status: "UPLOADED",
    fileSize: 52428800,
    totalParts: 5,
    durationSeconds: 42,
    createdAt: new Date("2026-01-01T12:00:00.000Z"),
    takenAt: new Date("2026-01-01T12:05:00.000Z"),
    ...overrides,
  };
}

/**
 * Builds a representative invitation record for auth tests.
 *
 * @param overrides Field overrides for the default fixture.
 * @returns A plain object shaped like the Prisma invitation model.
 */
export function makeInvitation(overrides: Record<string, unknown> = {}) {
  return {
    id: "33333333-3333-3333-3333-333333333333",
    email: "invitee@example.com",
    role: "CAREGIVER",
    siteId: "11111111-1111-1111-8111-111111111111",
    tokenHash: "hashed-token",
    expiresAt: new Date("2026-01-02T12:00:00.000Z"),
    usedAt: null,
    createdBy: "system",
    createdAt: new Date("2026-01-01T12:00:00.000Z"),
    ...overrides,
  };
}

/**
 * Builds a representative user record for auth tests.
 *
 * @param overrides Field overrides for the default fixture.
 * @returns A plain object shaped like the Prisma user model.
 */
export function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-123",
    name: "Test User",
    email: "invitee@example.com",
    emailVerified: false,
    createdAt: new Date("2026-01-01T12:00:00.000Z"),
    updatedAt: new Date("2026-01-01T12:00:00.000Z"),
    ...overrides,
  };
}
