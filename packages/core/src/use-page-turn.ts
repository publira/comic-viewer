import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { TransitionEvent as ReactTransitionEvent } from "react";

import { runPageChangeHooks } from "./plugin";
import type { ViewerPlugin } from "./plugin";
import { getPageImageKey, useViewportImages } from "./use-viewport-images";
import {
  getNextSpreadIndex,
  getPageTurnDirection,
  getPreviousSpreadIndex,
  getVisibleIndices,
  useViewportLayout,
} from "./use-viewport-layout";
import type { PageTurnDirection } from "./use-viewport-layout";
import type { ViewerPage, ViewMode } from "./viewer-context";

const PAGE_TURN_FALLBACK_DURATION_MS = 320;
const PAGE_TURN_IMAGE_WAIT_TIMEOUT_MS = 1200;

interface PageTurnTransition {
  direction: PageTurnDirection;
  id: number;
  phase: "waiting" | "prepared" | "active";
  toIndex: number;
}

interface UsePageTurnOptions<TPage extends ViewerPage> {
  currentIndex: number;
  pages: readonly TPage[];
  plugins: readonly ViewerPlugin[];
  readingDirection: "rtl" | "ltr";
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
  currentIndex,
  pages,
  plugins,
  readingDirection,
  spreadStartIndex,
  usesManagedImageLoading,
  usesPageRail,
  viewMode,
}: UsePageTurnOptions<TPage>) => {
  const transitionIdRef = useRef(0);
  const [pageTurnTransition, setPageTurnTransition] =
    useState<PageTurnTransition | null>(null);
  const [displayedIndex, setDisplayedIndex] = useState(currentIndex);
  const [dragOffset, setDragOffset] = useState(0);
  const {
    cachedIndices,
    orderedIndices,
    orderedIndicesFor,
    railSpreadIndices,
  } = useViewportLayout({
    displayedIndex,
    pageCount: pages.length,
    readingDirection,
    spreadStartIndex,
    transitionToIndex: pageTurnTransition?.toIndex,
    usesPageRail,
    viewMode,
  });
  const pageImages = useViewportImages({
    cachedIndices,
    keepImages: pageTurnTransition !== null,
    pages,
    plugins,
    shouldLoadImages: usesManagedImageLoading,
  });
  const isIncomingPageSetReady =
    pageTurnTransition !== null &&
    getVisibleIndices(
      pageTurnTransition.toIndex,
      pages.length,
      spreadStartIndex,
      viewMode
    ).every((index) => {
      const page = pages[index];
      return page !== undefined && pageImages.has(getPageImageKey(index, page));
    });

  useLayoutEffect(() => {
    if (pageTurnTransition !== null || displayedIndex === currentIndex) {
      return;
    }

    const previousIndex = getPreviousSpreadIndex(
      displayedIndex,
      spreadStartIndex,
      viewMode
    );
    const nextIndex = getNextSpreadIndex(
      displayedIndex,
      pages.length,
      spreadStartIndex,
      viewMode
    );
    const isAdjacent =
      currentIndex === previousIndex || currentIndex === nextIndex;

    if (
      !usesPageRail ||
      !isAdjacent ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      // oxlint-disable-next-line react/set-state-in-effect -- Canceling a running transition must happen before the next paint.
      setPageTurnTransition(null);
      // oxlint-disable-next-line react/set-state-in-effect -- A transition that cannot run must restore the rail to its resting position before paint.
      setDragOffset(0);
      // oxlint-disable-next-line react/set-state-in-effect -- A non-adjacent programmatic change cannot use the three-spread rail.
      setDisplayedIndex(currentIndex);
      return;
    }

    transitionIdRef.current += 1;
    setPageTurnTransition({
      direction: getPageTurnDirection(
        displayedIndex,
        currentIndex,
        readingDirection
      ),
      id: transitionIdRef.current,
      phase: usesManagedImageLoading ? "waiting" : "prepared",
      toIndex: currentIndex,
    });
  }, [
    currentIndex,
    displayedIndex,
    pageTurnTransition,
    pages.length,
    readingDirection,
    spreadStartIndex,
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
        await runPageChangeHooks(plugins, currentIndex, pages.length);
      } catch {
        // Page-change reporting must not make the viewer unusable.
      }
    };

    void notifyPageChange();
  }, [currentIndex, pages.length, plugins]);

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
    railSpreadIndices,
    setDragOffset,
    slideDirection: pageTurnTransition?.direction,
    transitionState: pageTurnTransition?.phase ?? ("idle" as const),
  };
};
