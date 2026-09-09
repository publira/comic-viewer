import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Dispatch,
  PropsWithChildren,
  ReactNode,
  SetStateAction,
} from "react";

import { DEFAULT_PAGE_RESOLVE_OVERSCAN, usePageSource } from "./page-source";
import type { PageResolveError, PageResolver } from "./page-source";
import type { ViewerPlugin } from "./plugin";
import { extractViewerSlotPages } from "./viewer-slots";

export type ViewMode = "single" | "double";
/** One of the two ends of the reading sequence an extra page is inserted at. */
export type ViewerSlot = "start" | "end";
export type ReadingDirection = "rtl" | "ltr";
/** Controls how a page is sized inside the viewport. */
export type PageFitMode = "width" | "height" | "actual";

export interface ViewerPage {
  height?: number;
  id: string;
  mimeType?: string;
  placeholder?: string;
  title: string;
  src: string;
  width?: number;
}

export interface ViewerContextValue<TPage extends ViewerPage = ViewerPage> {
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
  currentIndex: number;
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
   * clearing the zoom scale and the pan offset a gesture left on it. It is
   * the one write operation the zoom state offers: zooming in and out stays
   * with the viewport gestures.
   */
  resetZoom: () => void;
  goToNext: () => void;
  goToPrev: () => void;
  goTo: (index: number) => void;
}

/**
 * How long the document is. A viewer needs `pages`, `pageCount`, or both,
 * because one given nothing but a `resolvePage` function would have no idea
 * how many pages to resolve.
 */
export type ViewerPageListProps<TPage extends ViewerPage = ViewerPage> =
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

export interface ViewerOptionsProps<TPage extends ViewerPage = ViewerPage> {
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
  /** Called when `resolvePage` rejects for a page. */
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
  initialViewMode?: ViewMode;
  /** The initial page sizing mode. Defaults to fit-to-height. */
  initialPageFitMode?: PageFitMode;
  initialReadingDirection?: ReadingDirection;
  /**
   * The page every double-page spread is counted from. Every page before it is
   * shown on its own. The lowest value it takes is `minIndex`, the first start
   * page the viewer holds, so a negative value pairs the start pages with each
   * other and with the first page of the document.
   */
  spreadStartIndex?: number;
}

export type ViewerProviderProps<TPage extends ViewerPage = ViewerPage> =
  PropsWithChildren<ViewerPageListProps<TPage> & ViewerOptionsProps<TPage>>;

const ViewerContext = createContext<ViewerContextValue | null>(null);

/**
 * The pan offset and zoom scale one spread carries. `key` names the spread
 * and the fit mode the gesture was made in, so a state left over from another
 * one falls back to the resting position instead of being applied to a spread
 * it was never meant for.
 */
export interface ViewportZoomState {
  key: string;
  panX: number;
  panY: number;
  scale: number;
}

/** The position every spread starts from, and the one `resetZoom` restores. */
export const RESTING_VIEWPORT_ZOOM: ViewportZoomState = {
  key: "",
  panX: 0,
  panY: 0,
  scale: 1,
};

/** Names the spread and fit mode a zoom state belongs to. */
export const getViewportZoomKey = (
  currentIndex: number,
  pageFitMode: PageFitMode
): string => `${currentIndex}:${pageFitMode}`;

interface ViewportZoomStore {
  setZoom: Dispatch<SetStateAction<ViewportZoomState>>;
  zoom: ViewportZoomState;
}

const ViewportZoomContext = createContext<ViewportZoomStore | null>(null);

/**
 * Reads the zoom state the provider holds on behalf of the viewport. It stays
 * inside the library, because the viewport is the only thing that writes it:
 * a consumer reads `zoomScale` and calls `resetZoom` on the viewer context.
 */
export const useViewportZoomStore = (): ViewportZoomStore => {
  const store = useContext(ViewportZoomContext);

  if (store === null) {
    throw new Error(
      "The viewport zoom state must be read within a ViewerProvider"
    );
  }

  return store;
};

const EMPTY_PAGES: readonly never[] = [];
const EMPTY_PLUGINS: readonly ViewerPlugin[] = [];
const CONTROLS_HIDE_DELAY_MS = 2000;
/**
 * The index of the start page nearest the first page of the document, which
 * is the last StartPage written among the children of the viewer. A viewer
 * holding several of them fills the indexes below it as well, down to
 * `minIndex`, so this is no longer the index such a viewer opens on.
 */
export const START_PAGE_INDEX = -1;
const DEFAULT_END_REACHED_THRESHOLD = 2;

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.trunc(value)));
};

/** The extra pages a viewer holds at the ends of its reading sequence. */
export interface ViewerSlotPages {
  endPages: readonly ReactNode[];
  startPages: readonly ReactNode[];
}

/** One of the extra pages, together with its place among the slot it fills. */
export interface ViewerSlotPage {
  /** How many pages the slot holds. */
  count: number;
  /** The content written for this position of the slot. */
  page: ReactNode;
  /** The one-based position the page takes among the pages of its slot. */
  position: number;
  slot: ViewerSlot;
}

/**
 * Returns the extra page a navigable index addresses, or `undefined` for an
 * index that addresses a page of the document. The start pages take the
 * indexes below the page list, `-1` being the last one written, and the end
 * pages the indexes above it, `pageCount` being the first one written, so the
 * reading order follows the order they are written in.
 */
export const getSlotPage = (
  index: number,
  pageCount: number,
  { endPages, startPages }: ViewerSlotPages
): ViewerSlotPage | undefined => {
  if (index < 0) {
    const position = startPages.length + index + 1;

    return position < 1
      ? undefined
      : {
          count: startPages.length,
          page: startPages[position - 1],
          position,
          slot: "start",
        };
  }

  if (index < pageCount) {
    return undefined;
  }

  const position = index - pageCount + 1;

  return position > endPages.length
    ? undefined
    : {
        count: endPages.length,
        page: endPages[position - 1],
        position,
        slot: "end",
      };
};

/**
 * Returns the slot a navigable index belongs to, or `undefined` for an index
 * that addresses a page of the document.
 */
export const getPageSlot = (
  index: number,
  pageCount: number,
  slotPages: ViewerSlotPages
): ViewerSlot | undefined => getSlotPage(index, pageCount, slotPages)?.slot;

/**
 * Returns the index the viewer steps back to, or `undefined` on the first
 * index it holds. A double-page step lands on the page that starts the
 * previous spread, and stops at `spreadStartIndex` rather than stepping over
 * it, so an index the spreads are not counted from still passes through the
 * pages before them one at a time.
 */
export const getPreviousSpreadIndex = (
  currentIndex: number,
  minIndex: number,
  spreadStartIndex: number,
  viewMode: ViewMode
): number | undefined => {
  if (currentIndex <= minIndex) {
    return undefined;
  }

  if (viewMode === "double" && currentIndex > spreadStartIndex) {
    return Math.max(spreadStartIndex, currentIndex - 2);
  }

  return currentIndex - 1;
};

/**
 * Returns the index the reading position lands on for `index`. A double-page
 * spread is addressed by the page it starts from, so an index that falls on
 * the facing page of a spread is pulled back to the page that opens it, while
 * the pages before `spreadStartIndex` keep the index of their own.
 */
export const getSpreadIndex = (
  index: number,
  minIndex: number,
  maxIndex: number,
  spreadStartIndex: number,
  viewMode: ViewMode
): number => {
  const clampedIndex = clamp(index, minIndex, maxIndex);

  if (viewMode !== "double" || clampedIndex <= spreadStartIndex) {
    return clampedIndex;
  }

  return (
    spreadStartIndex + Math.floor((clampedIndex - spreadStartIndex) / 2) * 2
  );
};

export const getVisiblePageCount = (
  viewMode: ViewMode,
  currentIndex: number,
  maxIndex: number,
  spreadStartIndex: number
): number =>
  viewMode === "double" &&
  currentIndex >= spreadStartIndex &&
  currentIndex < maxIndex
    ? 2
    : 1;

export const ViewerProvider = <TPage extends ViewerPage>({
  pages = EMPTY_PAGES,
  pageCount,
  resolvePage,
  pageResolveOverscan = DEFAULT_PAGE_RESOLVE_OVERSCAN,
  onPageResolveError,
  onEndReached,
  endReachedThreshold = DEFAULT_END_REACHED_THRESHOLD,
  plugins = EMPTY_PLUGINS,
  children,
  currentIndex: controlledIndex,
  initialIndex,
  onIndexChange,
  initialViewMode = "single",
  initialPageFitMode = "height",
  initialReadingDirection = "rtl",
  spreadStartIndex = 0,
}: ViewerProviderProps<TPage>) => {
  // A StartPage or an EndPage written among the children belongs to the
  // viewport rather than to the place it stands in, so it is taken out of the
  // tree here and rendered from the context instead.
  const {
    children: viewerChildren,
    endPages,
    startPages,
  } = extractViewerSlotPages(children);
  const totalPageCount = clamp(
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
  const clampedSpreadStartIndex = clamp(
    spreadStartIndex,
    minIndex,
    totalPageCount
  );
  const [uncontrolledIndex, setUncontrolledIndex] = useState(() =>
    clamp(initialIndex ?? minIndex, minIndex, maxIndex)
  );
  const clampedCurrentIndex = clamp(
    controlledIndex ?? uncontrolledIndex,
    minIndex,
    maxIndex
  );
  const sourcePages = usePageSource({
    currentIndex: clampedCurrentIndex,
    onPageResolveError,
    overscan: clamp(pageResolveOverscan, 0, Number.MAX_SAFE_INTEGER),
    pageCount: totalPageCount,
    pages,
    resolvePage,
  });

  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

  // Nothing has measured the viewport yet, so a spread is taken to be within
  // reach until a hook that watches the width says otherwise.
  const [isDoublePageAvailable, setIsDoublePageAvailable] = useState(true);

  const [pageFitMode, setPageFitMode] =
    useState<PageFitMode>(initialPageFitMode);

  const [readingDirection, setReadingDirection] = useState<ReadingDirection>(
    initialReadingDirection
  );

  // The viewport gestures write the zoom state, but it lives here so that the
  // context can carry the scale and offer the reset a consumer builds on.
  const [zoom, setZoom] = useState<ViewportZoomState>(RESTING_VIEWPORT_ZOOM);
  const zoomStore = useMemo(() => ({ setZoom, zoom }), [zoom]);
  const resetZoom = useCallback(() => {
    setZoom(RESTING_VIEWPORT_ZOOM);
  }, []);

  const [areControlsVisible, setAreControlsVisible] = useState(false);
  const [controlsHoldCount, setControlsHoldCount] = useState(0);
  const toggleControls = useCallback(() => {
    setAreControlsVisible((areVisible) => !areVisible);
  }, []);
  const holdControls = useCallback((held: boolean) => {
    setControlsHoldCount((count) => Math.max(0, count + (held ? 1 : -1)));
  }, []);
  // A held control keeps its countdown from running at all, so releasing the
  // hold starts a whole fresh window rather than resuming a spent one.
  useEffect(() => {
    if (!areControlsVisible || controlsHoldCount > 0) {
      return;
    }

    const hideTimeout = setTimeout(() => {
      setAreControlsVisible(false);
    }, CONTROLS_HIDE_DELAY_MS);

    return () => {
      clearTimeout(hideTimeout);
    };
  }, [areControlsVisible, controlsHoldCount]);

  const goTo = useCallback(
    (index: number) => {
      const nextIndex = clamp(index, minIndex, maxIndex);
      if (nextIndex === clampedCurrentIndex) {
        return;
      }

      if (controlledIndex === undefined) {
        setUncontrolledIndex(nextIndex);
      }
      onIndexChange?.(nextIndex);
    },
    [clampedCurrentIndex, controlledIndex, maxIndex, minIndex, onIndexChange]
  );

  const goToNext = useCallback(() => {
    const nextIndex =
      clampedCurrentIndex +
      getVisiblePageCount(
        viewMode,
        clampedCurrentIndex,
        maxIndex,
        clampedSpreadStartIndex
      );
    if (nextIndex <= maxIndex) {
      goTo(nextIndex);
    }
  }, [clampedCurrentIndex, clampedSpreadStartIndex, goTo, maxIndex, viewMode]);

  const goToPrev = useCallback(() => {
    const previousIndex = getPreviousSpreadIndex(
      clampedCurrentIndex,
      minIndex,
      clampedSpreadStartIndex,
      viewMode
    );
    if (previousIndex !== undefined) {
      goTo(previousIndex);
    }
  }, [clampedCurrentIndex, clampedSpreadStartIndex, goTo, minIndex, viewMode]);

  // A page count that has already been reported is not reported again, so a
  // consumer that has nothing more to append is not asked in a loop.
  const onEndReachedRef = useRef(onEndReached);
  const reportedEndPageCountRef = useRef<number | null>(null);

  useEffect(() => {
    onEndReachedRef.current = onEndReached;
  }, [onEndReached]);

  useEffect(() => {
    const remainingPageCount = totalPageCount - (clampedCurrentIndex + 1);
    if (
      totalPageCount === 0 ||
      remainingPageCount >
        clamp(endReachedThreshold, 0, Number.MAX_SAFE_INTEGER)
    ) {
      return;
    }

    if (reportedEndPageCountRef.current === totalPageCount) {
      return;
    }

    reportedEndPageCountRef.current = totalPageCount;
    onEndReachedRef.current?.();
  }, [clampedCurrentIndex, endReachedThreshold, totalPageCount]);

  // A zoom state left on another spread, or on the same spread under another
  // fit mode, no longer applies, so the scale reads as unzoomed again.
  const zoomScale =
    zoom.key === getViewportZoomKey(clampedCurrentIndex, pageFitMode)
      ? zoom.scale
      : 1;

  const value = useMemo<ViewerContextValue<TPage>>(
    () => ({
      areControlsVisible,
      currentIndex: clampedCurrentIndex,
      endPages,
      goTo,
      goToNext,
      goToPrev,
      holdControls,
      isDoublePageAvailable,
      maxIndex,
      minIndex,
      pageCount: totalPageCount,
      pageFitMode,
      pages: sourcePages,
      plugins,
      readingDirection,
      resetZoom,
      setDoublePageAvailable: setIsDoublePageAvailable,
      setPageFitMode,
      setReadingDirection,
      setViewMode,
      spreadStartIndex: clampedSpreadStartIndex,
      startPages,
      toggleControls,
      viewMode,
      zoomScale,
    }),
    [
      areControlsVisible,
      endPages,
      isDoublePageAvailable,
      maxIndex,
      minIndex,
      sourcePages,
      startPages,
      totalPageCount,
      plugins,
      clampedCurrentIndex,
      clampedSpreadStartIndex,
      holdControls,
      toggleControls,
      viewMode,
      pageFitMode,
      readingDirection,
      goTo,
      goToNext,
      goToPrev,
      resetZoom,
      zoomScale,
    ]
  );

  return (
    <ViewerContext.Provider value={value}>
      <ViewportZoomContext.Provider value={zoomStore}>
        {viewerChildren}
      </ViewportZoomContext.Provider>
    </ViewerContext.Provider>
  );
};

export const useViewerContext = <
  TPage extends ViewerPage,
>(): ViewerContextValue<TPage> => {
  const context = useContext(ViewerContext);

  if (context === null) {
    throw new Error("useViewerContext must be used within a ViewerProvider");
  }

  return context as ViewerContextValue<TPage>;
};
