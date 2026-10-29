import { createContext, useContext, useMemo, useState } from "react";
import type {
  Dispatch,
  JSX,
  PropsWithChildren,
  ReactNode,
  SetStateAction,
} from "react";

import { clampInteger } from "./clamp-integer";
import {
  DEFAULT_PAGE_RESOLVE_OVERSCAN,
  PageResolveStoreProvider,
  usePageSource,
} from "./page-source";
import type { PageResolveError, PageResolver } from "./page-source";
import type { ViewerPlugin } from "./plugin";
import { useControllableSetting } from "./use-controllable-setting";
import { useEndReached } from "./use-end-reached";
import { useReaderControls } from "./use-reader-controls";
import {
  useScrubPosition,
  useSpreadNavigation,
  useViewerIndex,
} from "./use-viewer-navigation";
import { extractViewerSlotPages } from "./viewer-slot-pages";
import {
  MAX_ZOOM_SCALE,
  MIN_ZOOM_SCALE,
  ViewportZoomContext,
  useViewerZoom,
} from "./viewer-zoom";
import type { ZoomFocalPoint } from "./viewer-zoom";

export type ViewMode = "single" | "double";

/** One of the two ends of the reading sequence an extra page is inserted at. */
export type ViewerSlot = "start" | "end";

export type ReadingDirection = "rtl" | "ltr";

/** Controls how a page is sized inside the viewport. */
export type PageFitMode = "width" | "height" | "actual";

/**
 * How much of a printed sheet the image of a page covers. A `"spread"` page
 * is a whole two-page spread delivered as one landscape image, as EPUB fixed
 * layout expresses with `rendition:page-spread-center`. Defaults to
 * `"single"`.
 */
export type PageLayout = "single" | "spread";

/**
 * What the viewer needs to know about any page: its identity, its accessible
 * name, and how it is laid out. A page without an image, drawn by
 * `renderPage`, needs nothing more.
 */
export interface PageMetadata {
  height?: number;
  id: string;
  /**
   * Whether the page covers one page or a whole two-page spread. A spread
   * page takes a page set to itself in double-page mode instead of being
   * squeezed into one half, and is shown whole in single-page mode.
   */
  layout?: PageLayout;
  title: string;
  width?: number;
}

/** A page whose image the viewer loads and draws itself. */
export interface ImagePage extends PageMetadata {
  mimeType?: string;
  placeholder?: string;
  src: string;
  /**
   * Further renditions of the page image, in the HTML `srcset` microsyntax
   * with `w` or `x` descriptors, such as `"p@800w.jpg 800w, p@1600w.jpg
   * 1600w"`. The viewer picks the candidate nearest the size it draws the
   * page at, and falls back to `src` when the list is absent or yields none.
   */
  srcset?: string;
}

/** A page of the built-in image viewer, the same type as `ImagePage`. */
export type ViewerPage = ImagePage;

export interface ViewerContextValue<TPage extends PageMetadata = ViewerPage> {
  /**
   * The page list, holding one entry per page of the document. An entry is
   * `undefined` while a page provided by `resolvePage` is still unresolved.
   */
  pages: readonly (TPage | undefined)[];
  /** The total number of pages, including the ones not resolved yet. */
  pageCount: number;
  /**
   * The lowest index navigation reaches. It is the negated number of start
   * pages the viewer holds, and `0` while it holds none.
   */
  minIndex: number;
  /**
   * The highest index navigation reaches. It is `pageCount - 1` plus the
   * number of end pages the viewer holds, so an index outside the page list
   * belongs to a slot page rather than to `pages`.
   */
  maxIndex: number;
  /** The StartPage children of the viewer, in the order they are written. */
  startPages: readonly ReactNode[];
  /** The EndPage children of the viewer, in the order they are written. */
  endPages: readonly ReactNode[];
  plugins: readonly ViewerPlugin[];
  /**
   * How many spreads beyond the ones the viewport can render have their
   * images fetched and decoded ahead of the reader in each direction.
   */
  imagePreloadSpreads: number;
  currentIndex: number;
  /**
   * Where a scrub, such as a drag of PageProgressSlider, rests, in navigable
   * indices and anywhere between two of them, or `null` while no scrub is in
   * progress. The viewport follows it continuously, showing the part of the
   * next spread the position has moved into, without committing it as the
   * reading position, so `onIndexChange` is not called for it.
   */
  scrubPosition: number | null;
  viewMode: ViewMode;
  pageFitMode: PageFitMode;
  readingDirection: ReadingDirection;
  /**
   * The zoom scale the viewport gestures have left on the current spread, and
   * `1` while it rests at the size its fit mode gives it. It belongs to the
   * spread rather than to the reader, so turning the page or changing the fit
   * mode returns it to `1`.
   */
  zoomScale: number;
  /** The lowest zoom scale a pinch or `setZoomScale` reaches. */
  minZoomScale: number;
  /** The highest zoom scale a pinch or `setZoomScale` reaches. */
  maxZoomScale: number;
  spreadStartIndex: number;
  /**
   * Whether the viewport is wide enough for a double-page spread, which
   * `useViewMode` reports as it observes the viewport. It stays `true` for a
   * reader that never runs that hook, so a control such as ViewModeToggle can
   * disable itself rather than offer a mode the layout would drop again.
   */
  isDoublePageAvailable: boolean;
  /** Whether the reader controls, such as Toolbar and PageNavigation, show. */
  areControlsVisible: boolean;
  /**
   * Reveals the reader controls, or hides them again. Revealed controls hide
   * themselves once the reader stops interacting with them.
   */
  toggleControls: () => void;
  /**
   * Suspends the auto-hide countdown while `held` is true, for a pointer that
   * rests on a control or focus that sits inside one. Releasing every hold
   * restarts the countdown, which also gives a tapped control a fresh window.
   * Calls must be balanced.
   */
  holdControls: (held: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  /**
   * Reports whether the viewport can show a double-page spread. `useViewMode`
   * calls it, and so does a consumer that measures the viewport itself.
   */
  setDoublePageAvailable: (available: boolean) => void;
  setPageFitMode: (mode: PageFitMode) => void;
  setReadingDirection: (direction: ReadingDirection) => void;
  /**
   * Returns the current spread to the resting position of its fit mode,
   * clearing the zoom scale and the pan offset a gesture left on it.
   */
  resetZoom: () => void;
  /**
   * Zooms the current spread to `scale`, held within `minZoomScale` and
   * `maxZoomScale`. The point at `focalPoint`, in client coordinates such as
   * those of a wheel event, stays where it is, and the centre of the viewport
   * does without one. The pan offset stays within the bounds a pinch keeps it
   * in. Nothing changes while a scrub is in progress or no Viewport is
   * rendered.
   */
  setZoomScale: (scale: number, focalPoint?: ZoomFocalPoint) => void;
  goToNext: () => void;
  goToPrev: () => void;
  goTo: (index: number) => void;
  /**
   * Moves the viewport to a scrub position without navigating to it, or
   * returns it to `currentIndex` given `null`. A scrub commits the spread it
   * ends nearest to with `goTo`.
   */
  setScrubPosition: (position: number | null) => void;
}

/**
 * How long the document is. A viewer needs `pages`, `pageCount`, or both,
 * because one given nothing but a `resolvePage` function would have no idea
 * how many pages to resolve.
 */
export type ViewerPageListProps<TPage extends PageMetadata = ViewerPage> =
  | {
      /** The pages of the document, known upfront. */
      pages: readonly (TPage | undefined)[];
      /**
       * The total number of pages. Defaults to the length of `pages`, and is
       * required when `resolvePage` provides pages that `pages` omits.
       */
      pageCount?: number;
    }
  | {
      /**
       * The pages known upfront, if any. The rest are left to `resolvePage`.
       */
      pages?: readonly (TPage | undefined)[];
      /** The total number of pages, resolved and unresolved alike. */
      pageCount: number;
    };

export interface ViewerOptionsProps<TPage extends PageMetadata = ViewerPage> {
  /**
   * Resolves the metadata of a page the reader is approaching. The viewer
   * asks only for pages within `pageResolveOverscan` of the current one, and
   * forgets a page once it is further away than both that window and the
   * pages the viewport can render, so a page returned to much later is
   * resolved again with a fresh URL.
   */
  resolvePage?: PageResolver<TPage>;
  /**
   * How many pages on either side of the current one are asked for ahead of
   * the reader. It decides which pages are requested, not how long a resolved
   * page keeps its metadata: a page the viewport can still render keeps it
   * however narrow this window is.
   */
  pageResolveOverscan?: number;
  /**
   * How many spreads beyond the ones the viewport can render have their
   * images fetched and decoded ahead of the reader in each direction.
   * Defaults to `0`, which loads nothing the viewport cannot show. A
   * preloaded image is kept until it leaves this wider window, and its load
   * is queued behind the spreads on screen, so preloading never delays the
   * page the reader is waiting for.
   */
  imagePreloadSpreads?: number;
  /**
   * Called when `resolvePage` rejects for a page. The page stays unresolved
   * until `usePageResolveState(index).retry` asks for it again.
   */
  onPageResolveError?: (error: PageResolveError) => void;
  /**
   * Called once the current page comes within `endReachedThreshold` pages of
   * the end, so that a longer list can be appended. It is called again only
   * after the page count changes.
   */
  onEndReached?: () => void;
  /** How close to the last page `onEndReached` is called. Defaults to 2. */
  endReachedThreshold?: number;
  plugins?: readonly ViewerPlugin[];
  /**
   * The controlled zero-based page index. When omitted, the viewer manages
   * its own index, starting from `initialIndex`.
   */
  currentIndex?: number;
  initialIndex?: number;
  /** Called when navigation requests a different zero-based page index. */
  onIndexChange?: (index: number) => void;
  /**
   * The controlled view mode. When omitted, the viewer manages its own mode,
   * starting from `initialViewMode`. A controlled mode is not switched as the
   * viewport crosses its double-page threshold; a `"double"` one is shown as
   * single pages while a spread does not fit.
   */
  viewMode?: ViewMode;
  initialViewMode?: ViewMode;
  /** Called when a control or `setViewMode` requests a different view mode. */
  onViewModeChange?: (mode: ViewMode) => void;
  /**
   * The controlled page sizing mode. When omitted, the viewer manages its own
   * mode, starting from `initialPageFitMode`.
   */
  pageFitMode?: PageFitMode;
  /** The initial page sizing mode. Defaults to fit-to-height. */
  initialPageFitMode?: PageFitMode;
  /**
   * Called when a control, a gesture, or `setPageFitMode` requests a different
   * page sizing mode.
   */
  onPageFitModeChange?: (mode: PageFitMode) => void;
  /**
   * The controlled reading direction. When omitted, the viewer manages its own
   * direction, starting from `initialReadingDirection`.
   */
  readingDirection?: ReadingDirection;
  initialReadingDirection?: ReadingDirection;
  /**
   * Called when a control or `setReadingDirection` requests a different
   * reading direction.
   */
  onReadingDirectionChange?: (direction: ReadingDirection) => void;
  /**
   * The page every double-page spread is counted from. Every page before it is
   * shown on its own. The lowest value it takes is `minIndex`, the first start
   * page the viewer holds, so a negative value pairs the start pages with each
   * other and with the first page of the document.
   */
  spreadStartIndex?: number;
}

export type ViewerProviderProps<TPage extends PageMetadata = ViewerPage> =
  PropsWithChildren<ViewerPageListProps<TPage> & ViewerOptionsProps<TPage>>;

const ViewerContext = createContext<ViewerContextValue<PageMetadata> | null>(
  null
);

// Only an uncontrolled mode follows the viewport width, so the switch
// `useViewMode` makes writes the local state and reports nothing.
const ViewModeSwitchContext = createContext<Dispatch<
  SetStateAction<ViewMode>
> | null>(null);

/** Reads the setter `useViewMode` switches an uncontrolled view mode with. */
export const useViewModeSwitch = (): Dispatch<SetStateAction<ViewMode>> => {
  const switchViewMode = useContext(ViewModeSwitchContext);

  if (switchViewMode === null) {
    throw new Error("useViewMode must be used within a ViewerProvider");
  }

  return switchViewMode;
};

const EMPTY_PAGES: readonly never[] = [];
const EMPTY_PLUGINS: readonly ViewerPlugin[] = [];

const DEFAULT_END_REACHED_THRESHOLD = 2;
const DEFAULT_IMAGE_PRELOAD_SPREADS = 0;

export const ViewerProvider = <TPage extends PageMetadata>({
  pages = EMPTY_PAGES,
  pageCount,
  resolvePage,
  pageResolveOverscan = DEFAULT_PAGE_RESOLVE_OVERSCAN,
  imagePreloadSpreads = DEFAULT_IMAGE_PRELOAD_SPREADS,
  onPageResolveError,
  onEndReached,
  endReachedThreshold = DEFAULT_END_REACHED_THRESHOLD,
  plugins = EMPTY_PLUGINS,
  children,
  currentIndex: controlledIndex,
  initialIndex,
  onIndexChange,
  viewMode: controlledViewMode,
  initialViewMode = "single",
  onViewModeChange,
  pageFitMode: controlledPageFitMode,
  initialPageFitMode = "height",
  onPageFitModeChange,
  readingDirection: controlledReadingDirection,
  initialReadingDirection = "rtl",
  onReadingDirectionChange,
  spreadStartIndex = 0,
}: ViewerProviderProps<TPage>): JSX.Element => {
  // A StartPage or an EndPage written among the children belongs to the
  // viewport rather than to the place it stands in, so it is taken out of the
  // tree here and rendered from the context instead.
  const {
    children: viewerChildren,
    endPages,
    startPages,
  } = extractViewerSlotPages(children);

  const totalPageCount = clampInteger(
    pageCount ?? pages.length,
    0,
    Number.MAX_SAFE_INTEGER
  );

  // A slot page sits outside the page list, so the pages of a slot take the
  // indexes running away from the end of the list they belong to rather than
  // indexes of their own.
  // Subtracting from zero rather than negating the count keeps a viewer
  // holding no start page on `0` instead of the `-0` negation would give.
  const minIndex = 0 - startPages.length;
  const maxIndex = Math.max(minIndex, totalPageCount - 1 + endPages.length);

  const clampedSpreadStartIndex = clampInteger(
    spreadStartIndex,
    minIndex,
    totalPageCount
  );

  const { currentIndex, goTo } = useViewerIndex({
    controlledIndex,
    initialIndex,
    maxIndex,
    minIndex,
    onIndexChange,
  });

  const { scrubPosition, setScrubPosition } = useScrubPosition(
    minIndex,
    maxIndex
  );

  // The pages around the position a scrub rests at are the ones on screen, so
  // they are the ones resolved, whatever reading position the host holds.
  const viewIndex =
    scrubPosition === null ? currentIndex : Math.round(scrubPosition);

  const { pages: sourcePages, resolveStore } = usePageSource({
    currentIndex: viewIndex,
    onPageResolveError,
    overscan: clampInteger(pageResolveOverscan, 0, Number.MAX_SAFE_INTEGER),
    pageCount: totalPageCount,
    pages,
    resolvePage,
  });

  const clampedImagePreloadSpreads = clampInteger(
    imagePreloadSpreads,
    0,
    Number.MAX_SAFE_INTEGER
  );

  const {
    setUncontrolledValue: switchViewMode,
    setValue: setViewMode,
    value: requestedViewMode,
  } = useControllableSetting(
    controlledViewMode,
    initialViewMode,
    onViewModeChange
  );

  // Nothing has measured the viewport yet, so a spread is taken to be within
  // reach until a hook that watches the width says otherwise.
  const [isDoublePageAvailable, setIsDoublePageAvailable] = useState(true);

  // A controlled mode is never rewritten for the width, so the fallback to
  // single pages happens here instead.
  const viewMode: ViewMode =
    controlledViewMode === "double" && !isDoublePageAvailable
      ? "single"
      : requestedViewMode;

  const { setValue: setPageFitMode, value: pageFitMode } =
    useControllableSetting(
      controlledPageFitMode,
      initialPageFitMode,
      onPageFitModeChange
    );

  const { setValue: setReadingDirection, value: readingDirection } =
    useControllableSetting(
      controlledReadingDirection,
      initialReadingDirection,
      onReadingDirectionChange
    );

  const { resetZoom, setZoomScale, zoomScale, zoomStore } = useViewerZoom({
    currentIndex,
    isScrubbing: scrubPosition !== null,
    pageFitMode,
  });

  const { areControlsVisible, holdControls, toggleControls } =
    useReaderControls();

  const { goToNext, goToPrev } = useSpreadNavigation({
    currentIndex,
    goTo,
    maxIndex,
    minIndex,
    pages: sourcePages,
    spreadStartIndex: clampedSpreadStartIndex,
    viewMode,
  });

  useEndReached({
    currentIndex,
    endReachedThreshold,
    onEndReached,
    pageCount: totalPageCount,
  });

  const value = useMemo<ViewerContextValue<TPage>>(
    () => ({
      areControlsVisible,
      currentIndex,
      endPages,
      goTo,
      goToNext,
      goToPrev,
      holdControls,
      imagePreloadSpreads: clampedImagePreloadSpreads,
      isDoublePageAvailable,
      maxIndex,
      maxZoomScale: MAX_ZOOM_SCALE,
      minIndex,
      minZoomScale: MIN_ZOOM_SCALE,
      pageCount: totalPageCount,
      pageFitMode,
      pages: sourcePages,
      plugins,
      readingDirection,
      resetZoom,
      scrubPosition,
      setDoublePageAvailable: setIsDoublePageAvailable,
      setPageFitMode,
      setReadingDirection,
      setScrubPosition,
      setViewMode,
      setZoomScale,
      spreadStartIndex: clampedSpreadStartIndex,
      startPages,
      toggleControls,
      viewMode,
      zoomScale,
    }),
    [
      areControlsVisible,
      clampedImagePreloadSpreads,
      endPages,
      isDoublePageAvailable,
      maxIndex,
      minIndex,
      sourcePages,
      startPages,
      totalPageCount,
      plugins,
      currentIndex,
      scrubPosition,
      clampedSpreadStartIndex,
      holdControls,
      setScrubPosition,
      toggleControls,
      viewMode,
      pageFitMode,
      readingDirection,
      setPageFitMode,
      setReadingDirection,
      setViewMode,
      goTo,
      goToNext,
      goToPrev,
      resetZoom,
      setZoomScale,
      zoomScale,
    ]
  );

  return (
    <ViewerContext.Provider value={value}>
      <ViewModeSwitchContext.Provider value={switchViewMode}>
        <ViewportZoomContext.Provider value={zoomStore}>
          <PageResolveStoreProvider value={resolveStore}>
            {viewerChildren}
          </PageResolveStoreProvider>
        </ViewportZoomContext.Provider>
      </ViewModeSwitchContext.Provider>
    </ViewerContext.Provider>
  );
};

export const useViewerContext = <
  TPage extends PageMetadata = ViewerPage,
>(): ViewerContextValue<TPage> => {
  const context = useContext(ViewerContext);

  if (context === null) {
    throw new Error("useViewerContext must be used within a ViewerProvider");
  }

  // SAFETY: the caller names the page type of the ViewerProvider above it,
  // which React context cannot carry.
  return context as ViewerContextValue<TPage>;
};
