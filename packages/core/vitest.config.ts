import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["src/test-setup.ts"],
      include: ["src/**/*.{ts,tsx}"],
      provider: "v8",
    },
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
