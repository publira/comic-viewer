import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const workspaceRoot = fileURLToPath(new URL("..", import.meta.url));
const configuredBaseURL = process.env.E2E_BASE_URL;
const port = process.env.E2E_PORT ?? "3000";
const baseURL = configuredBaseURL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  reporter: process.env.CI === undefined ? "list" : "github",
  retries: process.env.CI === undefined ? 0 : 2,
  testDir: "./tests",
  testMatch: "**/*.e2e.ts",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer:
    configuredBaseURL === undefined
      ? {
          command: `pnpm --filter @publira/comic-viewer-demo exec next start --hostname 127.0.0.1 --port ${port}`,
          cwd: workspaceRoot,
          reuseExistingServer: process.env.CI === undefined,
          url: baseURL,
        }
      : undefined,
});
