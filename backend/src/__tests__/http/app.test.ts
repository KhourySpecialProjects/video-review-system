import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fileURLToPath } from "url";

const appMocks = vi.hoisted(() => {
  const betterAuthHandler = vi.fn((req, res) => {
    res.status(200).json({ route: "better-auth" });
  });
  const toNodeHandler = vi.fn(() => betterAuthHandler);

  return {
    auth: { tag: "auth" },
    betterAuthHandler,
    toNodeHandler,
  };
});

vi.mock("dotenv", () => ({
  default: {
    config: vi.fn(),
  },
}));

vi.mock("better-auth/node", () => ({
  toNodeHandler: appMocks.toNodeHandler,
}));

vi.mock("../../lib/auth.js", () => ({
  auth: appMocks.auth,
}));

vi.mock("../../domains/videos/videos.router.ts", () => ({
  default: (req: any, res: any, next: any) => {
    if (req.method === "GET" && req.path === "/") {
      res.json({ route: "videos" });
      return;
    }

    next();
  },
}));

vi.mock("../../domains/auth/auth.router.ts", () => ({
  default: (req: any, res: any, next: any) => {
    if (req.method === "GET" && req.path === "/mounted") {
      res.json({ route: "auth" });
      return;
    }

    next();
  },
}));

describe("app wiring", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    process.env.ALLOWED_ORIGIN = "http://localhost:5173";

    appMocks.toNodeHandler.mockReturnValue(appMocks.betterAuthHandler);
    appMocks.betterAuthHandler.mockImplementation((req, res) => {
      res.status(200).json({ route: "better-auth" });
    });
  });

  // ========= GET /health =========

  it("GET /health returns the health payload", async () => {
    // Input: GET /health.
    // Expected: the app returns status 200 with body { status: "ok" }.
    const { createApp } = await import("../../index.ts");
    const app = createApp();

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("GET /health includes the configured CORS origin", async () => {
    // Input: GET /health with Origin "http://localhost:5173".
    // Expected: the response includes access-control-allow-origin with the same
    // configured origin value.
    const { createApp } = await import("../../index.ts");
    const app = createApp();

    const response = await request(app)
      .get("/health")
      .set("Origin", "http://localhost:5173");

    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
  });

  // ========= Mounted Domain Routers =========

  it("mounts the videos router at /domain/videos", async () => {
    // Input: GET /domain/videos.
    // Expected: the request reaches the mounted videos router.
    const { createApp } = await import("../../index.ts");
    const app = createApp();

    const response = await request(app).get("/domain/videos");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: "videos" });
  });

  it("mounts the auth router at /domain/auth", async () => {
    // Input: GET /domain/auth/mounted.
    // Expected: the request reaches the mounted auth router.
    const { createApp } = await import("../../index.ts");
    const app = createApp();

    const response = await request(app).get("/domain/auth/mounted");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: "auth" });
  });

  // ========= Better Auth Mount =========

  it("mounts Better Auth at /api/auth/*", async () => {
    // Input: GET /api/auth/session.
    // Expected: createApp() wires toNodeHandler(auth) at /api/auth/* and the
    // request reaches the Better Auth handler.
    const { createApp } = await import("../../index.ts");
    const app = createApp();

    const response = await request(app).get("/api/auth/session");

    expect(appMocks.toNodeHandler).toHaveBeenCalledWith(appMocks.auth);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: "better-auth" });
  });

  it("startServer listens on the provided port and logs it", async () => {
    // Input: startServer(4321) is called.
    // Expected: the shared app instance starts listening on port 4321 and logs
    // the chosen port.
    const { app, startServer } = await import("../../index.ts");
    const server = { close: vi.fn() };
    const listenSpy = vi
      .spyOn(app, "listen")
      .mockImplementation(((port, callback) => {
        callback?.();
        return server as never;
      }) as typeof app.listen);
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(startServer(4321)).toBe(server);
    expect(listenSpy).toHaveBeenCalledWith(4321, expect.any(Function));
    expect(consoleLogSpy).toHaveBeenCalledWith("Listening on port 4321");
  });

  it("starts the server automatically when the module is executed directly", async () => {
    // Input: index.ts is imported fresh with process.argv[1] pointing at the
    // module path.
    // Expected: the direct-run guard calls startServer using the configured
    // PORT value.
    const originalArgv1 = process.argv[1];
    const originalPort = process.env.PORT;
    const modulePath = fileURLToPath(new URL("../../index.ts", import.meta.url));
    const server = { close: vi.fn() };
    const listenSpy = vi
      .spyOn(express.application, "listen")
      .mockImplementation(((port, callback) => {
        callback?.();
        return server as never;
      }) as typeof express.application.listen);
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    process.argv[1] = modulePath;
    process.env.PORT = "4322";

    try {
      await import("../../index.ts");

      expect(listenSpy).toHaveBeenCalledWith("4322", expect.any(Function));
      expect(consoleLogSpy).toHaveBeenCalledWith("Listening on port 4322");
    } finally {
      process.argv[1] = originalArgv1;
      process.env.PORT = originalPort;
    }
  });

  // ========= Shared Error Handling =========

  it("returns 404 for unmatched routes", async () => {
    // Input: GET /missing-route.
    // Expected: the request falls through to notFoundHandler and returns status
    // 404 with message "Route not found".
    const { createApp } = await import("../../index.ts");
    const app = createApp();

    const response = await request(app).get("/missing-route");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      status: "error",
      statusCode: 404,
      message: "Route not found",
    });
  });

  it("returns 400 for malformed JSON before route handling", async () => {
    // Input: POST /domain/videos with malformed JSON body "{bad-json}".
    // Expected: express.json() and the shared error handler return status 400
    // with message "Invalid JSON".
    const { createApp } = await import("../../index.ts");
    const app = createApp();

    const response = await request(app)
      .post("/domain/videos")
      .set("Content-Type", "application/json")
      .send("{bad-json}");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      status: "error",
      statusCode: 400,
      message: "Invalid JSON",
    });
  });
});
