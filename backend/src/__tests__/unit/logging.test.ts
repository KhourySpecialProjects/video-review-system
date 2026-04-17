import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { EventEmitter } from "events";

vi.mock("../../lib/logger.js", async () => {
  const pino = await import("pino");
  return {
    logger: pino.default({ level: "silent" }),
  };
});

import { requestLogger } from "../../middleware/logging.js";

/**
 * Creates a minimal Express request double for logging middleware tests.
 *
 * @description Builds a mock request with configurable method and URL.
 * @param method - HTTP method. Defaults to "GET".
 * @param url - Request URL. Defaults to "/api/health".
 * @returns A mock Express request object.
 */
function createMockRequest(method = "GET", url = "/api/health"): Request {
  return { method, url, originalUrl: url, headers: {} } as unknown as Request;
}

/**
 * Creates a minimal Express response double that emits lifecycle events.
 *
 * @description Returns an EventEmitter-based response mock that supports
 * `statusCode`, `get()`, and the `finish` event used by pino-http.
 * @returns An object with the mock response and a helper to trigger finish.
 */
function createMockResponse() {
  const emitter = new EventEmitter();
  const res = Object.assign(emitter, {
    statusCode: 200,
    headersSent: false,
    get: vi.fn(() => undefined),
    getHeader: vi.fn(() => undefined),
    setHeader: vi.fn(),
    end: vi.fn(),
    writeHead: vi.fn(),
  });
  return res as unknown as Response;
}

describe("requestLogger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls next to pass control to the next middleware", () => {
    // Input: a request passes through the logging middleware.
    // Expected: next() is called so the request continues down the chain.
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();

    requestLogger(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("attaches a log property to the request object", () => {
    // Input: a request passes through pino-http middleware.
    // Expected: req.log is set to a pino logger instance for request-scoped logging.
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();

    requestLogger(req, res, next);

    expect(req).toHaveProperty("log");
    expect((req as unknown as { log: { info: unknown } }).log.info).toBeTypeOf("function");
  });
});
