import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client.js";

/**
 * Custom application error with HTTP status code.
 * Throw these from routes and services — the global errorHandler will format the response.
 *
 * @example
 * // Throw directly with status code
 * throw new AppError("Video not found", 404);
 *
 * // Or use factory methods
 * throw AppError.notFound("Video not found");
 * throw AppError.badRequest("Invalid input");
 */
export class AppError extends Error {
  /** The HTTP status code to return in the response. */
  public readonly statusCode: number;

  /** Whether this is an expected operational error (true) or a programmer error (false). */
  public readonly isOperational: boolean;

  /**
   * Creates a new AppError.
   *
   * @param message - Human-readable error message returned to the client.
   * @param statusCode - HTTP status code (e.g. 400, 404, 500).
   * @param isOperational - Set to false for unexpected programmer errors. Defaults to true.
   */
  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Creates a 400 Bad Request error.
   *
   * @param message - Error message. Defaults to "Bad request".
   * @returns A new AppError with statusCode 400.
   */
  static badRequest(message = "Bad request") {
    return new AppError(message, 400);
  }

  /**
   * Creates a 401 Unauthorized error.
   *
   * @param message - Error message. Defaults to "Unauthorized".
   * @returns A new AppError with statusCode 401.
   */
  static unauthorized(message = "Unauthorized") {
    return new AppError(message, 401);
  }

  /**
   * Creates a 403 Forbidden error.
   *
   * @param message - Error message. Defaults to "Forbidden".
   * @returns A new AppError with statusCode 403.
   */
  static forbidden(message = "Forbidden") {
    return new AppError(message, 403);
  }

  /**
   * Creates a 404 Not Found error.
   *
   * @param message - Error message. Defaults to "Not found".
   * @returns A new AppError with statusCode 404.
   */
  static notFound(message = "Not found") {
    return new AppError(message, 404);
  }

  /**
   * Creates a 409 Conflict error.
   *
   * @param message - Error message. Defaults to "Conflict".
   * @returns A new AppError with statusCode 409.
   */
  static conflict(message = "Conflict") {
    return new AppError(message, 409);
  }
}

/**
 * Catch-all handler for unmatched routes.
 * Register this middleware after all route handlers but before the errorHandler.
 *
 * @param req - Express request object.
 * @param res - Express response object.
 * @param next - Express next function — forwards a 404 AppError to errorHandler.
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  next(AppError.notFound("Route not found"));
}

/**
 * Maps Prisma known error codes to HTTP status codes and client-safe messages.
 *
 * @param err - A PrismaClientKnownRequestError with a Prisma error code.
 * @returns An object with the appropriate HTTP statusCode and message.
 *
 * @see https://www.prisma.io/docs/orm/reference/error-reference
 */
function mapPrismaError(err: PrismaClientKnownRequestError): { statusCode: number; message: string } {
  switch (err.code) {
    case "P2025":
      return { statusCode: 404, message: "Resource not found" };
    case "P2002":
      return { statusCode: 409, message: "Resource already exists" };
    default:
      return { statusCode: 500, message: "Internal server error" };
  }
}

/**
 * Global error-handling middleware for Express 5.
 * Catches all errors thrown or rejected in route handlers and formats a consistent JSON response.
 *
 * Handles the following error types (in order):
 * 1. **AppError** — uses its statusCode and message directly.
 * 2. **ZodError** — returns 400 with formatted validation issue details.
 * 3. **PrismaClientKnownRequestError** — maps Prisma error codes to HTTP statuses.
 * 4. **SyntaxError (malformed JSON)** — returns 400 "Invalid JSON".
 * 5. **Unknown errors** — returns 500 without leaking internal details.
 *
 * In non-production environments, the error stack trace is included in the response.
 *
 * @param err - The error thrown or passed via next(err).
 * @param req - Express request object.
 * @param res - Express response object.
 * @param next - Express next function (required by Express error middleware signature).
 *
 * @example
 * // Register in index.ts after all routes:
 * app.use(notFoundHandler);
 * app.use(errorHandler);
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // AppError — use its status code and message directly
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: "error",
      statusCode: err.statusCode,
      message: err.message,
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
    return;
  }

  // ZodError — validation failure
  if (err instanceof ZodError) {
    res.status(400).json({
      status: "error",
      statusCode: 400,
      message: "Validation failed",
      errors: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
    return;
  }

  // Prisma known request error
  if (err instanceof PrismaClientKnownRequestError) {
    const { statusCode, message } = mapPrismaError(err);
    if (statusCode >= 500) {
      console.error("Prisma error:", err);
    }
    res.status(statusCode).json({
      status: "error",
      statusCode,
      message,
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
    return;
  }

  // Malformed JSON from express.json()
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({
      status: "error",
      statusCode: 400,
      message: "Invalid JSON",
    });
    return;
  }

  // Unknown error — never leak internals
  console.error("Unhandled error:", err);
  res.status(500).json({
    status: "error",
    statusCode: 500,
    message: "Internal server error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}
