# Publira Comic Viewer

A highly extensible, headless-UI inspired React comic viewer designed for modern web applications.

It provides robust core functionalities like memory-efficient virtualization, responsive double-page spreads, and reading direction controls, while leaving the UI and data fetching pipeline entirely customizable.

## Features

- **Headless UI Architecture:** Fully customize the look and feel by composing independent, tree-shakeable components.
- **Responsive Spread Views:** Automatically switches between single and double-page spreads based on container width.
- **Pluggable Data Pipeline:** Easily inject custom logic for data fetching, decryption (e.g., WASM/DRM), and analytics via the `plugins` API.
- **Virtualization & Memory Management:** Safely handles large volumes of high-resolution images or canvases without crashing mobile browsers.
- **Gesture & Keyboard Support:** Built-in support for swipe, click, and keyboard navigation.

## Installation

```bash
npm install @publira/comic-viewer
# or
yarn add @publira/comic-viewer
# or
pnpm add @publira/comic-viewer
```

## Versioning

This project is pre-1.0 and does not yet follow strict Semantic Versioning guarantees. Within a `0.x.y` line, patch releases aim to preserve compatibility where reasonably possible. Minor `0.x` releases may include breaking API changes when they improve the library design or public API, so review the [changelog](packages/core/CHANGELOG.md) before upgrading between minor versions.

## Basic Usage

Import the optional core CSS and assemble the viewer by importing the package namespace and composing `ComicViewer.Root` with the components you need. Each component is an independent named export, so a bundler can omit the ones you never render. The stylesheet provides the default layout and appearance; omit it when you supply the viewer's styles yourself, including through `className` utilities.

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

function App() {
  return (
    <ComicViewer.Root pages={pages} initialReadingDirection="rtl">
      <ComicViewer.Viewport />
      <ComicViewer.Toolbar />
      <ComicViewer.PageNavigation />
    </ComicViewer.Root>
  );
}
```

`initialReadingDirection` defaults to `"rtl"` for right-to-left manga reading. Set it to `"ltr"` for left-to-right comics.

## Styling with Tailwind CSS

`core.css` is optional. When using Tailwind CSS, omit the stylesheet and apply the layout styles through `className` instead. The viewer and viewport need a defined size, flex layout, and hidden overflow. Compose the public `ViewportTrack`, `ViewportPageSet`, and `ViewportPageSlot` components to style the page-turn structure without selecting implementation classes.

For a maintained, runnable reference, see the [Tailwind CSS demo](apps/demo-tw/README.md).

```tsx
import * as ComicViewer from "@publira/comic-viewer";

export function Reader() {
  return (
    <ComicViewer.Root
      pages={pages}
      className="relative flex h-screen w-full min-h-0 min-w-0 overflow-hidden bg-neutral-950 text-neutral-100"
    >
      <ComicViewer.Viewport className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <ComicViewer.ViewportTrack className="flex h-full w-[300%] shrink-0 basis-[300%] [transform:translateX(calc(-33.3333%_+_var(--pcv-drag-offset)))] transition-transform duration-[260ms] ease-out data-[dragging]:transition-none data-[transition-state=active]:data-[slide-direction=left]:[transform:translateX(calc(-66.6667%_+_var(--pcv-drag-offset)))] data-[transition-state=active]:data-[slide-direction=right]:[transform:translateX(var(--pcv-drag-offset))]">
          <ComicViewer.ViewportPageSet className="flex h-full min-w-0 shrink-0 basis-1/3 [transform:translate(var(--pcv-pan-x,0),var(--pcv-pan-y,0))_scale(var(--pcv-zoom-scale,1))] data-[page-side=left]:justify-start data-[page-side=right]:justify-end">
            <ComicViewer.ViewportPageSlot className="flex min-w-0 flex-1 items-center justify-center data-[page-side=left]:justify-end data-[page-side=right]:justify-start data-[view-mode=double]:basis-1/2 data-[view-mode=double]:max-w-1/2">
              <ComicViewer.ViewportPage className="flex h-full w-full min-w-0 items-center justify-center data-[page-side=left]:justify-end data-[page-side=right]:justify-start">
                <ComicViewer.PageCanvas className="h-full max-w-full object-contain" />
              </ComicViewer.ViewportPage>
            </ComicViewer.ViewportPageSlot>
          </ComicViewer.ViewportPageSet>
        </ComicViewer.ViewportTrack>
      </ComicViewer.Viewport>
    </ComicViewer.Root>
  );
}
```

In double-page mode the rail reports the half of the spread a page takes as `data-page-side="left"` or `data-page-side="right"`, on `ViewportPageSlot` and `ViewportPage`, and on `ViewportPageSet` while it holds a single page. The side follows the parity of the page's offset from `spreadStartIndex`, so an unpaired page keeps the side it would have had in a printed book: with `spreadStartIndex={1}` the cover faces the page after it instead of sharing its side. The attribute is absent in single-page mode, where a page has no facing half. Align each page against the edge of its half that faces the gutter, as the example does, so the two pages of a spread meet at the centre line instead of drifting apart on a viewport wider than the pages.

Use `className` on the other components to style their controls. For page markup that keeps the viewer loading, decoding, and virtualization pipeline, provide a page template with the public `ViewportPage` and `PageCanvas` primitives:

```tsx
<ComicViewer.Viewport className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
  <ComicViewer.ViewportPage className="flex h-full w-full min-w-0 items-center justify-center">
    <ComicViewer.PageCanvas className="h-full max-w-full object-contain" />
  </ComicViewer.ViewportPage>
</ComicViewer.Viewport>
```

`PageCanvas` receives the current page and decoded image from `Viewport`, so it must be used in a viewport page template. Use `renderPage` when you need to render page content entirely independently of the built-in image pipeline.

## Page Loading State

`Viewport` reports every page that fails to fetch, transform, or decode through `onPageLoadError`, and page templates can read the same state with `usePageLoadState()` to render an error state and offer a retry. A page's blurred `placeholder` stays visible while the full page loads and after a failure.

```tsx
function Page() {
  const { error, retry, status } = ComicViewer.usePageLoadState();

  return (
    <ComicViewer.ViewportPage>
      <ComicViewer.PageCanvas />
      {status === "error" && (
        <button onClick={retry} type="button">
          Retry ({error?.stage})
        </button>
      )}
    </ComicViewer.ViewportPage>
  );
}

<ComicViewer.Viewport onPageLoadError={reportPageFailure}>
  <Page />
</ComicViewer.Viewport>;
```

See the [package README](packages/core/README.md#page-loading-state-and-errors) for the full loading-state model.

`Toolbar` and `PageNavigation` report their shared visibility as `aria-hidden` and `inert` only, so without `core.css` they would stay on screen permanently. Style both states through the `aria-hidden` variant, which matches only the hidden state; `inert` already blocks pointer and keyboard access while hidden.

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

## Lazy Page Metadata

The `pages` array can be resolved as the reader advances rather than provided upfront, which suits long documents, expiring signed URLs, and lists that grow between chapters. Give the viewer the length of the document as `pageCount` and a `resolvePage` function, and it asks for the metadata of a page as the reader approaches it.

```tsx
<ComicViewer.Root
  pageCount={200}
  resolvePage={async (index, { signal }) => {
    const response = await fetch(`/api/pages/${index}`, { signal });
    return (await response.json()) as ViewerPage;
  }}
>
  <ComicViewer.Viewport />
  <ComicViewer.Toolbar />
  <ComicViewer.PageNavigation />
</ComicViewer.Root>
```

A viewer needs `pages`, `pageCount`, or both, so one given nothing but a resolver cannot silently hold an empty document. Navigation and progress count every page from the start, so the reader can jump anywhere immediately. A page still being resolved keeps its place in the spread as `ViewportPendingPage`, or as the skeleton given to `Viewport` through `renderPendingPage`. Metadata is forgotten once its page leaves the resolve window, so a page returned to later is resolved again with a fresh URL.

For a list whose length is not known upfront, keep passing `pages` and append to it from `onEndReached`, which the viewer calls as the reader comes within `endReachedThreshold` pages of the end.

See the [package README](packages/core/README.md#lazy-page-metadata) for the full model.

## Page Navigation

`ComicViewer.PageNavigation` provides accessible previous-page and next-page controls, while `ComicViewer.Toolbar` holds the reading progress. They are siblings, and they share one visibility state: a click or tap away from the page-turn edges reveals both, and a second one hides them again, as does a two-second pause. The countdown is suspended while a pointer rests on the controls or focus sits inside them, so they cannot vanish mid-interaction. `Toolbar` also lays out along the reading direction, so progress fills leftward in `rtl`.

For a custom arrangement, compose `PreviousPageButton`, `NextPageButton`, `PageStatus`, and `PageProgress` with its public `PageProgressTrack` primitive:

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

## Advanced: Using Plugins

You can intercept and modify the data pipeline (e.g., decrypting binary images on the fly) using the `plugins` prop. Default pages are always decoded and rendered to a `canvas`. Provide an optional `placeholder` URL on each page to display a blurred preview while its full `src` is loading.

```tsx
import * as ComicViewer from "@publira/comic-viewer";

const myDecryptionPlugin = ComicViewer.definePlugin({
  name: "my-decryption-plugin",
  afterFetch: async (buffer: ArrayBuffer) => {
    // Implement your custom decryption logic here (e.g., WASM XOR)
    return decryptData(buffer);
  },
});

function SecureApp() {
  return (
    <ComicViewer.Root pages={securePages} plugins={[myDecryptionPlugin]}>
      <ComicViewer.Viewport />
    </ComicViewer.Root>
  );
}
```

## License

[Apache License 2.0](LICENSE)
