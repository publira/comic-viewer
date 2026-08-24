# Comic Viewer End-to-End Tests

This workspace contains browser-level tests for Comic Viewer through both the standard demo and the Tailwind CSS styling-reference demo.

## Run Locally

Install Chromium once, then run the suite from the repository root:

```bash
pnpm --filter @publira/comic-viewer-e2e exec playwright install chromium
pnpm test:e2e
```

The command builds the workspace, starts the standard demo on port 3000 and the Tailwind CSS demo on port 4000, then runs the same Playwright suite against both applications.

## Configure Base URLs

Set `E2E_PORT` and `E2E_TAILWIND_PORT` to give a local run its own ports. Set `E2E_BASE_URL` and `E2E_TAILWIND_BASE_URL` to replace the base URLs used by the standard and Tailwind projects.

```bash
E2E_PORT=3002 E2E_TAILWIND_PORT=4001 pnpm test:e2e
E2E_BASE_URL=https://demo.example.com E2E_TAILWIND_BASE_URL=https://tailwind-demo.example.com pnpm --filter @publira/comic-viewer-e2e test:e2e
```
