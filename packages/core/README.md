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

## Versioning

This project is pre-1.0 and does not yet follow strict Semantic Versioning guarantees. Within a `0.x.y` line, patch releases aim to preserve compatibility where reasonably possible. Minor `0.x` releases may include breaking API changes when they improve the library design or public API, so review the [changelog](https://github.com/publira/comic-viewer/blob/main/packages/core/CHANGELOG.md) before upgrading between minor versions.

### Planned breaking changes for `1.0.0`

- The `./core.css` subpath, kept as an alias of `./default.css` throughout the `0.x` line, will be removed. Import `@publira/comic-viewer/default.css` instead.

## CSS setup

Import the package stylesheet once in the client entry point or in the component that renders the viewer when you want the default layout and appearance:

```tsx
import "@publira/comic-viewer/default.css";
```

`default.css` is optional. Omit it when you override the viewer styles through `className`, such as with Tailwind CSS, or when you provide all styles independently. In either case, give the viewer's parent an explicit size so the viewport can fill the available area. Compose the public `ViewportTrack`, `ViewportPageSet`, and `ViewportPageSlot` components to style the page-turn structure without targeting implementation classes.

The stylesheet was named `core.css` before it was renamed to `default.css`. `@publira/comic-viewer/core.css` still resolves to the same file for the rest of the `0.x` line, but it is deprecated and will be removed in `1.0.0`, so move existing imports to `@publira/comic-viewer/default.css`.

## Basic usage

Import the package namespace and compose `ComicViewer.Root` with `ComicViewer.Viewport`, providing a page list. Each component is an independent named export, so a bundler can omit the ones you never render. A page needs an `id`, `src`, and accessible `title`; `width`, `height`, `mimeType`, and `placeholder` are optional.

```tsx
import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";
import "@publira/comic-viewer/default.css";

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

When using `default.css`, each viewer root falls back to `#111111` for `--pcv-bg` and `#f3f3f3` for `--pcv-fg`. Add a class to `ComicViewer.Root` and set those properties on that same element to theme viewers independently:

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

Use `spreadStartIndex` to leave leading pages unpaired before double-page spreads. The value is a zero-based page index: every page before it is shown individually in double-page mode, and that page begins pairing with the following page. For example, `spreadStartIndex={1}` renders page 1 as a cover and then pairs pages 2–3, 4–5, and so on. `spreadStartIndex={2}` renders pages 1 and 2 individually before pairing pages 3–4. This grouping and the navigation controls work the same way for both RTL and LTR readers. The default is `0`, which preserves the existing behavior of pairing from the first page. A page shown individually still takes the side its position in the spread gives it, so a cover sits opposite the page that follows it rather than on the same side.

```tsx
<ComicViewer.Root pages={pages} spreadStartIndex={1}>
  <ComicViewer.Viewport />
</ComicViewer.Root>
```

## Start and end pages

`StartPage` and `EndPage` hold content of your own at the two ends of the reading sequence: a notice before the chapter, a cover card, a link to the chapter that follows. Write them among the children of the viewer root, wherever they read best; the root takes them out of the tree and hands them to the viewport.

```tsx
<ComicViewer.Root pages={pages}>
  <ComicViewer.StartPage>
    <CoverNotice />
  </ComicViewer.StartPage>

  <ComicViewer.Viewport />

  <ComicViewer.EndPage>
    <NextChapterCard />
  </ComicViewer.EndPage>

  <ComicViewer.Toolbar />
  <ComicViewer.PageNavigation />
</ComicViewer.Root>
```

Each end takes as many of them as it is written with, and each one is a page of its own, turned to in the order it is written. Front and back matter that runs over several pages therefore stays out of the page count without being squeezed into a single card.

```tsx
<ComicViewer.Root pages={pages}>
  <ComicViewer.StartPage>
    <CoverNotice />
  </ComicViewer.StartPage>

  <ComicViewer.StartPage>
    <ChapterTitleCard />
  </ComicViewer.StartPage>

  <ComicViewer.Viewport />

  <ComicViewer.EndPage>
    <Afterword />
  </ComicViewer.EndPage>

  <ComicViewer.EndPage>
    <NextChapterCard />
  </ComicViewer.EndPage>
</ComicViewer.Root>
```

A viewer composed from `ViewerProvider` finds them among its own children in the same way, and so does a reader component of your own that passes its children on to the viewer root.

```tsx
<ComicViewer.ViewerProvider pages={pages}>
  <ComicViewer.StartPage>
    <CoverNotice />
  </ComicViewer.StartPage>

  <ComicViewer.Viewport />
</ComicViewer.ViewerProvider>
```

### Reading order and page numbering

The reader turns to an extra page exactly as it turns to a page of the document, through the navigation buttons, the keyboard, an edge click, or a swipe. None of them is counted in `pageCount` or in the zero-based index mapping of `pages`, so the numbering a reader sees stays the numbering of the document. They take the indexes next to the list instead: `N` start pages take `-N` to `-1`, and `M` end pages take `pageCount` to `pageCount + M - 1`, each of them in the order it is written, so the reading order stays monotonic. `minIndex` and `maxIndex` on `useViewerContext` report the two ends of that range. A viewer holding start pages opens on `minIndex`, the first of them; pass `initialIndex={0}` to open on the first page of the document instead. A controlled `currentIndex` reaches them through those same indexes, and `onIndexChange` reports them.

`START_PAGE_INDEX` stays `-1`, which is now the index of the start page nearest the document — the last one written — rather than the index every viewer with front matter opens on. Read `minIndex` for that.

`PageStatus` names an extra page shown on its own rather than giving it a number: `Start page` or `End page` while the slot holds one page, and `Start page 2 of 3` while it holds several. It reads `Page 7 of 7` while an extra page shares a spread with a page of the document. Its `format` function receives the `slot` the viewer is showing, as `"start"`, `"end"`, or `undefined`, together with `slotPage` and `slotPageCount` for the place that page takes in its slot, so a reader can label them in its own words:

```tsx
<ComicViewer.PageStatus
  format={({ firstPage, lastPage, pageCount, slot, slotPage }) => {
    if (slot === "start") {
      return slotPage === 1 ? "Notice" : "Chapter title";
    }

    return slot === "end"
      ? "Next chapter"
      : `${firstPage}-${lastPage} / ${pageCount}`;
  }}
/>
```

### Spreads and styling

In double-page mode an extra page takes a half of the spread like any other page, following the same parity as the pages around it. With the default `spreadStartIndex={0}` every start page comes before the first spread and is shown on its own, so several of them are turned through one at a time, and the end pages pair by the parity of the pages before them: the first of them faces the last page whenever the document holds an odd number of pages, and the rest pair with each other. Pass a negative `spreadStartIndex` to count the spreads from a start page instead — `-1` pairs the last start page with the first page of the document, and `-2` pairs two start pages with each other.

Each of them renders one element carrying `pcv-page` and `pcv-page-slot`, with `data-page-slot="start"` or `data-page-slot="end"`, the `data-page-side` a page in its position would take, and `data-slot-page` and `data-slot-page-count` for the one-based place it takes among the pages of its slot. They take a `className` and the rest of the props of a `div`, and a custom `ViewportPageSlot` layout receives the same attributes so a stylesheet can tell an extra page from a page of the document, and one extra page from another.

```tsx
<ComicViewer.EndPage className="chapter-end">
  <NextChapterCard />
</ComicViewer.EndPage>
```

Links, buttons, form controls, and other interactive elements inside them keep their own clicks and touches: the viewport leaves a gesture that starts on a control alone instead of reading it as an edge click or a swipe.

## Lazy page metadata

Pass the whole `pages` array when the list is short and its URLs are stable. For a long document, for URLs that expire, or for a list that grows as the reader advances, give the viewer a `pageCount` and a `resolvePage` function instead: it then asks for the metadata of a page only as the reader approaches it.

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

`pageCount` is the length of the document rather than the number of pages resolved so far, so navigation, the progress track, and the page status count every page from the start and the reader can jump anywhere immediately. A viewer needs `pages`, `pageCount`, or both: one given nothing but a resolver would have no idea how many pages to resolve, and its props type rejects that pair rather than leaving it to hold an empty document. A component that passes a page list on to the viewer can take the same pair as `ViewerPageListProps` and hand it straight through.

`pageResolveOverscan` decides which pages are asked for, and nothing else: the viewer requests the metadata of the unresolved pages within that many of the current index, four on either side by default, which keeps the next spread ready before the reader turns to it. Widen it to ask further ahead of the reader, at the cost of requesting pages the reader may never reach.

How long a resolved page keeps its metadata is a second, wider window. A page keeps it while it stays within `pageResolveOverscan` of the current index or within the reach of the viewport, whichever is further — the viewport renders the spread before and the spread after the one on screen, and lags a whole spread behind while a page turn runs, so it reaches five pages past the current index. That floor is what keeps a narrow `pageResolveOverscan` from turning the spread a page turn is leaving behind into placeholders.

Past that window the metadata is dropped and an unfinished request for the page is aborted through the `AbortSignal` the resolver was given. A page returned to much later is therefore resolved again instead of reused, and a signed URL that has expired in the meantime is reissued rather than failing to load.

A resolver that returns `undefined` leaves the page unresolved, and one that rejects reports the failure through `onPageResolveError`. Neither is asked again until the page leaves that window and comes back into it, so a failing page cannot become a request loop.

`pages` and `resolvePage` work together: an entry given in `pages` is used as it is, and the resolver is asked only for the indices it leaves out, which is enough to serve the first pages from the document that rendered the viewer and resolve the rest.

Through `useViewerContext()`, `pages` holds one entry per page of the document, `undefined` while that page is unresolved, and `pageCount` gives the total.

### Pending pages

A page whose metadata is still being resolved keeps its place in the spread. `Viewport` renders `ViewportPendingPage` for it, which carries the `pcv-page-pending` class, `data-page-status="pending"`, and `aria-busy`. Pass `renderPendingPage` to render a skeleton of your own instead.

```tsx
<ComicViewer.Viewport
  renderPendingPage={(index) => <PageSkeleton pageNumber={index + 1} />}
/>
```

### Growing the page list

When the length of the document is not known upfront, such as when the next chapter is loaded as the reader reaches it, keep passing `pages` and append to it from `onEndReached`. The viewer calls it once the current page comes within `endReachedThreshold` pages of the end, two by default, and calls it again only after the page count has changed, so a consumer with nothing left to append is never asked in a loop.

```tsx
<ComicViewer.Root
  endReachedThreshold={3}
  onEndReached={loadNextChapter}
  pages={pages}
>
  <ComicViewer.Viewport />
</ComicViewer.Root>
```

## Tailwind CSS

To style the viewer with Tailwind CSS, do not import `default.css`; apply the layout utilities through `className` instead. The root and viewport need an explicit size, flex layout, and hidden overflow.

```tsx
import * as ComicViewer from "@publira/comic-viewer";

<ComicViewer.Root
  pages={pages}
  className="relative flex h-screen w-full min-h-0 min-w-0 overflow-hidden bg-neutral-950 text-neutral-100"
>
  <ComicViewer.Viewport className="group/viewport relative flex min-h-0 min-w-0 flex-1 touch-pan-y overflow-hidden data-[pannable]:cursor-grab data-[pannable]:touch-none data-[panning]:cursor-grabbing">
    <ComicViewer.ViewportTrack className="flex h-full w-[300%] shrink-0 basis-[300%] [transform:translateX(calc(-33.3333%_+_var(--pcv-drag-offset)))] data-[dragging]:transition-none data-[transition-state=active]:transition-transform data-[transition-state=active]:duration-[260ms] data-[transition-state=active]:ease-out data-[transition-state=active]:data-[slide-direction=left]:[transform:translateX(calc(-66.6667%_+_var(--pcv-drag-offset)))] data-[transition-state=active]:data-[slide-direction=right]:[transform:translateX(var(--pcv-drag-offset))]">
      <ComicViewer.ViewportPageSet className="flex h-full min-w-0 shrink-0 basis-1/3 data-[page-side=left]:justify-start data-[page-side=right]:justify-end data-[rail-slot=current]:[transform:translate(var(--pcv-pan-x,0)_var(--pcv-pan-y,0))_scale(var(--pcv-zoom-scale,1))]">
        <ComicViewer.ViewportPageSlot className="flex min-w-0 flex-1 items-center justify-center data-[page-side=left]:justify-end data-[page-side=right]:justify-start data-[view-mode=double]:basis-1/2 data-[view-mode=double]:max-w-1/2">
          <ComicViewer.ViewportPage className="flex h-full w-full min-w-0 items-center justify-center data-[page-side=left]:justify-end data-[page-side=right]:justify-start">
            <ComicViewer.PageCanvas className="h-full max-w-full object-contain group-data-[page-fit-mode=actual]/viewport:h-auto group-data-[page-fit-mode=actual]/viewport:w-auto group-data-[page-fit-mode=actual]/viewport:max-w-none group-data-[page-fit-mode=width]/viewport:h-auto group-data-[page-fit-mode=width]/viewport:w-full group-data-[page-fit-mode=width]/viewport:max-w-none" />
          </ComicViewer.ViewportPage>
        </ComicViewer.ViewportPageSlot>
      </ComicViewer.ViewportPageSet>
    </ComicViewer.ViewportTrack>
  </ComicViewer.Viewport>
  <ComicViewer.Toolbar className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 bg-linear-to-t from-black/80 via-black/55 to-transparent px-3 pt-8 pb-3 transition duration-150 ease-out aria-hidden:translate-y-2 aria-hidden:opacity-0">
    <ComicViewer.PageProgress className="mx-auto min-w-0 shrink basis-3/5">
      <ComicViewer.PageProgressSlider className="block h-3.5 w-full cursor-pointer appearance-none bg-transparent p-0 [--pcv-page-progress-fill-direction:to_right] rtl:[--pcv-page-progress-fill-direction:to_left] [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-neutral-100 [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-black/65 [&::-moz-range-track]:[background-image:linear-gradient(var(--pcv-page-progress-fill-direction),var(--color-neutral-100)_var(--pcv-page-progress-fill),transparent_var(--pcv-page-progress-fill))] [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-black/65 [&::-webkit-slider-runnable-track]:[background-image:linear-gradient(var(--pcv-page-progress-fill-direction),var(--color-neutral-100)_var(--pcv-page-progress-fill),transparent_var(--pcv-page-progress-fill))] [&::-webkit-slider-thumb]:-mt-[0.3125rem] [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-neutral-100" />
      <ComicViewer.PageStatus className="mt-1.5 block text-center text-sm" />
    </ComicViewer.PageProgress>
  </ComicViewer.Toolbar>
  <ComicViewer.PageNavigation className="pointer-events-none absolute inset-0 z-10 transition duration-150 ease-out aria-hidden:translate-y-2 aria-hidden:opacity-0">
    <ComicViewer.PreviousPageButton className="pointer-events-auto absolute start-3 top-1/2 rounded-full bg-black/60 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50" />
    <ComicViewer.NextPageButton className="pointer-events-auto absolute end-3 top-1/2 rounded-full bg-black/60 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50" />
  </ComicViewer.PageNavigation>
</ComicViewer.Root>;
```

None of this is decoration. The rail is three spreads wide, so `w-[300%]` and the `translateX(…)` transforms are what a page turn moves, and `--pcv-drag-offset` is what follows a finger during one; the transition is limited to `data-[transition-state=active]` so that only a settling turn animates and a drag tracks the pointer. The zoom and pan transform is limited to `data-[rail-slot=current]`, because only the spread the reader is on is zoomed, and `touch-pan-y` leaves vertical scrolling to the browser while a horizontal drag turns the page. The page fit modes are reported on `Viewport`, so `PageCanvas` reads them through the `group/viewport` variants. `Toolbar` and `PageNavigation` report their shared visibility as `aria-hidden` and `inert`, and nothing else, so without `default.css` they would stay on screen permanently and the `aria-hidden` variant, which matches only the hidden state, is what hides them. `inert` already blocks pointer and keyboard access while hidden, so the utilities only have to cover the visual side. [Reader control visibility](#reader-control-visibility) describes when that state changes.

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

## Page navigation

`ComicViewer.PageNavigation` provides accessible previous-page and next-page controls. Buttons are disabled at the first and last spread, and the control order follows the reader's direction. `ComicViewer.Toolbar` is its sibling and holds the reading progress: `PageProgressSlider`, which scrubs to any page, and `PageStatus`, which reports the currently visible page or range.

For a custom arrangement, compose `PreviousPageButton`, `NextPageButton`, `PageProgress`, `PageProgressSlider`, `PageProgressTrack`, and `PageStatus` as children. These components render only semantic HTML and class names, leaving visual styling to the consumer.

```tsx
<ComicViewer.Toolbar className="reader-toolbar">
  <ComicViewer.PageProgress>
    <ComicViewer.PageProgressSlider className="progress-slider" />
    <ComicViewer.PageStatus />
  </ComicViewer.PageProgress>
</ComicViewer.Toolbar>
<ComicViewer.PageNavigation className="reader-controls">
  <ComicViewer.PreviousPageButton>Back</ComicViewer.PreviousPageButton>
  <ComicViewer.NextPageButton>Forward</ComicViewer.NextPageButton>
</ComicViewer.PageNavigation>
```

### Scrubbing to a page

`PageProgressSlider` is a native `<input type="range">`, so it is operated with the arrow keys, <kbd>Home</kbd>, and <kbd>End</kbd> as well as by dragging its thumb, and it is disabled while a document holds a single reading position. It counts in the navigable indices `goTo` takes, from `minIndex` to `maxIndex`, so [a start or an end page](#start-and-end-pages) is a position on it like a page of the document is, and `aria-valuetext` names the page under the thumb rather than reading out the index. In double-page mode every value snaps to the page its spread starts from, `spreadStartIndex` included, so the slider lands on the same indices the page-turn controls do.

A drag carries `PageStatus` and `PageProgressTrack` along with the thumb and turns the page on release alone, so `onIndexChange`, the page-turn transition, and page resolution run once for the page the reader settles on instead of at every index the thumb passes over. The reader controls stay held for the length of a drag, so a finger that leaves the toolbar mid-drag does not let them hide.

`PageProgressTrack` remains a display-only `<progress>` element. Compose it in place of the slider for a reading progress that accepts no input, or next to it to paint the two separately:

```tsx
<ComicViewer.Toolbar>
  <ComicViewer.PageProgress>
    <ComicViewer.PageProgressTrack className="progress-bar" />
    <ComicViewer.PageStatus />
  </ComicViewer.PageProgress>
</ComicViewer.Toolbar>
```

Without `default.css`, style the slider through `::-webkit-slider-runnable-track`, `::-moz-range-track`, `::-webkit-slider-thumb`, and `::-moz-range-thumb`. The slider sets `--pcv-page-progress-fill` to the share of the document its thumb rests at, as a percentage, for a track that paints the part behind it.

### Reader setting toggles

`ViewModeToggle`, `ReadingDirectionToggle`, and `PageFitModeToggle` drive the settings `useViewerContext` exposes, so a toolbar does not have to wire the setters and the pressed state by hand. Each is an independent named export that the default `Toolbar` never renders: they reach the tree only where you place them, and a reader that leaves them out pays nothing for them.

Like the navigation buttons they render a semantic `<button>` with a class name and no icon, take their visual content through `children`, and accept `className`, `aria-label`, and an `onClick` that can `preventDefault` to cancel the change.

```tsx
<ComicViewer.Toolbar className="reader-toolbar">
  <ComicViewer.ViewModeToggle>Spread</ComicViewer.ViewModeToggle>
  <ComicViewer.ReadingDirectionToggle />
  <div role="group" aria-label="Page fit">
    <ComicViewer.PageFitModeToggle mode="height" />
    <ComicViewer.PageFitModeToggle mode="width" />
    <ComicViewer.PageFitModeToggle mode="actual" />
  </div>
</ComicViewer.Toolbar>
```

- `ViewModeToggle` switches between `"single"` and `"double"`, and reports the mode through both `aria-pressed` and `data-view-mode`. It disables itself while the viewport is narrower than `doublePageThreshold`, which `useViewMode` reports through `isDoublePageAvailable`, so it never offers a spread the layout would drop again.
- `ReadingDirectionToggle` switches between `"rtl"` and `"ltr"` and reports the current direction through `data-reading-direction`. Neither direction is the pressed state of the other, so its default label names the direction instead.
- `PageFitModeToggle` sets `"height"`, `"width"`, or `"actual"`. Given a `mode` it selects that mode and reports through `aria-pressed` whether it is the current one, which composes into a group you build yourself; given none, a single button cycles through the three. Either way the current mode is on `data-page-fit-mode`.

`default.css` gives them no more than the pill the navigation buttons wear when they sit inside `Toolbar`; style them with your own classes or utilities anywhere else.

Crossing the double-page threshold still sets the view mode, so a narrow viewport falls back to a single page and a wide one returns to a spread. A resize that leaves the threshold on the same side no longer overrides the mode, so a choice made through the toggle survives it.

### Reader control visibility

`Toolbar` and `PageNavigation` share one visibility state. Both start hidden, and a click or tap on the viewport away from the page-turn edges reveals them; a pannable page reveals them from anywhere. Another click, or a two-second pause, hides them again. Pressing <kbd>Enter</kbd> or <kbd>Space</kbd> on the focused viewport does the same from the keyboard. While hidden, both are `inert` and outside the accessibility tree, so their controls cannot be focused or read.

The countdown does not run while a pointer rests on either container or focus sits inside one, so the controls cannot vanish mid-interaction. A touch reports the same hold for the length of the tap, so releasing a button starts a fresh countdown rather than letting a spent one run out.

Read `areControlsVisible` and call `toggleControls` from `useViewerContext` to drive the same state from your own controls, and `holdControls(true)` / `holdControls(false)` in balanced pairs to suspend and restart the countdown around your own container. `PageProgress` also takes a `visible` prop when it needs to hide independently of its container.

`Toolbar` sets `dir` and `data-reading-direction` from the reader's direction, so its controls lay out along the reading direction and the reading progress runs toward the page the reader is heading for: leftward in `rtl`, rightward in `ltr`. `PageProgressTrack` fills that way on its own, and `PageProgressSlider` moves its thumb that way, so a drag toward the next page follows the direction of the page turn.

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
