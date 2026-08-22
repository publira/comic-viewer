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

Import the package stylesheet once in the client entry point or in the component that renders the viewer:

```tsx
import "@publira/comic-viewer/core.css";
```

The stylesheet supplies the layout constraints used by the viewer's compound components. Give the viewer's parent an explicit size so the viewport can fill the available area.

## Basic usage

Compose `ComicViewer` with `ComicViewer.Viewport` and provide a page list. A page needs an `id`, `src`, and accessible `title`; `width`, `height`, `mimeType`, and `placeholder` are optional.

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

export function Reader() {
  return (
    <div style={{ height: "100vh" }}>
      <ComicViewer pages={pages} initialReadingDirection="rtl">
        <ComicViewer.Viewport />
      </ComicViewer>
    </div>
  );
}
```

`initialReadingDirection` defaults to `"rtl"` for right-to-left manga reading. Set it to `"ltr"` for left-to-right comics. The viewport switches between single and double-page display based on its width; use `doublePageThreshold` to change the default 768px breakpoint.

## Plugins

Pass plugins through the `plugins` prop to customize the page data pipeline. Use `definePlugin` for type inference. Hooks run in registration order:

- `beforeFetch` can replace the page URL.
- `customFetch` can supply the page data instead of the built-in `fetch`.
- `afterFetch` can transform the fetched `ArrayBuffer`, for example to decrypt a page or add a watermark.
- `onPageChange` receives the current page index and total number of pages.

```tsx
import { ComicViewer, definePlugin } from "@publira/comic-viewer";

const decryptionPlugin = definePlugin({
  name: "decrypt-pages",
  afterFetch: async (encryptedPage: ArrayBuffer) =>
    decryptPage(encryptedPage),
});

export function SecureReader() {
  return (
    <ComicViewer pages={pages} plugins={[decryptionPlugin]}>
      <ComicViewer.Viewport />
    </ComicViewer>
  );
```
