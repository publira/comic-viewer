import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const workspaceRoot = fileURLToPath(new URL("..", import.meta.url));
const port = process.env.E2E_PORT ?? "3000";
const tailwindPort = process.env.E2E_TAILWIND_PORT ?? "4000";
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;
const tailwindBaseURL =
  process.env.E2E_TAILWIND_BASE_URL ?? `http://127.0.0.1:${tailwindPort}`;

// pnpm >= 12.6.0 moves `next start` out of the process group Playwright
// SIGKILLs, so ask pnpm to forward SIGTERM instead.
const gracefulShutdown = { signal: "SIGTERM", timeout: 5000 } as const;

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  projects: [
    {
      name: "default-css",
      use: { ...devices["Desktop Chrome"], baseURL },
    },
    {
      name: "tailwind-css",
      use: { ...devices["Desktop Chrome"], baseURL: tailwindBaseURL },
    },
  ],
  reporter: process.env.CI === undefined ? "list" : "github",
  retries: process.env.CI === undefined ? 0 : 2,
  testDir: "./tests",
  testMatch: "**/*.e2e.ts",
  use: {
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: `pnpm --filter @publira/comic-viewer-demo exec next start --hostname 127.0.0.1 --port ${port}`,
      cwd: workspaceRoot,
      gracefulShutdown,
      reuseExistingServer: process.env.CI === undefined,
      url: baseURL,
    },
    {
      command: `pnpm --filter @publira/comic-viewer-tailwind-demo exec next start --hostname 127.0.0.1 --port ${tailwindPort}`,
      cwd: workspaceRoot,
      gracefulShutdown,
      reuseExistingServer: process.env.CI === undefined,
      url: tailwindBaseURL,
    },
  ],
});
