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

`core.css` is optional. Omit it when you override the viewer styles through `className`, such as with Tailwind CSS, or when you provide all styles independently. In either case, give the viewer's parent an explicit size so the viewport can fill the available area.

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
        <ComicViewer.PageNavigation />
      </ComicViewer>
    </div>
  );
}
```

`initialReadingDirection` defaults to `"rtl"` for right-to-left manga reading. Set it to `"ltr"` for left-to-right comics. The viewport switches between single and double-page display based on its width; use `doublePageThreshold` to change the default 768px breakpoint.

### Double-page grouping

Use `spreadStartIndex` to leave leading pages unpaired before double-page spreads. The value is a zero-based page index: every page before it is shown individually in double-page mode, and that page begins pairing with the following page. For example, `spreadStartIndex={1}` renders page 1 as a cover and then pairs pages 2–3, 4–5, and so on. `spreadStartIndex={2}` renders pages 1 and 2 individually before pairing pages 3–4. This grouping and the navigation controls work the same way for both RTL and LTR readers. The default is `0`, which preserves the existing behavior of pairing from the first page.

```tsx
<ComicViewer pages={pages} spreadStartIndex={1}>
  <ComicViewer.Viewport />
</ComicViewer>
```

## Tailwind CSS

To style the viewer with Tailwind CSS, do not import `core.css`; apply the layout utilities through `className` instead. The root and viewport need an explicit size, flex layout, and hidden overflow.

```tsx
<ComicViewer
  pages={pages}
  className="relative flex h-screen w-full min-h-0 min-w-0 overflow-hidden bg-neutral-950 text-neutral-100"
>
  <ComicViewer.Viewport className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden [&>*]:flex-1 [&>*]:min-w-0 [&>*]:items-center [&>*]:justify-center" />
</ComicViewer>
```

Use `className` on the other compound components to style their controls. To control page markup and styling completely, provide `renderPage` to `ComicViewer.Viewport`.

## Page navigation

`ComicViewer.PageNavigation` provides accessible previous-page, page-status, and next-page controls. Buttons are disabled at the first and last spread, and the status reports the currently visible page or range. The control order follows the reader's direction.

For a custom arrangement, compose `PreviousPageButton`, `PageStatus`, and `NextPageButton` as children. These components render only semantic HTML and class names, leaving visual styling to the consumer.

```tsx
<ComicViewer.Toolbar>
  <ComicViewer.PageNavigation className="reader-controls">
    <ComicViewer.PreviousPageButton>Back</ComicViewer.PreviousPageButton>
    <ComicViewer.NextPageButton>Forward</ComicViewer.NextPageButton>
    <ComicViewer.PageStatus />
  </ComicViewer.PageNavigation>
</ComicViewer.Toolbar>
```

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
