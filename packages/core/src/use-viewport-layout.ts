import { useCallback, useMemo } from "react";

import { getPreviousSpreadIndex, getVisiblePageCount } from "./viewer-context";
import type { ViewMode } from "./viewer-context";

export type PageTurnDirection = "left" | "right";

/** The half of a double-page spread that a page occupies. */
export type PageSide = "left" | "right";

/**
 * Returns the side a page takes in double-page mode. A page whose offset from
 * `spreadStartIndex` is even starts a spread and takes the side the reading
 * begins on, and the page facing it takes the other side, so an unpaired page
 * keeps the side it would have had in a printed book.
 */
export const getPageSide = (
  index: number,
  spreadStartIndex: number,
  readingDirection: "rtl" | "ltr"
): PageSide => {
  const startsSpread = (index - spreadStartIndex) % 2 === 0;
  return startsSpread === (readingDirection === "ltr") ? "left" : "right";
};

/** Returns the physical direction in which the current spread leaves the viewport. */
export const getPageTurnDirection = (
  fromIndex: number,
  toIndex: number,
  readingDirection: "rtl" | "ltr"
): PageTurnDirection => {
  const isForward = toIndex > fromIndex;
  return isForward === (readingDirection === "ltr") ? "left" : "right";
};

export const getVisibleIndices = (
  currentIndex: number,
  maxIndex: number,
  spreadStartIndex: number,
  viewMode: ViewMode
): number[] => {
  const indices = currentIndex > maxIndex ? [] : [currentIndex];
  if (
    getVisiblePageCount(viewMode, currentIndex, maxIndex, spreadStartIndex) ===
    2
  ) {
    indices.push(currentIndex + 1);
  }

  return indices;
};

export const getNextSpreadIndex = (
  currentIndex: number,
  maxIndex: number,
  spreadStartIndex: number,
  viewMode: ViewMode
): number | undefined => {
  const nextIndex =
    currentIndex +
    getVisiblePageCount(viewMode, currentIndex, maxIndex, spreadStartIndex);
  return nextIndex <= maxIndex ? nextIndex : undefined;
};

export const getSwipeTargetIndex = (
  direction: "left" | "right",
  currentIndex: number,
  minIndex: number,
  maxIndex: number,
  readingDirection: "rtl" | "ltr",
  spreadStartIndex: number,
  viewMode: ViewMode
): number | undefined => {
  const movesForward =
    (direction === "left" && readingDirection === "rtl") ||
    (direction === "right" && readingDirection === "ltr");
  return movesForward
    ? getNextSpreadIndex(currentIndex, maxIndex, spreadStartIndex, viewMode)
    : getPreviousSpreadIndex(
        currentIndex,
        minIndex,
        spreadStartIndex,
        viewMode
      );
};

interface UseViewportLayoutOptions {
  displayedIndex: number;
  maxIndex: number;
  minIndex: number;
  readingDirection: "rtl" | "ltr";
  spreadStartIndex: number;
  transitionToIndex: number | undefined;
  usesPageRail: boolean;
  viewMode: ViewMode;
}

/** Calculates visible, rail, and image-cache page indices for the viewport. */
export const useViewportLayout = ({
  displayedIndex,
  maxIndex,
  minIndex,
  readingDirection,
  spreadStartIndex,
  transitionToIndex,
  usesPageRail,
  viewMode,
}: UseViewportLayoutOptions) => {
  const visibleIndices = useMemo(
    () =>
      getVisibleIndices(displayedIndex, maxIndex, spreadStartIndex, viewMode),
    [displayedIndex, maxIndex, spreadStartIndex, viewMode]
  );
  const orderedIndices = useMemo(
    () =>
      readingDirection === "rtl" && visibleIndices.length === 2
        ? [visibleIndices[1], visibleIndices[0]]
        : visibleIndices,
    [readingDirection, visibleIndices]
  );
  const orderedIndicesFor = useCallback(
    (index: number): number[] => {
      const indices = getVisibleIndices(
        index,
        maxIndex,
        spreadStartIndex,
        viewMode
      );
      return readingDirection === "rtl" && indices.length === 2
        ? [indices[1], indices[0]]
        : indices;
    },
    [maxIndex, readingDirection, spreadStartIndex, viewMode]
  );
  const previousSpreadIndex = getPreviousSpreadIndex(
    displayedIndex,
    minIndex,
    spreadStartIndex,
    viewMode
  );
  const nextSpreadIndex = getNextSpreadIndex(
    displayedIndex,
    maxIndex,
    spreadStartIndex,
    viewMode
  );
  const railSpreadIndices = useMemo(() => {
    if (usesPageRail) {
      return readingDirection === "rtl"
        ? [nextSpreadIndex, displayedIndex, previousSpreadIndex]
        : [previousSpreadIndex, displayedIndex, nextSpreadIndex];
    }

    return [undefined, displayedIndex, undefined];
  }, [
    displayedIndex,
    nextSpreadIndex,
    previousSpreadIndex,
    readingDirection,
    usesPageRail,
  ]);
  const cachedIndices = useMemo(() => {
    const indices = new Set<number>();

    for (const spreadIndex of railSpreadIndices) {
      if (spreadIndex === undefined) {
        continue;
      }

      for (const pageIndex of getVisibleIndices(
        spreadIndex,
        maxIndex,
        spreadStartIndex,
        viewMode
      )) {
        indices.add(pageIndex);
      }
    }

    if (transitionToIndex !== undefined) {
      for (const pageIndex of getVisibleIndices(
        transitionToIndex,
        maxIndex,
        spreadStartIndex,
        viewMode
      )) {
        indices.add(pageIndex);
      }
    }

    if (!usesPageRail) {
      let nextIndex = getNextSpreadIndex(
        displayedIndex,
        maxIndex,
        spreadStartIndex,
        viewMode
      );
      for (let count = 0; count < 2 && nextIndex !== undefined; count += 1) {
        for (const pageIndex of getVisibleIndices(
          nextIndex,
          maxIndex,
          spreadStartIndex,
          viewMode
        )) {
          indices.add(pageIndex);
        }
        nextIndex = getNextSpreadIndex(
          nextIndex,
          maxIndex,
          spreadStartIndex,
          viewMode
        );
      }
    }

    return [...indices];
  }, [
    displayedIndex,
    maxIndex,
    railSpreadIndices,
    spreadStartIndex,
    transitionToIndex,
    usesPageRail,
    viewMode,
  ]);

  return {
    cachedIndices,
    orderedIndices,
    orderedIndicesFor,
    railSpreadIndices,
  };
};
