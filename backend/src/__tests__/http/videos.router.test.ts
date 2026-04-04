import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client.js";
import { createTestApp } from "../helpers/test-app.js";
import {
  makeCreateVideoInput,
  makeUpdateVideoInput,
  makeVideo,
} from "../helpers/fixtures.js";

const { videosServiceMock } = vi.hoisted(() => ({
  videosServiceMock: {
    listVideos: vi.fn(),
    getVideoById: vi.fn(),
    createVideo: vi.fn(),
    updateVideo: vi.fn(),
    deleteVideo: vi.fn(),
  },
}));

vi.mock("../../domains/videos/videos.service.js", () => videosServiceMock);

import videosRouter from "../../domains/videos/videos.router.js";

describe("videos.router", () => {
  const app = createTestApp("/domain/videos", videosRouter);

  beforeEach(() => {
    vi.resetAllMocks();
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
        createdAt: video.createdAt.toISOString(),
        takenAt: video.takenAt?.toISOString(),
      })),
    });
    expect(videosServiceMock.listVideos).toHaveBeenCalledWith({
      limit: 5,
      offset: 10,
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
      limit: 20,
      offset: 0,
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
      limit: 20,
      offset: 0,
    });
  });

  // ========= GET /domain/videos/:id =========

  it("GET /domain/videos/:id returns a single video when the service finds one", async () => {
    // Input: GET /domain/videos/:id for an ID the service can find.
    // Expected: the route passes the path ID to the service and returns the
    // video with status 200.
    const video = makeVideo();

    videosServiceMock.getVideoById.mockResolvedValue(video);

    const response = await request(app).get(`/domain/videos/${video.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ...video,
      createdAt: video.createdAt.toISOString(),
      takenAt: video.takenAt?.toISOString(),
    });
    expect(videosServiceMock.getVideoById).toHaveBeenCalledWith(video.id);
  });

  it("GET /domain/videos/:id returns 404 when the service returns null", async () => {
    // Input: GET /domain/videos/:id for an ID the service returns as null.
    // Expected: the route returns status 404 with message "Video not found".
    videosServiceMock.getVideoById.mockResolvedValue(null);

    const response = await request(app).get(
      "/domain/videos/99999999-9999-9999-9999-999999999999",
    );

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      status: "error",
      statusCode: 404,
      message: "Video not found",
    });
  });

  // ========= POST /domain/videos =========

  it("POST /domain/videos validates the body and forwards parsed data to the service", async () => {
    // Input: POST /domain/videos with a valid create payload.
    // Expected: the route adds the placeholder uploadedByUserId, calls the
    // service with the final payload, and returns status 201 with the created
    // video.
    const input = makeCreateVideoInput();
    const createdVideo = makeVideo({ status: "UPLOADING" });

    videosServiceMock.createVideo.mockResolvedValue(createdVideo);

    const response = await request(app).post("/domain/videos").send(input);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      ...createdVideo,
      createdAt: createdVideo.createdAt.toISOString(),
      takenAt: createdVideo.takenAt?.toISOString(),
    });
    expect(videosServiceMock.createVideo).toHaveBeenCalledWith({
      ...input,
      uploadedByUserId: "00000000-0000-0000-0000-000000000000",
    });
  });

  it("POST /domain/videos rejects invalid payloads before the service is called", async () => {
    // Input: POST /domain/videos with an invalid patientId and negative
    // durationSeconds.
    // Expected: the route returns status 400 and does not call the create
    // service.
    const response = await request(app).post("/domain/videos").send({
      patientId: "not-a-uuid",
      durationSeconds: -1,
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: "error",
      statusCode: 400,
      message: "Validation failed",
    });
    expect(videosServiceMock.createVideo).not.toHaveBeenCalled();
  });

  // ========= PUT /domain/videos/:id =========

  it("PUT /domain/videos/:id validates the body and forwards the id plus patch to the service", async () => {
    // Input: PUT /domain/videos/:id with a valid update payload.
    // Expected: the route passes the path ID plus parsed patch to the service
    // and returns the updated video.
    const id = "22222222-2222-2222-2222-222222222222";
    const patch = makeUpdateVideoInput({ status: "PROCESSING" });
    const updatedVideo = makeVideo({ id, status: "PROCESSING" });

    videosServiceMock.updateVideo.mockResolvedValue(updatedVideo);

    const response = await request(app).put(`/domain/videos/${id}`).send(patch);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ...updatedVideo,
      createdAt: updatedVideo.createdAt.toISOString(),
      takenAt: updatedVideo.takenAt?.toISOString(),
    });
    expect(videosServiceMock.updateVideo).toHaveBeenCalledWith(id, patch);
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
      message: "Validation failed",
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
      .send({ status: "READY" });

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
    expect(videosServiceMock.deleteVideo).toHaveBeenCalledWith(id);
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
