import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { RefObject, TransitionEvent as ReactTransitionEvent } from "react";

import type { PageLoadError } from "./page-load";
import { runPageChangeHooks } from "./plugin";
import type { ViewerPlugin } from "./plugin";
import { getPageImageKey, useViewportImages } from "./use-viewport-images";
import {
  getNextSpreadIndex,
  getPageTurnDirection,
  getVisibleIndices,
  useViewportLayout,
} from "./use-viewport-layout";
import type { PageTurnDirection } from "./use-viewport-layout";
import { getPreviousSpreadIndex } from "./viewer-context";
import type { ScrubSpread, ViewerPage, ViewMode } from "./viewer-context";

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
  pages,
  plugins,
  readingDirection,
  scrubSpread,
  spreadStartIndex,
  usesManagedImageLoading,
  usesPageRail,
  viewMode,
}: UsePageTurnOptions<TPage>) => {
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
  const [pageTurnTransition, setPageTurnTransition] =
    useState<PageTurnTransition | null>(null);
  const [displayedIndex, setDisplayedIndex] = useState(currentIndex);
  const [dragOffset, setDragOffset] = useState(0);
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
  const {
    images: pageImages,
    loadStates: pageLoadStates,
    retryPage,
  } = useViewportImages({
    cachedIndices,
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
    // oxlint-disable-next-line react/set-state-in-effect -- A scrub takes the rail over from a running transition before the next paint.
    setPageTurnTransition(null);
    // oxlint-disable-next-line react/set-state-in-effect -- The rail follows the scrub before the next paint.
    setDisplayedIndex(scrubIndex);
    // oxlint-disable-next-line react/set-state-in-effect -- The rail follows the scrub before the next paint.
    setDragOffset(offset);
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
        // oxlint-disable-next-line react/set-state-in-effect -- The rail leaves the position a scrub was released at before the next paint.
        setPageTurnTransition({
          id: transitionIdRef.current,
          phase: "prepared",
          toIndex: targetIndex,
        });
      } else if (endsScrub) {
        // oxlint-disable-next-line react/set-state-in-effect -- The rail leaves the position a scrub was released at before the next paint.
        setDragOffset(0);
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

    if (movesWithoutAnimation || !isAdjacent) {
      // oxlint-disable-next-line react/set-state-in-effect -- Canceling a running transition must happen before the next paint.
      setPageTurnTransition(null);
      // oxlint-disable-next-line react/set-state-in-effect -- A transition that cannot run must restore the rail to its resting position before paint.
      setDragOffset(0);
      // oxlint-disable-next-line react/set-state-in-effect -- A non-adjacent programmatic change cannot use the three-spread rail.
      setDisplayedIndex(targetIndex);
      return;
    }

    transitionIdRef.current += 1;
    setPageTurnTransition({
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
          setPageTurnTransition((transition) =>
            transition?.id === pageTurnTransition.id
              ? { ...transition, phase: "prepared" }
              : transition
          );
        }, PAGE_TURN_IMAGE_WAIT_TIMEOUT_MS);

        return () => {
          clearTimeout(waitTimeout);
        };
      }

      // oxlint-disable-next-line react/set-state-in-effect -- The waiting state becomes renderable only after its image cache is ready.
      setPageTurnTransition((transition) =>
        transition?.id === pageTurnTransition.id
          ? { ...transition, phase: "prepared" }
          : transition
      );
      return;
    }

    if (pageTurnTransition?.phase !== "prepared") {
      return;
    }

    const requestFrame =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame
        : // oxlint-disable-next-line promise/prefer-await-to-callbacks -- This is the browser's frame callback API fallback.
          (callback: FrameRequestCallback) =>
            setTimeout(callback, 0) as unknown as number;
    const cancelFrame =
      typeof cancelAnimationFrame === "function"
        ? cancelAnimationFrame
        : clearTimeout;
    const animationFrame = requestFrame(() => {
      setDragOffset(0);
      setPageTurnTransition((transition) =>
        transition?.id === pageTurnTransition.id
          ? { ...transition, phase: "active" }
          : transition
      );
    });

    return () => {
      cancelFrame(animationFrame);
    };
  }, [isIncomingPageSetReady, pageTurnTransition]);

  useEffect(() => {
    if (pageTurnTransition?.phase !== "active") {
      return;
    }

    const transitionId = pageTurnTransition.id;
    const timeout = setTimeout(() => {
      setDisplayedIndex(pageTurnTransition.toIndex);
      setPageTurnTransition((transition) =>
        transition?.id === transitionId ? null : transition
      );
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
      setPageTurnTransition((transition) =>
        transition?.id === id ? null : transition
      );
      setDisplayedIndex(toIndex);
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
