# Comic Viewer End-to-End Tests

This workspace contains browser-level tests for Comic Viewer through both the standard demo and the Tailwind CSS styling-reference demo.

## Layout

The specs mirror the route groups of the demos, so a demo and its coverage are named alike:

| File | Covers |
| --- | --- |
| `tests/basic.e2e.ts` | The reader on `/`. |
| `tests/features/*.e2e.ts` | One file per `/features/...` demo, plus `reading-progress.e2e.ts` for the page-progress slider the toolbar carries everywhere. |
| `tests/recipes/*.e2e.ts` | One file per `/recipes/...` demo. |
| `tests/plugins.e2e.ts` | Both `/plugins/...` demos. |
| `tests/navigation.e2e.ts` | The grouped navigation menus, the link across to the counterpart demo, and the redirects from the old flat paths. |

Selectors and page helpers shared between specs live in `helpers/` and are imported through the `#helpers/*` subpath, so a spec reads the same however deeply it is nested.

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
