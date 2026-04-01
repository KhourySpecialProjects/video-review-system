import { defineConfig } from "vitest/config";

/**
 * Shared Vitest configuration for backend unit and HTTP tests.
 *
 * Keeps the runner in a Node environment, loads the common mock/reset setup,
 * and scopes discovery to the backend test tree created for this suite.
 */
export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["src/__tests__/setup.ts"],
    include: ["src/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
      reportOnFailure: true,
      include: [
        "src/domains/**",
        "src/middleware/**",
        "src/lib/**",
        "src/config/**",
        "src/index.ts",
      ],
      exclude: [
        "src/__tests__/**",
        "src/generated/**",
        "src/types/**",
        "dist/**",
        "coverage/**",
        "node_modules/**",
      ],
    },
  },
});
