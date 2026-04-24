import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VideosPrismaMock } from "../helpers/prisma-mock.js";
import { resetVideosPrismaMock } from "../helpers/prisma-mock.js";
import {
  makeUpdateVideoInput,
  makeVideo,
} from "../helpers/fixtures.js";

// The service module reads Prisma at import time, so the module mock must exist
// before `videos.service.ts` is evaluated.
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    video: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    videoStudy: {
      findMany: vi.fn(),
    },
    caregiverVideoMetadata: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  } satisfies VideosPrismaMock,
}));

vi.mock("../../lib/prisma.js", () => ({
  default: prismaMock,
}));

// Mock the S3 functions so service tests don't need real AWS credentials
vi.mock("../../lib/s3.js", () => ({
  generatePresignedGetUrl: vi.fn().mockResolvedValue("https://s3.example.com/thumb.jpg"),
  generatePresignedPartUrls: vi.fn(),
  initiateMultipartUpload: vi.fn(),
  completeMultipartUpload: vi.fn(),
  listUploadedParts: vi.fn(),
  PART_SIZE: 10 * 1024 * 1024,
}));

import {
  deleteVideo,
  listVideos,
  resolveVideoAuditSiteId,
  updateVideo,
} from "../../domains/videos/videos.service.js";

describe("videos.service", () => {
  beforeEach(() => {
    resetVideosPrismaMock(prismaMock);
    prismaMock.$transaction.mockImplementation(
      async (callback: (client: typeof prismaMock) => Promise<unknown>) =>
        callback(prismaMock),
    );
  });

  // ========= listVideos =========

  it("lists videos with pagination and total count", async () => {
    // Input: listVideos(...) is called with limit 5 and offset 10.
    // Expected: Prisma receives the same pagination values, the total count is
    // queried separately, and the service returns both values together.
    const videos = [
      makeVideo({
        caregiverMetadata: [
          {
            privateTitle: "Private title 1",
            privateNotes: "Private notes 1",
          },
        ],
        uploadedBy: { name: "Uploader One" },
      }),
      makeVideo({
        id: "44444444-4444-4444-4444-444444444444",
        s3Key: "44444444-4444-4444-4444-444444444444/test-video-2.mp4",
        caregiverMetadata: [
          {
            privateTitle: "Private title 2",
            privateNotes: null,
          },
        ],
        uploadedBy: { name: "Uploader Two" },
      }),
    ];

    prismaMock.video.findMany.mockResolvedValue(videos);
    prismaMock.video.count.mockResolvedValue(2);

    const result = await listVideos({
      userId: "user-123",
      limit: 5,
      offset: 10,
      accessFilter: {},
    });

    expect(prismaMock.video.findMany).toHaveBeenCalledWith({
      where: { status: "UPLOADED" },
      orderBy: { createdAt: "desc" },
      skip: 10,
      take: 5,
      include: {
        caregiverMetadata: {
          where: { caregiverUserId: "user-123" },
          select: { privateTitle: true, privateNotes: true },
        },
        uploadedBy: { select: { name: true } },
      },
    });
    expect(prismaMock.video.count).toHaveBeenCalledWith({
      where: { status: "UPLOADED" },
    });
    expect(result).toEqual({
      videos: [
        {
          id: videos[0].id,
          title: "Private title 1",
          description: "Private notes 1",
          imageUrl: "https://s3.example.com/thumb.jpg",
          durationSeconds: videos[0].durationSeconds,
          status: videos[0].status,
          fileSize: Number(videos[0].fileSize),
          createdAt: videos[0].createdAt.toISOString(),
          takenAt: videos[0].takenAt?.toISOString() ?? null,
          uploadedBy: "Uploader One",
        },
        {
          id: videos[1].id,
          title: "Private title 2",
          description: "",
          imageUrl: "https://s3.example.com/thumb.jpg",
          durationSeconds: videos[1].durationSeconds,
          status: videos[1].status,
          fileSize: Number(videos[1].fileSize),
          createdAt: videos[1].createdAt.toISOString(),
          takenAt: videos[1].takenAt?.toISOString() ?? null,
          uploadedBy: "Uploader Two",
        },
      ],
      total: 2,
      limit: 5,
      offset: 10,
    });
  });

  // ========= updateVideo =========

  it("updates a video by id", async () => {
    // Input: updateVideo(...) receives a video ID and a status patch.
    // Expected: Prisma.update(...) receives the same ID and the same patch
    // object.
    const input = makeUpdateVideoInput({ status: "UPLOADED" });
    const updatedVideo = makeVideo({ status: "UPLOADED" });

    prismaMock.video.update.mockResolvedValue(updatedVideo);

    await expect(updateVideo(updatedVideo.id, input)).resolves.toEqual(updatedVideo);
    expect(prismaMock.video.update).toHaveBeenCalledWith({
      where: { id: updatedVideo.id },
      data: input,
    });
  });

  it("updates a video and writes only changed safe fields to audit", async () => {
    const id = "55555555-5555-5555-8555-555555555555";
    const beforeVideo = makeVideo({
      id,
      status: "UPLOADING",
      durationSeconds: 12,
      takenAt: new Date("2026-04-20T10:00:00.000Z"),
    });
    const updatedVideo = makeVideo({
      id,
      status: "UPLOADED",
      durationSeconds: 12,
      takenAt: new Date("2026-04-20T10:00:00.000Z"),
    });

    prismaMock.videoStudy.findMany.mockResolvedValue([
      { siteId: "22222222-2222-2222-8222-222222222222" },
    ]);
    prismaMock.video.findUnique.mockResolvedValue(beforeVideo);
    prismaMock.video.update.mockResolvedValue(updatedVideo);
    prismaMock.auditLog.create.mockResolvedValue({
      id: "audit-1",
    });

    await expect(
      updateVideo(
        id,
        { status: "UPLOADED" },
        {
          actorUserId: "actor-1",
          ipAddress: "203.0.113.10",
        },
      ),
    ).resolves.toEqual(updatedVideo);

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorUserId: "actor-1",
        actionType: "UPDATE",
        entityType: "VIDEO",
        entityId: id,
        siteId: "22222222-2222-2222-8222-222222222222",
        oldValues: {
          status: "UPLOADING",
        },
        newValues: {
          status: "UPLOADED",
        },
        ipAddress: "203.0.113.10",
      },
    });
  });

  it("returns null audit site when a video has no single site", async () => {
    prismaMock.videoStudy.findMany.mockResolvedValue([
      { siteId: "11111111-1111-1111-8111-111111111111" },
      { siteId: "22222222-2222-2222-8222-222222222222" },
    ]);

    await expect(
      resolveVideoAuditSiteId(
        prismaMock as any,
        "55555555-5555-5555-8555-555555555555",
      ),
    ).resolves.toBeNull();
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
