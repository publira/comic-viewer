# Comic Viewer End-to-End Tests

This workspace contains browser-level tests for Comic Viewer through the demo application.

## Run Locally

Install Chromium once, then run the suite from the repository root:

```bash
pnpm --filter @publira/comic-viewer-e2e exec playwright install chromium
pnpm test:e2e
```

The command builds the workspace and starts the demo application in production mode before Playwright runs the tests.

## Target a Specific Server

Set `E2E_PORT` to give a local run its own port. To test an already-running or deployed application, set `E2E_BASE_URL`; Playwright then does not start a local server.

```bash
E2E_PORT=3001 pnpm test:e2e
E2E_BASE_URL=https://example.com pnpm --filter @publira/comic-viewer-e2e test:e2e
```
