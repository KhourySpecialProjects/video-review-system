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

  // ========= listVideos =========

  it("lists videos with pagination and total count", async () => {
    // Input: listVideos(...) is called with limit 5 and offset 10.
    // Expected: Prisma receives the same pagination values, the total count is
    // queried separately, and the service returns both values together.
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

  // ========= getVideoById =========

  it("gets a video by id", async () => {
    // Input: getVideoById(...) receives a video ID.
    // Expected: Prisma is queried with that ID and the same video object is
    // returned from the service.
    const video = makeVideo();

    prismaMock.video.findUnique.mockResolvedValue(video);

    await expect(getVideoById(video.id)).resolves.toEqual(video);
    expect(prismaMock.video.findUnique).toHaveBeenCalledWith({
      where: { id: video.id },
    });
  });

  // ========= createVideo =========

  it("creates a video with normalized Prisma data", async () => {
    // Input: createVideo(...) receives string dates and uploader metadata.
    // Expected: status becomes "UPLOADING", date strings become Date objects,
    // and Prisma receives the shaped payload.
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

  it("creates a video with null metadata when optional fields are omitted", async () => {
    // Input: createVideo(...) receives only the required patient/uploader data.
    // Expected: Prisma stores null for the optional duration and timestamp
    // fields.
    const input = {
      patientId: "550e8400-e29b-41d4-a716-446655440000",
      uploadedByUserId: "user-123",
    } as Parameters<typeof createVideo>[0];
    const createdVideo = makeVideo({
      status: "UPLOADING",
      durationSeconds: null,
      takenAt: null,
      createdAt: null,
    });

    prismaMock.video.create.mockResolvedValue(createdVideo);

    await expect(createVideo(input)).resolves.toEqual(createdVideo);
    expect(prismaMock.video.create).toHaveBeenCalledWith({
      data: {
        patientId: input.patientId,
        uploadedByUserId: "user-123",
        status: "UPLOADING",
        durationSeconds: null,
        createdAt: null,
        takenAt: null,
      },
    });
  });

  // ========= updateVideo =========

  it("updates a video by id", async () => {
    // Input: updateVideo(...) receives a video ID and a status patch.
    // Expected: Prisma.update(...) receives the same ID and the same patch
    // object.
    const input = makeUpdateVideoInput({ status: "PROCESSING" });
    const updatedVideo = makeVideo({ status: "PROCESSING" });

    prismaMock.video.update.mockResolvedValue(updatedVideo);

    await expect(updateVideo(updatedVideo.id, input)).resolves.toEqual(updatedVideo);
    expect(prismaMock.video.update).toHaveBeenCalledWith({
      where: { id: updatedVideo.id },
      data: input,
    });
  });

  // ========= deleteVideo =========

  it("deletes a video by id", async () => {
    // Input: deleteVideo(...) receives a video ID.
    // Expected: Prisma.delete(...) is called with that ID and the service
    // returns without extra behavior.
    const id = "55555555-5555-5555-5555-555555555555";

    prismaMock.video.delete.mockResolvedValue(undefined);

    await expect(deleteVideo(id)).resolves.toBeUndefined();
    expect(prismaMock.video.delete).toHaveBeenCalledWith({
      where: { id },
    });
  });
});
