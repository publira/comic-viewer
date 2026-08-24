import { useCallback, useMemo } from "react";

import { getVisiblePageCount } from "./viewer-context";
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
  pageCount: number,
  spreadStartIndex: number,
  viewMode: ViewMode
): number[] => {
  const indices = currentIndex >= pageCount ? [] : [currentIndex];
  if (
    getVisiblePageCount(viewMode, currentIndex, pageCount, spreadStartIndex) ===
    2
  ) {
    indices.push(currentIndex + 1);
  }

  return indices;
};

export const getNextSpreadIndex = (
  currentIndex: number,
  pageCount: number,
  spreadStartIndex: number,
  viewMode: ViewMode
): number | undefined => {
  const nextIndex =
    currentIndex +
    getVisiblePageCount(viewMode, currentIndex, pageCount, spreadStartIndex);
  return nextIndex < pageCount ? nextIndex : undefined;
};

export const getPreviousSpreadIndex = (
  currentIndex: number,
  spreadStartIndex: number,
  viewMode: ViewMode
): number | undefined => {
  if (currentIndex === 0) {
    return undefined;
  }

  return Math.max(
    0,
    currentIndex -
      (viewMode === "double" && currentIndex > spreadStartIndex ? 2 : 1)
  );
};

export const getSwipeTargetIndex = (
  direction: "left" | "right",
  currentIndex: number,
  pageCount: number,
  readingDirection: "rtl" | "ltr",
  spreadStartIndex: number,
  viewMode: ViewMode
): number | undefined => {
  const movesForward =
    (direction === "left" && readingDirection === "rtl") ||
    (direction === "right" && readingDirection === "ltr");
  return movesForward
    ? getNextSpreadIndex(currentIndex, pageCount, spreadStartIndex, viewMode)
    : getPreviousSpreadIndex(currentIndex, spreadStartIndex, viewMode);
};

interface UseViewportLayoutOptions {
  displayedIndex: number;
  pageCount: number;
  readingDirection: "rtl" | "ltr";
  spreadStartIndex: number;
  transitionToIndex: number | undefined;
  usesPageRail: boolean;
  viewMode: ViewMode;
}

/** Calculates visible, rail, and image-cache page indices for the viewport. */
export const useViewportLayout = ({
  displayedIndex,
  pageCount,
  readingDirection,
  spreadStartIndex,
  transitionToIndex,
  usesPageRail,
  viewMode,
}: UseViewportLayoutOptions) => {
  const visibleIndices = useMemo(
    () =>
      getVisibleIndices(displayedIndex, pageCount, spreadStartIndex, viewMode),
    [displayedIndex, pageCount, spreadStartIndex, viewMode]
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
        pageCount,
        spreadStartIndex,
        viewMode
      );
      return readingDirection === "rtl" && indices.length === 2
        ? [indices[1], indices[0]]
        : indices;
    },
    [pageCount, readingDirection, spreadStartIndex, viewMode]
  );
  const previousSpreadIndex = getPreviousSpreadIndex(
    displayedIndex,
    spreadStartIndex,
    viewMode
  );
  const nextSpreadIndex = getNextSpreadIndex(
    displayedIndex,
    pageCount,
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
        pageCount,
        spreadStartIndex,
        viewMode
      )) {
        indices.add(pageIndex);
      }
    }

    if (transitionToIndex !== undefined) {
      for (const pageIndex of getVisibleIndices(
        transitionToIndex,
        pageCount,
        spreadStartIndex,
        viewMode
      )) {
        indices.add(pageIndex);
      }
    }

    if (!usesPageRail) {
      let nextIndex = getNextSpreadIndex(
        displayedIndex,
        pageCount,
        spreadStartIndex,
        viewMode
      );
      for (let count = 0; count < 2 && nextIndex !== undefined; count += 1) {
        for (const pageIndex of getVisibleIndices(
          nextIndex,
          pageCount,
          spreadStartIndex,
          viewMode
        )) {
          indices.add(pageIndex);
        }
        nextIndex = getNextSpreadIndex(
          nextIndex,
          pageCount,
          spreadStartIndex,
          viewMode
        );
      }
    }

    return [...indices];
  }, [
    displayedIndex,
    pageCount,
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
