# `@publira/comic-viewer`

A composable React viewer for comics and manga. It provides a virtualized viewport, responsive single- and double-page modes, and plugin hooks for custom page-fetching and transformation pipelines.

## Installation

```bash
npm install @publira/comic-viewer
# or
pnpm add @publira/comic-viewer
# or
yarn add @publira/comic-viewer
```

`react` 19 or later is required as a peer dependency.

## CSS setup

Import the package stylesheet once in the client entry point or in the component that renders the viewer when you want the default layout and appearance:

```tsx
import "@publira/comic-viewer/core.css";
```

`core.css` is optional. Omit it when you override the viewer styles through `className`, such as with Tailwind CSS, or when you provide all styles independently. In either case, give the viewer's parent an explicit size so the viewport can fill the available area. Compose the public `ViewportTrack`, `ViewportPageSet`, and `ViewportPageSlot` components to style the page-turn structure without targeting implementation classes.

## Basic usage

Import the package namespace and compose `ComicViewer.Root` with `ComicViewer.Viewport`, providing a page list. Each component is an independent named export, so a bundler can omit the ones you never render. A page needs an `id`, `src`, and accessible `title`; `width`, `height`, `mimeType`, and `placeholder` are optional.

```tsx
import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";
import "@publira/comic-viewer/core.css";

const pages: ViewerPage[] = [
  {
    id: "page-1",
    src: "https://example.com/pages/1.jpg",
    title: "Page 1",
    width: 1200,
    height: 1800,
  },
  {
    id: "page-2",
    src: "https://example.com/pages/2.jpg",
    title: "Page 2",
    width: 1200,
    height: 1800,
  },
];

export function Reader() {
  return (
    <div style={{ height: "100vh" }}>
      <ComicViewer.Root pages={pages} initialReadingDirection="rtl">
        <ComicViewer.Viewport />
        <ComicViewer.Toolbar />
        <ComicViewer.PageNavigation />
      </ComicViewer.Root>
    </div>
  );
}
```

`initialReadingDirection` defaults to `"rtl"` for right-to-left manga reading. Set it to `"ltr"` for left-to-right comics. The viewport switches between single and double-page display based on its width; use `doublePageThreshold` to change the default 768px breakpoint.

### Per-viewer theme

When using `core.css`, each viewer root falls back to `#111111` for `--pcv-bg` and `#f3f3f3` for `--pcv-fg`. Add a class to `ComicViewer.Root` and set those properties on that same element to theme viewers independently:

```tsx
<ComicViewer.Root pages={pages} className="night-reader">
  <ComicViewer.Viewport />
</ComicViewer.Root>
```

```css
.pcv-root.night-reader {
  --pcv-bg: #0f172a;
  --pcv-fg: #e2e8f0;
}
```

### Page size and panning

Pages initially fit their height. Pinch with two fingers to zoom and move the page; once zoomed, drag with one pointer to pan. A single-finger double tap resets the page to fit-to-width. These gestures take priority over page navigation, so they cannot accidentally turn the page.

### Controlled navigation

By default, the viewer manages its page index internally. Set `initialIndex` to choose its starting page. To synchronize the index with a router, persisted state, or another control, pass `currentIndex` and update it from `onIndexChange`. Both values are zero-based. The callback is called only when navigation changes the index, including navigation through buttons, keyboard input, viewport edge clicks, swipes, and `useViewerContext().goTo()`.

```tsx
import { useState } from "react";

const [currentIndex, setCurrentIndex] = useState(0);

<ComicViewer.Root
  currentIndex={currentIndex}
  onIndexChange={setCurrentIndex}
  pages={pages}
>
  <ComicViewer.Viewport />
</ComicViewer.Root>;
```

### Double-page grouping

Use `spreadStartIndex` to leave leading pages unpaired before double-page spreads. The value is a zero-based page index: every page before it is shown individually in double-page mode, and that page begins pairing with the following page. For example, `spreadStartIndex={1}` renders page 1 as a cover and then pairs pages 2–3, 4–5, and so on. `spreadStartIndex={2}` renders pages 1 and 2 individually before pairing pages 3–4. This grouping and the navigation controls work the same way for both RTL and LTR readers. The default is `0`, which preserves the existing behavior of pairing from the first page.

```tsx
<ComicViewer.Root pages={pages} spreadStartIndex={1}>
  <ComicViewer.Viewport />
</ComicViewer.Root>
```

## Tailwind CSS

To style the viewer with Tailwind CSS, do not import `core.css`; apply the layout utilities through `className` instead. The root and viewport need an explicit size, flex layout, and hidden overflow.

```tsx
import * as ComicViewer from "@publira/comic-viewer";

<ComicViewer.Root
  pages={pages}
  className="relative flex h-screen w-full min-h-0 min-w-0 overflow-hidden bg-neutral-950 text-neutral-100"
>
  <ComicViewer.Viewport className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
    <ComicViewer.ViewportTrack className="flex h-full w-[300%] shrink-0 basis-[300%] [transform:translateX(calc(-33.3333%_+_var(--pcv-drag-offset)))] transition-transform duration-[260ms] ease-out data-[dragging]:transition-none data-[transition-state=active]:data-[slide-direction=left]:[transform:translateX(calc(-66.6667%_+_var(--pcv-drag-offset)))] data-[transition-state=active]:data-[slide-direction=right]:[transform:translateX(var(--pcv-drag-offset))]">
      <ComicViewer.ViewportPageSet className="flex h-full min-w-0 shrink-0 basis-1/3 [transform:translate(var(--pcv-pan-x,0),var(--pcv-pan-y,0))_scale(var(--pcv-zoom-scale,1))] data-[view-mode=double]:data-[page-count=1]:data-[reading-direction=rtl]:justify-end data-[view-mode=double]:data-[page-count=1]:data-[reading-direction=ltr]:justify-start">
        <ComicViewer.ViewportPageSlot className="flex min-w-0 flex-1 items-center justify-center data-[view-mode=double]:basis-1/2 data-[view-mode=double]:max-w-1/2">
          <ComicViewer.ViewportPage className="flex h-full w-full min-w-0 items-center justify-center">
            <ComicViewer.PageCanvas className="h-full max-w-full object-contain" />
          </ComicViewer.ViewportPage>
        </ComicViewer.ViewportPageSlot>
      </ComicViewer.ViewportPageSet>
    </ComicViewer.ViewportTrack>
  </ComicViewer.Viewport>
</ComicViewer.Root>;
```

Use `className` on the other components to style their controls. For page markup that keeps the viewer loading, decoding, and virtualization pipeline, provide a page template with the public `ViewportPage` and `PageCanvas` primitives:

```tsx
<ComicViewer.Viewport className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
  <ComicViewer.ViewportPage className="flex h-full w-full min-w-0 items-center justify-center">
    <ComicViewer.PageCanvas className="h-full max-w-full object-contain" />
  </ComicViewer.ViewportPage>
</ComicViewer.Viewport>
```

`PageCanvas` receives the current page and decoded image from `Viewport`, so it must be used in a viewport page template. Use `renderPage` when you need to render page content entirely independently of the built-in image pipeline.

## Page loading state and errors

`Viewport` loads, transforms, and decodes every page it manages. Pass `onPageLoadError` to observe a failure, and read `usePageLoadState()` inside a page template to render a loading or error state.

```tsx
<ComicViewer.Viewport
  onPageLoadError={({ cause, index, page, stage }) => {
    reportError(cause, { pageId: page.id, index, stage });
  }}
/>
```

Each failure reports the `page` it belongs to, its zero-based `index`, the `stage` that failed, and the original error as `cause`:

- `"fetch"` — the built-in `fetch` rejected or returned a non-OK response, or a `customFetch` hook threw.
- `"transform"` — a `beforeFetch` or `afterFetch` hook threw.
- `"decode"` — the fetched data could not be decoded as an image.

`usePageLoadState()` exposes the same failure to the page template, together with the page's `status` (`"idle"`, `"loading"`, `"loaded"`, or `"error"`), whether a `placeholder` is currently drawn, and a `retry` function that starts a new attempt for a failed page. A failed page is not retried automatically, so nothing is refetched until `retry` is called or the page is evicted from the cache and scrolled back into view.

```tsx
import * as ComicViewer from "@publira/comic-viewer";

function Page() {
  const { error, retry, status } = ComicViewer.usePageLoadState();

  return (
    <ComicViewer.ViewportPage>
      <ComicViewer.PageCanvas />
      {status === "error" && (
        <div role="alert">
          <p>This page could not be loaded ({error?.stage}).</p>
          <button onClick={retry} type="button">
            Try again
          </button>
        </div>
      )}
    </ComicViewer.ViewportPage>
  );
}

<ComicViewer.Viewport>
  <Page />
</ComicViewer.Viewport>;
```

A page's `placeholder` stays on the canvas while the full-resolution image loads and after it fails, so a retry never blanks the viewport. `PageCanvas` reflects the same state through `data-page-status`, `data-placeholder`, and `aria-busy`, which is set until the full page is drawn or the load fails.

Pages rendered through `renderPage` bypass this pipeline entirely: they stay `"idle"` and never report an error, because the consumer loads their content.

`Toolbar` and `PageNavigation` report their shared visibility as `aria-hidden` and `inert`, and nothing else. Without `core.css` they would stay on screen permanently, so style both states yourself through the `aria-hidden` variant, which matches only the hidden state. `inert` already blocks pointer and keyboard access while hidden, so the utilities only have to cover the visual side. `Toolbar` sets `dir` from the reading direction, so logical utilities such as `start-3` and the progress fill follow the reader automatically.

```tsx
<ComicViewer.Toolbar className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 bg-linear-to-t from-black/80 via-black/55 to-transparent px-3 pt-8 pb-3 transition duration-150 ease-out aria-hidden:translate-y-2 aria-hidden:opacity-0">
  <ComicViewer.PageProgress className="mx-auto min-w-0 shrink basis-3/5">
    <ComicViewer.PageProgressTrack className="block h-1 w-full appearance-none overflow-hidden rounded-full bg-black/65 [&::-moz-progress-bar]:bg-neutral-100 [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:bg-neutral-100" />
    <ComicViewer.PageStatus className="mt-1.5 block text-center text-sm" />
  </ComicViewer.PageProgress>
</ComicViewer.Toolbar>
<ComicViewer.PageNavigation className="pointer-events-none absolute inset-0 z-10 transition duration-150 ease-out aria-hidden:translate-y-2 aria-hidden:opacity-0">
  <ComicViewer.PreviousPageButton className="pointer-events-auto absolute start-3 top-1/2 rounded-full bg-black/60 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50" />
  <ComicViewer.NextPageButton className="pointer-events-auto absolute end-3 top-1/2 rounded-full bg-black/60 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50" />
</ComicViewer.PageNavigation>
```

## Page navigation

`ComicViewer.PageNavigation` provides accessible previous-page and next-page controls. Buttons are disabled at the first and last spread, and the control order follows the reader's direction. `ComicViewer.Toolbar` is its sibling and holds the reading progress: `PageProgressTrack` and `PageStatus`, which reports the currently visible page or range.

For a custom arrangement, compose `PreviousPageButton`, `NextPageButton`, `PageProgress`, `PageProgressTrack`, and `PageStatus` as children. These components render only semantic HTML and class names, leaving visual styling to the consumer.

```tsx
<ComicViewer.Toolbar className="reader-toolbar">
  <ComicViewer.PageProgress>
    <ComicViewer.PageProgressTrack className="progress-bar" />
    <ComicViewer.PageStatus />
  </ComicViewer.PageProgress>
</ComicViewer.Toolbar>
<ComicViewer.PageNavigation className="reader-controls">
  <ComicViewer.PreviousPageButton>Back</ComicViewer.PreviousPageButton>
  <ComicViewer.NextPageButton>Forward</ComicViewer.NextPageButton>
</ComicViewer.PageNavigation>
```

### Reader control visibility

`Toolbar` and `PageNavigation` share one visibility state. Both start hidden, and a click or tap on the viewport away from the page-turn edges reveals them; a pannable page reveals them from anywhere. Another click, or a two-second pause, hides them again. Pressing <kbd>Enter</kbd> or <kbd>Space</kbd> on the focused viewport does the same from the keyboard. While hidden, both are `inert` and outside the accessibility tree, so their controls cannot be focused or read.

The countdown does not run while a pointer rests on either container or focus sits inside one, so the controls cannot vanish mid-interaction. A touch reports the same hold for the length of the tap, so releasing a button starts a fresh countdown rather than letting a spent one run out.

Read `areControlsVisible` and call `toggleControls` from `useViewerContext` to drive the same state from your own controls, and `holdControls(true)` / `holdControls(false)` in balanced pairs to suspend and restart the countdown around your own container. `PageProgress` also takes a `visible` prop when it needs to hide independently of its container.

`Toolbar` sets `dir` and `data-reading-direction` from the reader's direction, so its controls lay out along the reading direction and `PageProgressTrack` fills toward the page the reader is heading for: leftward in `rtl`, rightward in `ltr`.

## Plugins

Pass plugins through the `plugins` prop to customize the page data pipeline. Use `ComicViewer.definePlugin` for type inference. Hooks run in registration order:

- `beforeFetch` receives `{ url, signal, page }` and can replace the page URL.
- `customFetch` receives `{ url, signal, page }` and can supply the page data instead of the built-in `fetch`; if several return a buffer, the last buffer is used.
- `afterFetch` receives `{ url, signal, page, buffer }` and can transform the fetched `ArrayBuffer`, for example to decrypt a page or add a watermark. Each returned buffer is passed to the following hook.
- `onPageChange` receives the current page index and total number of pages.

```tsx
import * as ComicViewer from "@publira/comic-viewer";

const decryptionPlugin = ComicViewer.definePlugin({
  name: "decrypt-pages",
  afterFetch: async ({ buffer }) => decryptPage(buffer),
});

export function SecureReader() {
  return (
    <ComicViewer.Root pages={pages} plugins={[decryptionPlugin]}>
      <ComicViewer.Viewport />
    </ComicViewer.Root>
  );
}
```
