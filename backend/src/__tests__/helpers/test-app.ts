import express, { type Router } from "express";
import { errorHandler, notFoundHandler } from "../../middleware/errors.js";

// Mirror the BigInt serialization from src/index.ts so router tests
// can serialize Prisma BigInt fields (e.g. fileSize) without crashing.
declare global {
  interface BigInt {
    toJSON(): number;
  }
}
BigInt.prototype.toJSON = function () {
  return Number(this);
};

/**
 * Creates a minimal Express app for router-level HTTP tests.
 *
 * The helper intentionally mirrors the production middleware order that matters
 * for these tests: JSON parsing, mounted router, 404 handling, then global
 * error formatting.
 *
 * @param basePath Route prefix used to mount the router under test.
 * @param router The real Express router being exercised.
 * @returns A configured Express app instance ready for Supertest.
 */
export function createTestApp(basePath: string, router: Router) {
  const app = express();

  app.use(express.json());
  app.use(basePath, router);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
