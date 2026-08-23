# Publira Comic Viewer

A highly extensible, headless-UI inspired React comic viewer designed for modern web applications.

It provides robust core functionalities like memory-efficient virtualization, responsive double-page spreads, and reading direction controls, while leaving the UI and data fetching pipeline entirely customizable.

## Features

- **Headless UI Architecture:** Fully customize the look and feel using Compound Components.
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

## Basic Usage

Import the optional core CSS and assemble the viewer using the provided Compound Components. The stylesheet provides the default layout and appearance; omit it when you supply the viewer's styles yourself, including through `className` utilities.

```tsx
import { ComicViewer } from "@publira/comic-viewer";
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
    <ComicViewer pages={pages} initialReadingDirection="rtl">
      <ComicViewer.Viewport />
      <ComicViewer.PageNavigation />
    </ComicViewer>
  );
}
```

`initialReadingDirection` defaults to `"rtl"` for right-to-left manga reading. Set it to `"ltr"` for left-to-right comics.

## Styling with Tailwind CSS

`core.css` is optional. When using Tailwind CSS, omit the stylesheet and apply the layout styles through `className` instead. The viewer and viewport need a defined size, flex layout, and hidden overflow. Compose the public `ViewportTrack`, `ViewportPageSet`, and `ViewportPageSlot` components to style the page-turn structure without selecting implementation classes.

```tsx
import { ComicViewer } from "@publira/comic-viewer";

export function Reader() {
  return (
    <ComicViewer
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
    </ComicViewer>
  );
}
```

Use `className` on the other compound components to style their controls. For page markup that keeps the viewer loading, decoding, and virtualization pipeline, provide a page template with the public `ViewportPage` and `PageCanvas` primitives:

```tsx
<ComicViewer.Viewport className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
  <ComicViewer.ViewportPage className="flex h-full w-full min-w-0 items-center justify-center">
    <ComicViewer.PageCanvas className="h-full max-w-full object-contain" />
  </ComicViewer.ViewportPage>
</ComicViewer.Viewport>
```

`PageCanvas` receives the current page and decoded image from `Viewport`, so it must be used in a viewport page template. Use `renderPage` when you need to render page content entirely independently of the built-in image pipeline.

## Page Navigation

`ComicViewer.PageNavigation` provides accessible previous-page, page-status, and next-page controls. For a custom arrangement, compose `PreviousPageButton`, `PageStatus`, `NextPageButton`, and `PageProgress` with its public `PageProgressTrack` primitive:

```tsx
<ComicViewer.Toolbar>
  <ComicViewer.PageNavigation className="reader-controls">
    <ComicViewer.PreviousPageButton>Back</ComicViewer.PreviousPageButton>
    <ComicViewer.NextPageButton>Forward</ComicViewer.NextPageButton>
    <ComicViewer.PageProgress>
      <ComicViewer.PageProgressTrack className="progress-bar" />
      <ComicViewer.PageStatus />
    </ComicViewer.PageProgress>
  </ComicViewer.PageNavigation>
</ComicViewer.Toolbar>
```

## Advanced: Using Plugins

You can intercept and modify the data pipeline (e.g., decrypting binary images on the fly) using the `plugins` prop. Default pages are always decoded and rendered to a `canvas`. Provide an optional `placeholder` URL on each page to display a blurred preview while its full `src` is loading.

```tsx
import { ComicViewer, definePlugin } from "@publira/comic-viewer";

const myDecryptionPlugin = definePlugin({
  name: "my-decryption-plugin",
  afterFetch: async (buffer: ArrayBuffer) => {
    // Implement your custom decryption logic here (e.g., WASM XOR)
    return decryptData(buffer);
  },
});

function SecureApp() {
  return (
    <ComicViewer pages={securePages} plugins={[myDecryptionPlugin]}>
      <ComicViewer.Viewport />
    </ComicViewer>
  );
}
```

## License

[Apache License 2.0](LICENSE)
