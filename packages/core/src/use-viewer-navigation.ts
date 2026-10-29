import { useCallback, useState } from "react";

import { clampInteger } from "./clamp-integer";
import type { SpreadPageList } from "./page-spread";
import type { ViewMode } from "./viewer-context";
import { getPreviousSpreadIndex, getVisiblePageCount } from "./viewer-spreads";

interface UseViewerIndexOptions {
  controlledIndex: number | undefined;
  initialIndex: number | undefined;
  maxIndex: number;
  minIndex: number;
  onIndexChange: ((index: number) => void) | undefined;
}

interface ViewerIndex {
  currentIndex: number;
  goTo: (index: number) => void;
}

/**
 * Holds the reading position the way a reader setting is held: a controlled
 * index is mirrored, and `goTo` reports a change instead of writing it.
 */
export const useViewerIndex = ({
  controlledIndex,
  initialIndex,
  maxIndex,
  minIndex,
  onIndexChange,
}: UseViewerIndexOptions): ViewerIndex => {
  const [uncontrolledIndex, setUncontrolledIndex] = useState(() =>
    clampInteger(initialIndex ?? minIndex, minIndex, maxIndex)
  );

  const currentIndex = clampInteger(
    controlledIndex ?? uncontrolledIndex,
    minIndex,
    maxIndex
  );

  const goTo = useCallback(
    (index: number) => {
      const nextIndex = clampInteger(index, minIndex, maxIndex);

      if (nextIndex === currentIndex) {
        return;
      }

      if (controlledIndex === undefined) {
        setUncontrolledIndex(nextIndex);
      }

      onIndexChange?.(nextIndex);
    },
    [currentIndex, controlledIndex, maxIndex, minIndex, onIndexChange]
  );

  return { currentIndex, goTo };
};

interface UseSpreadNavigationOptions extends ViewerIndex {
  maxIndex: number;
  minIndex: number;
  pages: SpreadPageList;
  spreadStartIndex: number;
  viewMode: ViewMode;
}

interface SpreadNavigation {
  goToNext: () => void;
  goToPrev: () => void;
}

/** Steps the reading position one spread forwards or backwards. */
export const useSpreadNavigation = ({
  currentIndex,
  goTo,
  maxIndex,
  minIndex,
  pages,
  spreadStartIndex,
  viewMode,
}: UseSpreadNavigationOptions): SpreadNavigation => {
  const goToNext = useCallback(() => {
    const nextIndex =
      currentIndex +
      getVisiblePageCount(
        viewMode,
        currentIndex,
        maxIndex,
        spreadStartIndex,
        pages
      );

    if (nextIndex <= maxIndex) {
      goTo(nextIndex);
    }
  }, [currentIndex, spreadStartIndex, goTo, maxIndex, pages, viewMode]);

  const goToPrev = useCallback(() => {
    const previousIndex = getPreviousSpreadIndex(
      currentIndex,
      minIndex,
      spreadStartIndex,
      viewMode,
      pages
    );

    if (previousIndex !== undefined) {
      goTo(previousIndex);
    }
  }, [currentIndex, spreadStartIndex, goTo, minIndex, pages, viewMode]);

  return { goToNext, goToPrev };
};

interface ScrubPosition {
  /** The position held within the navigable indices, or `null` while no scrub is in progress. */
  scrubPosition: number | null;
  setScrubPosition: (position: number | null) => void;
}

/** Holds where a scrub, such as a drag of PageProgressSlider, rests. */
export const useScrubPosition = (
  minIndex: number,
  maxIndex: number
): ScrubPosition => {
  const [scrubPosition, setScrubPosition] = useState<number | null>(null);

  return {
    scrubPosition:
      scrubPosition === null || !Number.isFinite(scrubPosition)
        ? null
        : Math.min(maxIndex, Math.max(minIndex, scrubPosition)),
    setScrubPosition,
  };
};
