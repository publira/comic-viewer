import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import type { RefObject, TransitionEvent as ReactTransitionEvent } from "react";

import { isAvailable } from "./browser-api";
import { getPageRequirement } from "./page-image-request";
import type { PageLoadError } from "./page-load";
import { runPageChangeHooks } from "./plugin";
import type { ViewerPlugin } from "./plugin";
import { getPageImageKey, useViewportImages } from "./use-viewport-images";
import type { PageImage, PageLoadEntry } from "./use-viewport-images";
import {
  getNextSpreadIndex,
  getPageTurnDirection,
  getVisibleIndices,
  useViewportLayout,
} from "./use-viewport-layout";
import type { PageTurnDirection } from "./use-viewport-layout";
import { useViewportSize } from "./use-viewport-size";
import type { PageFitMode, ViewerPage, ViewMode } from "./viewer-context";
import { getPreviousSpreadIndex } from "./viewer-spreads";
import type { ScrubSpread } from "./viewer-spreads";

const PAGE_TURN_FALLBACK_DURATION_MS = 320;
const PAGE_TURN_IMAGE_WAIT_TIMEOUT_MS = 1200;

interface PageTurnTransition {
  /**
   * The side the spread on screen leaves by, or `undefined` for a transition
   * that returns the rail to rest on the spread it already shows.
   */
  direction?: PageTurnDirection;
  id: number;
  phase: "waiting" | "prepared" | "active";
  toIndex: number;
}

/** The spread the rail rests on, how far it is dragged, and the turn in progress. */
interface RailState {
  displayedIndex: number;
  dragOffset: number;
  transition: PageTurnTransition | null;
}

type RailAction =
  /** Follows a drag or a swipe, or returns the rail to rest at `0`. */
  | { offset: number; type: "drag" }
  /** Puts the rail on a spread at once, without a turn. */
  | { index: number; offset: number; type: "place" }
  /** Starts a turn, unless one is already running. */
  | { transition: PageTurnTransition; type: "start" }
  /** Lets a turn that waited for its images go ahead. */
  | { id: number; type: "prepare" }
  /** Slides the rail from where it was dragged to the spread it turns to. */
  | { id: number; type: "activate" }
  /** Rests the rail on the spread a turn reached. */
  | { id: number; toIndex: number; type: "finish" };

const updateTransition = (
  state: RailState,
  id: number,
  transition: PageTurnTransition | null
): PageTurnTransition | null =>
  state.transition?.id === id ? transition : state.transition;

const reduceRail = (state: RailState, action: RailAction): RailState => {
  switch (action.type) {
    case "drag": {
      return { ...state, dragOffset: action.offset };
    }

    case "place": {
      return {
        displayedIndex: action.index,
        dragOffset: action.offset,
        transition: null,
      };
    }

    case "start": {
      return state.transition === null
        ? { ...state, transition: action.transition }
        : state;
    }

    case "prepare": {
      return {
        ...state,
        transition:
          state.transition === null
            ? null
            : updateTransition(state, action.id, {
                ...state.transition,
                phase: "prepared",
              }),
      };
    }

    case "activate": {
      return {
        ...state,
        dragOffset: 0,
        transition:
          state.transition === null
            ? null
            : updateTransition(state, action.id, {
                ...state.transition,
                phase: "active",
              }),
      };
    }

    case "finish": {
      return {
        ...state,
        displayedIndex: action.toIndex,
        transition: updateTransition(state, action.id, null),
      };
    }

    default: {
      return state;
    }
  }
};

interface UsePageTurnOptions<TPage extends ViewerPage> {
  /** The element the width of one spread of the rail is measured from. */
  containerRef: RefObject<HTMLElement | null>;
  currentIndex: number;
  /** How many spreads beyond the rail are loaded ahead of the reader. */
  imagePreloadSpreads: number;
  maxIndex: number;
  minIndex: number;
  onPageLoadError?: (error: PageLoadError<TPage>) => void;
  pageCount: number;
  /** How the pages are fitted, which decides the width they are drawn at. */
  pageFitMode: PageFitMode;
  pages: readonly (TPage | undefined)[];
  plugins: readonly ViewerPlugin[];
  readingDirection: "rtl" | "ltr";
  /**
   * Where a scrub rests among the spreads, which the rail follows directly
   * instead of turning to it, or `null` while no scrub is in progress.
   */
  scrubSpread: ScrubSpread | null;
  spreadStartIndex: number;
  usesManagedImageLoading: boolean;
  usesPageRail: boolean;
  viewMode: ViewMode;
}

interface UsePageTurnResult<TPage extends ViewerPage> {
  displayedIndex: number;
  dragOffset: number;
  isTransitioning: boolean;
  onTransitionEnd: (event: ReactTransitionEvent<HTMLDivElement>) => void;
  orderedIndices: number[];
  orderedIndicesFor: (index: number) => number[];
  pageImages: ReadonlyMap<string, PageImage>;
  pageLoadStates: ReadonlyMap<string, PageLoadEntry<TPage>>;
  railSpreadIndices: (number | undefined)[];
  retryPage: (index: number) => void;
  setDragOffset: (offset: number) => void;
  slideDirection: PageTurnDirection | undefined;
  transitionState: "idle" | PageTurnTransition["phase"];
}

/**
 * Drives the spread that the rail displays: it runs the page-turn transition
 * state machine, keeps the decoded image cache aligned with the rail, and
 * reports every committed page change to the plugins.
 */
export const usePageTurn = <TPage extends ViewerPage>({
  containerRef,
  currentIndex,
  imagePreloadSpreads,
  maxIndex,
  minIndex,
  onPageLoadError,
  pageCount,
  pageFitMode,
  pages,
  plugins,
  readingDirection,
  scrubSpread,
  spreadStartIndex,
  usesManagedImageLoading,
  usesPageRail,
  viewMode,
}: UsePageTurnOptions<TPage>): UsePageTurnResult<TPage> => {
  const transitionIdRef = useRef(0);
  // A scrub leaves the rail wherever it was released, part of the way to the
  // next spread, and what follows moves it on from there rather than from rest.
  const endsScrubRef = useRef(false);
  const isScrubbing = scrubSpread !== null && usesPageRail;
  const scrubIndex = scrubSpread?.index;
  const scrubFraction = scrubSpread?.fraction ?? 0;

  // A viewport without the rail has nothing to drag, so it shows the spread
  // nearest the scrub instead.
  const targetIndex =
    !usesPageRail && scrubSpread !== null
      ? scrubSpread.nearestIndex
      : currentIndex;

  const [
    { displayedIndex, dragOffset, transition: pageTurnTransition },
    dispatchRail,
  ] = useReducer(reduceRail, {
    displayedIndex: currentIndex,
    dragOffset: 0,
    transition: null,
  });

  const setDragOffset = useCallback((offset: number) => {
    dispatchRail({ offset, type: "drag" });
  }, []);

  const {
    cachedIndices,
    orderedIndices,
    orderedIndicesFor,
    preloadIndices,
    railSpreadIndices,
  } = useViewportLayout({
    displayedIndex,
    imagePreloadSpreads,
    maxIndex,
    minIndex,
    pages,
    readingDirection,
    spreadStartIndex,
    transitionToIndex: pageTurnTransition?.toIndex,
    usesPageRail,
    viewMode,
  });

  const viewportSize = useViewportSize(containerRef);

  // The rail and the preload window share one measure, so a turn onto a
  // preloaded spread draws the image already fetched for it.
  const getRequirement = useMemo(
    () =>
      viewportSize === null
        ? undefined
        : (index: number) =>
            getPageRequirement(
              index,
              pages,
              viewportSize,
              pageFitMode,
              viewMode
            ),
    [pageFitMode, pages, viewMode, viewportSize]
  );

  const {
    images: pageImages,
    loadStates: pageLoadStates,
    retryPage,
  } = useViewportImages({
    cachedIndices,
    getPageRequirement: getRequirement,
    keepImages: pageTurnTransition !== null,
    onPageLoadError,
    pages,
    plugins,
    preloadIndices,
    shouldLoadImages: usesManagedImageLoading,
  });

  const isIncomingPageSetReady =
    pageTurnTransition !== null &&
    getVisibleIndices(
      pageTurnTransition.toIndex,
      maxIndex,
      spreadStartIndex,
      viewMode,
      pages
    ).every((index) => {
      // An index outside the page list belongs to a slot page, which holds
      // content of its own and never waits for the image cache.
      if (index < 0 || index >= pageCount) {
        return true;
      }

      const page = pages[index];

      return page !== undefined && pageImages.has(getPageImageKey(index, page));
    });

  // A scrub moves the rail with the thumb, the way a swipe moves it with the
  // finger: the spread it has passed sits in the current slot, and the rail is
  // dragged towards the next spread by the share of the way it has come.
  useLayoutEffect(() => {
    if (!isScrubbing || scrubIndex === undefined) {
      return;
    }

    const width = containerRef.current?.clientWidth ?? 0;

    const offset =
      (readingDirection === "rtl" ? 1 : -1) * scrubFraction * width;

    endsScrubRef.current = true;
    // A scrub takes the rail over from a running transition before the next paint.
    dispatchRail({ index: scrubIndex, offset, type: "place" });
  }, [containerRef, isScrubbing, readingDirection, scrubFraction, scrubIndex]);

  useLayoutEffect(() => {
    if (isScrubbing || pageTurnTransition !== null) {
      return;
    }

    const endsScrub = endsScrubRef.current;
    endsScrubRef.current = false;

    const movesWithoutAnimation =
      !usesPageRail ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (displayedIndex === targetIndex) {
      // A scrub released short of halfway to the next spread settles back on
      // the one it had passed.
      if (endsScrub && !movesWithoutAnimation) {
        transitionIdRef.current += 1;
        dispatchRail({
          transition: {
            id: transitionIdRef.current,
            phase: "prepared",
            toIndex: targetIndex,
          },
          type: "start",
        });
      } else if (endsScrub) {
        dispatchRail({ offset: 0, type: "drag" });
      }

      return;
    }

    const previousIndex = getPreviousSpreadIndex(
      displayedIndex,
      minIndex,
      spreadStartIndex,
      viewMode,
      pages
    );

    const nextIndex = getNextSpreadIndex(
      displayedIndex,
      maxIndex,
      spreadStartIndex,
      viewMode,
      pages
    );

    const isAdjacent =
      targetIndex === previousIndex || targetIndex === nextIndex;

    // A non-adjacent change cannot use the three-spread rail, so it puts the
    // rail on the spread at rest before the next paint.
    if (movesWithoutAnimation || !isAdjacent) {
      dispatchRail({ index: targetIndex, offset: 0, type: "place" });

      return;
    }

    transitionIdRef.current += 1;
    dispatchRail({
      transition: {
        direction: getPageTurnDirection(
          displayedIndex,
          targetIndex,
          readingDirection
        ),
        id: transitionIdRef.current,
        // A scrub already shows the spread it was released towards, placeholder
        // and all, so the rest of the turn does not stop to wait for its images.
        phase: usesManagedImageLoading && !endsScrub ? "waiting" : "prepared",
        toIndex: targetIndex,
      },
      type: "start",
    });
  }, [
    displayedIndex,
    isScrubbing,
    maxIndex,
    minIndex,
    pages,
    pageTurnTransition,
    readingDirection,
    spreadStartIndex,
    targetIndex,
    usesManagedImageLoading,
    usesPageRail,
    viewMode,
  ]);

  useEffect(() => {
    if (pageTurnTransition?.phase === "waiting") {
      if (!isIncomingPageSetReady) {
        const waitTimeout = setTimeout(() => {
          dispatchRail({ id: pageTurnTransition.id, type: "prepare" });
        }, PAGE_TURN_IMAGE_WAIT_TIMEOUT_MS);

        return () => {
          clearTimeout(waitTimeout);
        };
      }

      // The waiting state becomes renderable only after its image cache is ready.
      dispatchRail({ id: pageTurnTransition.id, type: "prepare" });

      return;
    }

    if (pageTurnTransition?.phase !== "prepared") {
      return;
    }

    const requestFrame = isAvailable(globalThis.requestAnimationFrame)
      ? requestAnimationFrame
      : // oxlint-disable-next-line promise/prefer-await-to-callbacks -- This is the browser's frame callback API fallback.
        (callback: FrameRequestCallback) => window.setTimeout(callback, 0);

    const cancelFrame = isAvailable(globalThis.cancelAnimationFrame)
      ? cancelAnimationFrame
      : clearTimeout;

    const animationFrame = requestFrame(() => {
      dispatchRail({ id: pageTurnTransition.id, type: "activate" });
    });

    return () => {
      cancelFrame(animationFrame);
    };
  }, [isIncomingPageSetReady, pageTurnTransition]);

  useEffect(() => {
    if (pageTurnTransition?.phase !== "active") {
      return;
    }

    const { id, toIndex } = pageTurnTransition;

    const timeout = setTimeout(() => {
      dispatchRail({ id, toIndex, type: "finish" });
    }, PAGE_TURN_FALLBACK_DURATION_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [pageTurnTransition]);

  useEffect(() => {
    const notifyPageChange = async (): Promise<void> => {
      try {
        await runPageChangeHooks(plugins, currentIndex, pageCount);
      } catch {
        // Page-change reporting must not make the viewer unusable.
      }
    };

    void notifyPageChange();
  }, [currentIndex, pageCount, plugins]);

  const onTransitionEnd = useCallback(
    (event: ReactTransitionEvent<HTMLDivElement>): void => {
      if (
        pageTurnTransition?.phase !== "active" ||
        event.target !== event.currentTarget ||
        event.propertyName !== "transform"
      ) {
        return;
      }

      const { id, toIndex } = pageTurnTransition;
      dispatchRail({ id, toIndex, type: "finish" });
    },
    [pageTurnTransition]
  );

  return {
    displayedIndex,
    dragOffset,
    isTransitioning: pageTurnTransition !== null,
    onTransitionEnd,
    orderedIndices,
    orderedIndicesFor,
    pageImages,
    pageLoadStates,
    railSpreadIndices,
    retryPage,
    setDragOffset,
    slideDirection: pageTurnTransition?.direction,
    transitionState: pageTurnTransition?.phase ?? ("idle" as const),
  };
};
