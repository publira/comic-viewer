# Comic Viewer Tailwind CSS Demo

This maintained demo application is a styling reference for using `@publira/comic-viewer` with Tailwind CSS. It intentionally does not import `@publira/comic-viewer/core.css`.

The reader composes the public `ViewportTrack`, `ViewportPageSet`, `ViewportPageSlot`, `ViewportPage`, `ViewportPendingPage`, and `PageCanvas` primitives so that its page rail, responsive spreads, page-fit modes, and reader controls are styled with Tailwind utilities rather than implementation selectors.

## Run locally

From the repository root:

```bash
pnpm --filter @publira/comic-viewer-tailwind-demo dev
```

Open [http://localhost:4000](http://localhost:4000). The standard demo uses port 3000, so both apps can run together through `pnpm dev`.

## Verify

The browser E2E suite starts this app on port 4000 by default and runs the same reader and plugin coverage against it and the standard demo:

```bash
pnpm test:e2e
```
