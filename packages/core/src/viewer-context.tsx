import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PropsWithChildren, ReactNode } from "react";

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
   * The lowest index navigation reaches. It is `START_PAGE_INDEX` while the
   * viewer holds a start page, and `0` otherwise.
   */
  minIndex: number;
  /**
   * The highest index navigation reaches. It is `pageCount` while the viewer
   * holds an end page, and `pageCount - 1` otherwise, so an index outside the
   * page list belongs to a slot page rather than to `pages`.
   */
  maxIndex: number;
  /** The StartPage found among the viewer children, if it was given one. */
  startPage?: ReactNode;
  /** The EndPage found among the viewer children, if it was given one. */
  endPage?: ReactNode;
  plugins: readonly ViewerPlugin[];
  currentIndex: number;
  viewMode: ViewMode;
  pageFitMode: PageFitMode;
  readingDirection: ReadingDirection;
  spreadStartIndex: number;
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
  setPageFitMode: (mode: PageFitMode) => void;
  setReadingDirection: (direction: ReadingDirection) => void;
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
   * shown on its own. The lowest value it takes is `START_PAGE_INDEX`, which a
   * viewer holding a start page accepts to pair that page with the first page
   * of the document.
   */
  spreadStartIndex?: number;
}

export type ViewerProviderProps<TPage extends ViewerPage = ViewerPage> =
  PropsWithChildren<ViewerPageListProps<TPage> & ViewerOptionsProps<TPage>>;

const ViewerContext = createContext<ViewerContextValue | null>(null);
const EMPTY_PAGES: readonly never[] = [];
const EMPTY_PLUGINS: readonly ViewerPlugin[] = [];
const CONTROLS_HIDE_DELAY_MS = 2000;
/** The index the extra page shown before the first page occupies. */
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
  endPage?: ReactNode;
  startPage?: ReactNode;
}

/**
 * Returns the slot a navigable index belongs to, or `undefined` for an index
 * that addresses a page of the document. An index outside the page list
 * belongs to a slot only while the viewer holds the page that fills it.
 */
export const getPageSlot = (
  index: number,
  pageCount: number,
  { endPage, startPage }: ViewerSlotPages
): ViewerSlot | undefined => {
  if (index < 0) {
    return startPage === undefined ? undefined : "start";
  }

  if (index < pageCount) {
    return undefined;
  }

  return endPage === undefined ? undefined : "end";
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
    endPage,
    startPage,
  } = extractViewerSlotPages(children);
  const totalPageCount = clamp(
    pageCount ?? pages.length,
    0,
    Number.MAX_SAFE_INTEGER
  );
  // A slot page sits outside the page list, so it takes the index next to the
  // end of the list it belongs to rather than one of its own.
  const minIndex = startPage === undefined ? 0 : START_PAGE_INDEX;
  const maxIndex = Math.max(
    minIndex,
    totalPageCount - (endPage === undefined ? 1 : 0)
  );
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

  const [pageFitMode, setPageFitMode] =
    useState<PageFitMode>(initialPageFitMode);

  const [readingDirection, setReadingDirection] = useState<ReadingDirection>(
    initialReadingDirection
  );

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
    goTo(
      clampedCurrentIndex -
        (viewMode === "double" && clampedCurrentIndex > clampedSpreadStartIndex
          ? 2
          : 1)
    );
  }, [clampedCurrentIndex, clampedSpreadStartIndex, goTo, viewMode]);

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

  const value = useMemo<ViewerContextValue<TPage>>(
    () => ({
      areControlsVisible,
      currentIndex: clampedCurrentIndex,
      endPage,
      goTo,
      goToNext,
      goToPrev,
      holdControls,
      maxIndex,
      minIndex,
      pageCount: totalPageCount,
      pageFitMode,
      pages: sourcePages,
      plugins,
      readingDirection,
      setPageFitMode,
      setReadingDirection,
      setViewMode,
      spreadStartIndex: clampedSpreadStartIndex,
      startPage,
      toggleControls,
      viewMode,
    }),
    [
      areControlsVisible,
      endPage,
      maxIndex,
      minIndex,
      sourcePages,
      startPage,
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
    ]
  );

  return (
    <ViewerContext.Provider value={value}>
      {viewerChildren}
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
