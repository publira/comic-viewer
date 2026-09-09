# Comic Viewer Tailwind CSS Demo

This maintained demo application is a styling reference for using `@publira/comic-viewer` with Tailwind CSS. It intentionally does not import `@publira/comic-viewer/default.css`.

The reader composes the public `ViewportTrack`, `ViewportPageSet`, `ViewportPageSlot`, `ViewportPage`, `ViewportPendingPage`, and `PageCanvas` primitives so that its page rail, responsive spreads, page-fit modes, and reader controls are styled with Tailwind utilities rather than implementation selectors.

It is deployed at [demo-tw.comic-viewer.publira.dev](https://demo-tw.comic-viewer.publira.dev/). The [standard demo](https://demo.comic-viewer.publira.dev/) shows the same viewer with the bundled stylesheet instead.

## Routes

The demos are grouped by what each page teaches, and both applications expose the same set:

| Path | Holds |
| --- | --- |
| `/` | The entry point: placeholder-to-full-image loading. |
| `/features/...` | Capabilities the library provides directly: `spreads`, `spread-page`, `slots`, `ltr`, `controls`, `zoom`. |
| `/recipes/...` | Integration patterns an application builds on top of the library: `fullscreen`, `progress`, `lazy`. |
| `/plugins/...` | Page-pipeline plugins: `decrypted`, `watermark`. |

The flat paths these pages used to live at, such as `/spreads` or `/progress`, redirect to their grouped counterparts.

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
