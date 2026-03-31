import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VideosPrismaMock } from "../helpers/prisma-mock.js";
import { resetVideosPrismaMock } from "../helpers/prisma-mock.js";
import {
  makeCreateVideoInput,
  makeUpdateVideoInput,
  makeVideo,
} from "../helpers/fixtures.js";

// The service module reads Prisma at import time, so the module mock must exist
// before `videos.service.ts` is evaluated.
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    video: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  } satisfies VideosPrismaMock,
}));

vi.mock("../../lib/prisma.js", () => ({
  default: prismaMock,
}));

import {
  createVideo,
  deleteVideo,
  getVideoById,
  listVideos,
  updateVideo,
} from "../../domains/videos/videos.service.js";

describe("videos.service", () => {
  beforeEach(() => {
    resetVideosPrismaMock(prismaMock);
  });

  it("lists videos with pagination and total count", async () => {
    // Verifies the service issues the two Prisma reads it promises:
    // paginated data plus the separate total-count query used by the API.
    const videos = [makeVideo(), makeVideo({ id: "44444444-4444-4444-4444-444444444444" })];

    prismaMock.video.findMany.mockResolvedValue(videos);
    prismaMock.video.count.mockResolvedValue(2);

    const result = await listVideos({ limit: 5, offset: 10 });

    expect(prismaMock.video.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      skip: 10,
      take: 5,
    });
    expect(prismaMock.video.count).toHaveBeenCalledWith();
    expect(result).toEqual({
      videos,
      total: 2,
      limit: 5,
      offset: 10,
    });
  });

  it("gets a video by id", async () => {
    // Confirms ID lookup is delegated to Prisma with the expected unique filter
    // and that the service returns Prisma's result unchanged.
    const video = makeVideo();

    prismaMock.video.findUnique.mockResolvedValue(video);

    await expect(getVideoById(video.id)).resolves.toEqual(video);
    expect(prismaMock.video.findUnique).toHaveBeenCalledWith({
      where: { id: video.id },
    });
  });

  it("creates a video with normalized Prisma data", async () => {
    // Covers the service-layer shaping logic: default upload status plus date
    // string conversion before the create call reaches Prisma.
    const input = {
      ...makeCreateVideoInput({
        durationSeconds: 90,
        takenAt: "2026-02-01T10:00:00.000Z",
      }),
      uploadedByUserId: "user-123",
      createdAt: "2026-02-01T09:00:00.000Z",
    } as Parameters<typeof createVideo>[0];
    const createdVideo = makeVideo({
      status: "UPLOADING",
      durationSeconds: 90,
    });

    prismaMock.video.create.mockResolvedValue(createdVideo);

    await expect(createVideo(input)).resolves.toEqual(createdVideo);
    expect(prismaMock.video.create).toHaveBeenCalledWith({
      data: {
        patientId: input.patientId,
        uploadedByUserId: "user-123",
        status: "UPLOADING",
        durationSeconds: 90,
        createdAt: new Date("2026-02-01T09:00:00.000Z"),
        takenAt: new Date("2026-02-01T10:00:00.000Z"),
      },
    });
  });

  it("updates a video by id", async () => {
    // Ensures update requests preserve the caller's validated patch object and
    // target the correct record by ID.
    const input = makeUpdateVideoInput({ status: "PROCESSING" });
    const updatedVideo = makeVideo({ status: "PROCESSING" });

    prismaMock.video.update.mockResolvedValue(updatedVideo);

    await expect(updateVideo(updatedVideo.id, input)).resolves.toEqual(updatedVideo);
    expect(prismaMock.video.update).toHaveBeenCalledWith({
      where: { id: updatedVideo.id },
      data: input,
    });
  });

  it("deletes a video by id", async () => {
    // Confirms the delete path uses the expected unique identifier and does not
    // add extra behavior beyond Prisma's delete operation.
    const id = "55555555-5555-5555-5555-555555555555";

    prismaMock.video.delete.mockResolvedValue(undefined);

    await expect(deleteVideo(id)).resolves.toBeUndefined();
    expect(prismaMock.video.delete).toHaveBeenCalledWith({
      where: { id },
    });
  });
});
