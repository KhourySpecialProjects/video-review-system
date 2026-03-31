import { describe, expect, it, vi } from "vitest";
import { z, ZodError } from "zod";
import type { NextFunction, Request, Response } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client.js";
import {
  AppError,
  errorHandler,
  notFoundHandler,
} from "../../middleware/errors.js";

/**
 * Creates a minimal Express response double for error middleware tests.
 *
 * @returns An object exposing the mocked response methods and captured payload.
 */
function createMockResponse() {
  const responseState = {
    statusCode: 200,
    body: undefined as unknown,
  };

  const res = {
    status: vi.fn((statusCode: number) => {
      responseState.statusCode = statusCode;
      return res;
    }),
    json: vi.fn((body: unknown) => {
      responseState.body = body;
      return res;
    }),
  };

  return {
    res: res as unknown as Response,
    responseState,
  };
}

describe("AppError", () => {
  // ========= AppError Factories =========

  it("creates factory errors with the expected status codes", () => {
    // Input: AppError helper methods are called with default and custom
    // messages.
    // Expected: each helper returns an AppError with the matching message and
    // HTTP status code.
    expect(AppError.badRequest("bad input")).toMatchObject({
      message: "bad input",
      statusCode: 400,
      isOperational: true,
    });

    expect(AppError.unauthorized()).toMatchObject({
      message: "Unauthorized",
      statusCode: 401,
    });

    expect(AppError.forbidden()).toMatchObject({
      message: "Forbidden",
      statusCode: 403,
    });

    expect(AppError.notFound("missing")).toMatchObject({
      message: "missing",
      statusCode: 404,
    });

    expect(AppError.conflict()).toMatchObject({
      message: "Conflict",
      statusCode: 409,
    });
  });
});

describe("notFoundHandler", () => {
  // ========= notFoundHandler =========

  it("forwards a 404 AppError to the next middleware", () => {
    // Input: request falls through with no matching route.
    // Expected: next(...) receives a 404 AppError instead of the middleware
    // sending a response directly.
    const next = vi.fn() as NextFunction;

    notFoundHandler({} as Request, {} as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Route not found",
        statusCode: 404,
      }),
    );
  });
});

describe("errorHandler", () => {
  // ========= errorHandler =========

  it("formats AppError responses", () => {
    // Input: the middleware receives AppError.badRequest("Bad payload").
    // Expected: response status is 400 and the JSON body keeps the same error
    // message.
    const { res, responseState } = createMockResponse();
    const next = vi.fn() as NextFunction;
    const err = AppError.badRequest("Bad payload");

    errorHandler(err, {} as Request, res, next);

    expect(responseState.statusCode).toBe(400);
    expect(responseState.body).toMatchObject({
      status: "error",
      statusCode: 400,
      message: "Bad payload",
    });
  });

  it("formats Zod validation errors", () => {
    // Input: a Zod schema rejects the request payload.
    // Expected: response status is 400, message is "Validation failed", and
    // the JSON body includes field-level validation errors.
    const { res, responseState } = createMockResponse();
    const next = vi.fn() as NextFunction;

    const result = z
      .object({ email: z.string().email() })
      .safeParse({ email: "not-an-email" });

    expect(result.success).toBe(false);

    errorHandler((result as { error: ZodError }).error, {} as Request, res, next);

    expect(responseState.statusCode).toBe(400);
    expect(responseState.body).toMatchObject({
      status: "error",
      statusCode: 400,
      message: "Validation failed",
    });
    expect((responseState.body as { errors: Array<{ path: string; message: string }> }).errors).toEqual([
      expect.objectContaining({
        path: "email",
      }),
    ]);
  });

  it("maps Prisma not-found errors to 404 responses", () => {
    // Input: Prisma throws error code P2025 for a missing record.
    // Expected: response status is 404 and the client sees
    // "Resource not found".
    const { res, responseState } = createMockResponse();
    const next = vi.fn() as NextFunction;
    const err = new PrismaClientKnownRequestError("missing", {
      code: "P2025",
      clientVersion: "test",
    });

    errorHandler(err, {} as Request, res, next);

    expect(responseState.statusCode).toBe(404);
    expect(responseState.body).toMatchObject({
      status: "error",
      statusCode: 404,
      message: "Resource not found",
    });
  });

  it("maps malformed JSON to a 400 response", () => {
    // Input: express.json() reports malformed JSON in the request body.
    // Expected: response status is 400 and message is "Invalid JSON".
    const { res, responseState } = createMockResponse();
    const next = vi.fn() as NextFunction;
    const err = new SyntaxError("Unexpected token") as SyntaxError & {
      body: string;
    };

    err.body = "{bad-json}";

    errorHandler(err, {} as Request, res, next);

    expect(responseState.statusCode).toBe(400);
    expect(responseState.body).toEqual({
      status: "error",
      statusCode: 400,
      message: "Invalid JSON",
    });
  });

  it("maps unknown Prisma errors to 500 responses", () => {
    // Input: Prisma throws an error code that is not mapped to a client-safe
    // status.
    // Expected: the error is logged and the response becomes a generic 500
    // "Internal server error".
    const { res, responseState } = createMockResponse();
    const next = vi.fn() as NextFunction;
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const err = new PrismaClientKnownRequestError("unexpected", {
      code: "P9999",
      clientVersion: "test",
    });

    errorHandler(err, {} as Request, res, next);

    expect(consoleErrorSpy).toHaveBeenCalledWith("Prisma error:", err);
    expect(responseState.statusCode).toBe(500);
    expect(responseState.body).toMatchObject({
      status: "error",
      statusCode: 500,
      message: "Internal server error",
    });
  });

  it("maps unknown errors to 500 responses", () => {
    // Input: the middleware receives an unexpected runtime error.
    // Expected: the error is logged and the client receives a generic 500
    // response without internal details.
    const { res, responseState } = createMockResponse();
    const next = vi.fn() as NextFunction;
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const err = new Error("boom");

    errorHandler(err, {} as Request, res, next);

    expect(consoleErrorSpy).toHaveBeenCalledWith("Unhandled error:", err);
    expect(responseState.statusCode).toBe(500);
    expect(responseState.body).toMatchObject({
      status: "error",
      statusCode: 500,
      message: "Internal server error",
    });
  });
});
