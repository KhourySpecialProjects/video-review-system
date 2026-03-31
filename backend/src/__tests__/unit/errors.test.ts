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
  it("creates factory errors with the expected status codes", () => {
    // Verifies each convenience factory returns the right HTTP semantics so
    // routes and services can rely on these shortcuts without custom wiring.
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
  it("forwards a 404 AppError to the next middleware", () => {
    // Confirms unmatched routes are converted into the shared AppError shape
    // instead of writing a one-off response directly.
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
  it("formats AppError responses", () => {
    // Tests the operational-error path where the application already knows the
    // intended status code and safe client-facing message.
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
    // Validates that schema failures are converted into the standardized
    // validation payload the frontend can consume field-by-field.
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
    // Ensures low-level Prisma "record missing" errors are translated into an
    // API-level 404 instead of leaking ORM-specific details to clients.
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
    // Covers the body-parser failure case so invalid JSON gets a predictable
    // client error rather than falling through as a generic server failure.
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
    // Checks the fallback Prisma branch where the code is not explicitly mapped.
    // The handler should log the problem and return a safe generic 500 payload.
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
    // Final safety net: unexpected runtime errors should be logged and exposed
    // as a generic internal error instead of leaking implementation details.
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
