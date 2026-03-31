import { defineConfig } from "vitest/config";

/**
 * Dedicated Vitest config for the example suite that mixes passing tests with
 * intentional failures for demonstration purposes.
 */
export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["src/__tests__/setup.ts"],
    include: ["src/__tests__/example/**/*.test.ts"],
  },
});
