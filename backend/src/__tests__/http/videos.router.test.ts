import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client.js";
import { createTestApp } from "../helpers/test-app.js";
import {
  makeCreateVideoInput,
  makeUpdateVideoInput,
  makeVideo,
} from "../helpers/fixtures.js";

const { authMock, authHelpersMock, videosServiceMock } = vi.hoisted(() => ({
  authMock: {
    auth: {
      api: {
        getSession: vi.fn(),
      },
    },
  },
  authHelpersMock: {
    buildVideoAccessFilter: vi.fn(),
  },
  videosServiceMock: {
    listVideos: vi.fn(),
    getVideoStreamUrl: vi.fn(),
    initiateVideoUpload: vi.fn(),
    getUploadStatus: vi.fn(),
    completeVideoUpload: vi.fn(),
    updateVideo: vi.fn(),
    deleteVideo: vi.fn(),
  },
}));

vi.mock("../../lib/auth.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/auth.js")>();

  return {
    ...actual,
    auth: authMock.auth,
    buildVideoAccessFilter: authHelpersMock.buildVideoAccessFilter,
  };
});

vi.mock("../../middleware/auth.js", () => ({
  requireSession: async (req: any, _res: any, next: any) => {
    const session = await authMock.auth.api.getSession();
    req.authSession = session;
    next();
  },
  requireInternalAuth: (_req: any, _res: any, next: any) => next(),
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock("../../domains/videos/videos.service.js", () => videosServiceMock);

import videosRouter from "../../domains/videos/videos.router.js";

describe("videos.router", () => {
  const app = createTestApp("/domain/videos", videosRouter);

  beforeEach(() => {
    vi.resetAllMocks();
    authMock.auth.api.getSession.mockResolvedValue({
      user: { id: "user-123", role: "CLINICAL_REVIEWER" },
    });
    authHelpersMock.buildVideoAccessFilter.mockResolvedValue({});
  });

  // ========= GET /domain/videos =========

  it("GET /domain/videos returns paginated results from the service", async () => {
    // Input: GET /domain/videos?limit=5&offset=10.
    // Expected: the route passes numeric limit/offset values to the service and
    // returns the service result with status 200.
    const payload = {
      videos: [makeVideo()],
      total: 1,
      limit: 5,
      offset: 10,
    };

    videosServiceMock.listVideos.mockResolvedValue(payload);

    const response = await request(app)
      .get("/domain/videos")
      .query({ limit: "5", offset: "10" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ...payload,
      videos: payload.videos.map((video) => ({
        ...video,
        fileSize: video.fileSize,
        createdAt: video.createdAt.toISOString(),
        takenAt: video.takenAt?.toISOString(),
      })),
    });
    expect(videosServiceMock.listVideos).toHaveBeenCalledWith({
      userId: "user-123",
      limit: 5,
      offset: 10,
      accessFilter: {},
    });
  });

  it("GET /domain/videos uses default pagination when query params are omitted", async () => {
    // Input: GET /domain/videos without limit or offset.
    // Expected: the route passes the default values 20 and 0 to the service.
    const payload = {
      videos: [],
      total: 0,
      limit: 20,
      offset: 0,
    };

    videosServiceMock.listVideos.mockResolvedValue(payload);

    const response = await request(app).get("/domain/videos");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(payload);
    expect(videosServiceMock.listVideos).toHaveBeenCalledWith({
      userId: "user-123",
      limit: 20,
      offset: 0,
      accessFilter: {},
    });
  });

  it("GET /domain/videos falls back to safe defaults for invalid query params", async () => {
    // Input: GET /domain/videos?limit=abc&offset=-5.
    // Expected: invalid pagination values are replaced with the route defaults.
    const payload = {
      videos: [],
      total: 0,
      limit: 20,
      offset: 0,
    };

    videosServiceMock.listVideos.mockResolvedValue(payload);

    const response = await request(app)
      .get("/domain/videos")
      .query({ limit: "abc", offset: "-5" });

    expect(response.status).toBe(200);
    expect(videosServiceMock.listVideos).toHaveBeenCalledWith({
      userId: "user-123",
      limit: 20,
      offset: 0,
      accessFilter: {},
    });
  });

  // ========= POST /domain/videos/upload =========

  it("POST /domain/videos/upload validates the body and forwards parsed data to the service", async () => {
    // Input: POST /domain/videos/upload with a valid create payload.
    // Expected: the route adds the authenticated uploadedByUserId, calls the
    // service with the final payload, and returns status 201.
    const input = makeCreateVideoInput();
    const uploadResult = {
      video: makeVideo({ status: "UPLOADING", s3UploadId: "upload-123" }),
      parts: [{ partNumber: 1, url: "https://s3.example.com/part1" }],
      partSize: 10485760,
      totalParts: 5,
      expiresIn: 3600,
    };

    videosServiceMock.initiateVideoUpload.mockResolvedValue(uploadResult);

    const response = await request(app).post("/domain/videos/upload").send(input);

    expect(response.status).toBe(201);
    expect(videosServiceMock.initiateVideoUpload).toHaveBeenCalledWith({
      ...input,
      uploadedByUserId: "user-123",
    }, expect.objectContaining({
      actorUserId: "user-123",
    }));
  });

  it("POST /domain/videos/upload rejects invalid payloads before the service is called", async () => {
    // Input: POST /domain/videos/upload with a missing title and negative
    // durationSeconds.
    // Expected: the route returns status 400 and does not call the service.
    const response = await request(app).post("/domain/videos/upload").send({
      videoTitle: "",
      videoName: "test-video.mp4",
      fileSize: 52428800,
      durationSeconds: -1,
      takenAt: "2026-01-01T12:00:00.000Z",
      contentType: "video/mp4",
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: "error",
      statusCode: 400,
    });
    expect(videosServiceMock.initiateVideoUpload).not.toHaveBeenCalled();
  });

  // ========= POST /domain/videos/:id/complete-upload =========

  it("POST /domain/videos/:id/complete-upload finalizes the upload", async () => {
    // Input: POST /domain/videos/:id/complete-upload with part ETags.
    // Expected: the route calls completeVideoUpload and returns the updated video.
    const id = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";
    const parts = [
      { partNumber: 1, etag: '"abc123"' },
      { partNumber: 2, etag: '"def456"' },
    ];
    const completedVideo = makeVideo({ id, status: "UPLOADED" });

    videosServiceMock.completeVideoUpload.mockResolvedValue(completedVideo);

    const response = await request(app)
      .post(`/domain/videos/${id}/complete-upload`)
      .send({ parts });

    expect(response.status).toBe(200);
    expect(videosServiceMock.completeVideoUpload).toHaveBeenCalledWith(
      id,
      { parts },
      expect.objectContaining({
        actorUserId: "user-123",
      }),
    );
  });

  it("POST /domain/videos/:id/complete-upload rejects empty parts via error middleware", async () => {
    // Input: POST with empty parts array.
    // Expected: Zod throws, error middleware returns 400 with "Validation failed".
    const response = await request(app)
      .post("/domain/videos/6ba7b810-9dad-41d1-80b4-00c04fd430c8/complete-upload")
      .send({ parts: [] });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: "error",
      statusCode: 400,
      message: "Validation failed",
    });
    expect(videosServiceMock.completeVideoUpload).not.toHaveBeenCalled();
  });

  // ========= PUT /domain/videos/:id =========

  it("PUT /domain/videos/:id validates the body and forwards the id plus patch to the service", async () => {
    // Input: PUT /domain/videos/:id with a valid update payload.
    // Expected: the route passes the path ID plus parsed patch to the service
    // and returns the updated video.
    const id = "22222222-2222-2222-2222-222222222222";
    const patch = makeUpdateVideoInput({ status: "UPLOADED" });
    const updatedVideo = makeVideo({ id, status: "UPLOADED" });

    videosServiceMock.updateVideo.mockResolvedValue(updatedVideo);

    const response = await request(app).put(`/domain/videos/${id}`).send(patch);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ...updatedVideo,
      fileSize: updatedVideo.fileSize,
      createdAt: updatedVideo.createdAt.toISOString(),
      takenAt: updatedVideo.takenAt?.toISOString(),
    });
    expect(videosServiceMock.updateVideo).toHaveBeenCalledWith(
      id,
      patch,
      expect.objectContaining({
        actorUserId: "user-123",
      }),
    );
  });

  it("PUT /domain/videos/:id rejects invalid payloads before the service is called", async () => {
    // Input: PUT /domain/videos/:id with invalid status "BROKEN".
    // Expected: the route returns status 400 and does not call the update
    // service.
    const response = await request(app)
      .put("/domain/videos/22222222-2222-2222-2222-222222222222")
      .send({ status: "BROKEN" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: "error",
      statusCode: 400,
    });
    expect(videosServiceMock.updateVideo).not.toHaveBeenCalled();
  });

  it("PUT /domain/videos/:id returns 404 when the service surfaces a Prisma not-found error", async () => {
    // Input: PUT /domain/videos/:id when Prisma reports P2025.
    // Expected: the shared error handler converts the error into a 404
    // response.
    videosServiceMock.updateVideo.mockRejectedValue(
      new PrismaClientKnownRequestError("missing", {
        code: "P2025",
        clientVersion: "test",
      }),
    );

    const response = await request(app)
      .put("/domain/videos/22222222-2222-2222-2222-222222222222")
      .send({ status: "UPLOADED" });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      status: "error",
      statusCode: 404,
      message: "Resource not found",
    });
  });

  // ========= DELETE /domain/videos/:id =========

  it("DELETE /domain/videos/:id returns 204 after delegating to the service", async () => {
    // Input: DELETE /domain/videos/:id for an existing video ID.
    // Expected: the route calls the delete service with that ID and returns an
    // empty 204 response.
    const id = "22222222-2222-2222-2222-222222222222";

    videosServiceMock.deleteVideo.mockResolvedValue(undefined);

    const response = await request(app).delete(`/domain/videos/${id}`);

    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(videosServiceMock.deleteVideo).toHaveBeenCalledWith(
      id,
      expect.objectContaining({
        actorUserId: "user-123",
      }),
    );
  });

  it("DELETE /domain/videos/:id returns 404 when the service surfaces a Prisma not-found error", async () => {
    // Input: DELETE /domain/videos/:id when Prisma reports P2025.
    // Expected: the shared error handler converts the error into a 404
    // response.
    videosServiceMock.deleteVideo.mockRejectedValue(
      new PrismaClientKnownRequestError("missing", {
        code: "P2025",
        clientVersion: "test",
      }),
    );

    const response = await request(app).delete(
      "/domain/videos/22222222-2222-2222-2222-222222222222",
    );

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      status: "error",
      statusCode: 404,
      message: "Resource not found",
    });
  });
});
