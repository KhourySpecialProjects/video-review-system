import { afterEach, vi } from "vitest";

/**
 * Stable test-only environment defaults shared by the backend suite.
 *
 * These values keep route and service tests deterministic without requiring a
 * real local `.env` file during unit-style execution.
 */
process.env.NODE_ENV = "test";
process.env.LOCAL = "false";
process.env.ADMIN_SECRET = "test-admin-secret";
process.env.ALLOWED_ORIGIN = "http://localhost:5173";
process.env.DIRECT_DATABASE_URL = "postgresql://test:test@localhost:5432/angelman_test";
process.env.LOCAL_DATABASE_URL = "postgresql://test:test@localhost:5432/angelman_test";
process.env.RDS_SESSION_MANAGER_DATABASE_URL = "postgresql://test:test@localhost:5432/angelman_test";

afterEach(() => {
  // Clear call history and one-off implementations between tests.
  vi.resetAllMocks();
});
