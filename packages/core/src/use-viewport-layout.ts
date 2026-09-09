import { useCallback, useMemo } from "react";

import { isSpreadPage, startsPageSet } from "./page-spread";
import type { SpreadPageList } from "./page-spread";
import { getPreviousSpreadIndex, getVisiblePageCount } from "./viewer-context";
import type { ViewMode } from "./viewer-context";

export type PageTurnDirection = "left" | "right";

/** The half of a double-page spread that a page occupies. */
export type PageSide = "left" | "right";

/**
 * Returns the side a page takes in double-page mode, or `undefined` for a
 * spread page, which covers both halves and therefore takes neither. A page
 * whose offset from `spreadStartIndex` is even starts a spread and takes the
 * side the reading begins on, and the page facing it takes the other side, so
 * an unpaired page keeps the side it would have had in a printed book.
 */
export const getPageSide = (
  index: number,
  spreadStartIndex: number,
  readingDirection: "rtl" | "ltr",
  pages: SpreadPageList
): PageSide | undefined => {
  if (isSpreadPage(index, pages)) {
    return undefined;
  }

  const startsSpread = startsPageSet(index, spreadStartIndex, pages);
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
  viewMode: ViewMode,
  pages: SpreadPageList
): number[] => {
  const indices = currentIndex > maxIndex ? [] : [currentIndex];
  if (
    getVisiblePageCount(
      viewMode,
      currentIndex,
      maxIndex,
      spreadStartIndex,
      pages
    ) === 2
  ) {
    indices.push(currentIndex + 1);
  }

  return indices;
};

export const getNextSpreadIndex = (
  currentIndex: number,
  maxIndex: number,
  spreadStartIndex: number,
  viewMode: ViewMode,
  pages: SpreadPageList
): number | undefined => {
  const nextIndex =
    currentIndex +
    getVisiblePageCount(
      viewMode,
      currentIndex,
      maxIndex,
      spreadStartIndex,
      pages
    );
  return nextIndex <= maxIndex ? nextIndex : undefined;
};

export const getSwipeTargetIndex = (
  direction: "left" | "right",
  currentIndex: number,
  minIndex: number,
  maxIndex: number,
  readingDirection: "rtl" | "ltr",
  spreadStartIndex: number,
  viewMode: ViewMode,
  pages: SpreadPageList
): number | undefined => {
  const movesForward =
    (direction === "left" && readingDirection === "rtl") ||
    (direction === "right" && readingDirection === "ltr");
  return movesForward
    ? getNextSpreadIndex(
        currentIndex,
        maxIndex,
        spreadStartIndex,
        viewMode,
        pages
      )
    : getPreviousSpreadIndex(
        currentIndex,
        minIndex,
        spreadStartIndex,
        viewMode,
        pages
      );
};

interface UseViewportLayoutOptions {
  displayedIndex: number;
  /**
   * How many spreads beyond the ones the viewport can render are loaded ahead
   * of the reader in each direction.
   */
  imagePreloadSpreads: number;
  maxIndex: number;
  minIndex: number;
  /** The page list the spread pages among the document are read from. */
  pages: SpreadPageList;
  readingDirection: "rtl" | "ltr";
  spreadStartIndex: number;
  transitionToIndex: number | undefined;
  usesPageRail: boolean;
  viewMode: ViewMode;
}

/** Calculates visible, rail, and image-cache page indices for the viewport. */
export const useViewportLayout = ({
  displayedIndex,
  imagePreloadSpreads,
  maxIndex,
  minIndex,
  pages,
  readingDirection,
  spreadStartIndex,
  transitionToIndex,
  usesPageRail,
  viewMode,
}: UseViewportLayoutOptions) => {
  const visibleIndices = useMemo(
    () =>
      getVisibleIndices(
        displayedIndex,
        maxIndex,
        spreadStartIndex,
        viewMode,
        pages
      ),
    [displayedIndex, maxIndex, pages, spreadStartIndex, viewMode]
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
        viewMode,
        pages
      );
      return readingDirection === "rtl" && indices.length === 2
        ? [indices[1], indices[0]]
        : indices;
    },
    [maxIndex, pages, readingDirection, spreadStartIndex, viewMode]
  );
  const previousSpreadIndex = getPreviousSpreadIndex(
    displayedIndex,
    minIndex,
    spreadStartIndex,
    viewMode,
    pages
  );
  const nextSpreadIndex = getNextSpreadIndex(
    displayedIndex,
    maxIndex,
    spreadStartIndex,
    viewMode,
    pages
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
  const { cachedIndices, preloadIndices } = useMemo(() => {
    const cached = new Set<number>();
    const preloaded = new Set<number>();
    // The spreads the cache already holds, so that the preload window starts
    // where the viewport stops rather than reloading a page it can render.
    let firstCachedSpreadIndex = displayedIndex;
    let lastCachedSpreadIndex = displayedIndex;
    const addSpread = (indices: Set<number>, spreadIndex: number): void => {
      for (const pageIndex of getVisibleIndices(
        spreadIndex,
        maxIndex,
        spreadStartIndex,
        viewMode,
        pages
      )) {
        indices.add(pageIndex);
      }
    };
    const cacheSpread = (spreadIndex: number): void => {
      addSpread(cached, spreadIndex);
      firstCachedSpreadIndex = Math.min(firstCachedSpreadIndex, spreadIndex);
      lastCachedSpreadIndex = Math.max(lastCachedSpreadIndex, spreadIndex);
    };

    for (const spreadIndex of railSpreadIndices) {
      if (spreadIndex !== undefined) {
        cacheSpread(spreadIndex);
      }
    }

    if (transitionToIndex !== undefined) {
      cacheSpread(transitionToIndex);
    }

    if (!usesPageRail) {
      let nextIndex = getNextSpreadIndex(
        displayedIndex,
        maxIndex,
        spreadStartIndex,
        viewMode,
        pages
      );
      for (let count = 0; count < 2 && nextIndex !== undefined; count += 1) {
        cacheSpread(nextIndex);
        nextIndex = getNextSpreadIndex(
          nextIndex,
          maxIndex,
          spreadStartIndex,
          viewMode,
          pages
        );
      }
    }

    let forwardIndex = lastCachedSpreadIndex;
    for (let count = 0; count < imagePreloadSpreads; count += 1) {
      const nextIndex = getNextSpreadIndex(
        forwardIndex,
        maxIndex,
        spreadStartIndex,
        viewMode,
        pages
      );
      if (nextIndex === undefined) {
        break;
      }

      addSpread(preloaded, nextIndex);
      forwardIndex = nextIndex;
    }

    let backwardIndex = firstCachedSpreadIndex;
    for (let count = 0; count < imagePreloadSpreads; count += 1) {
      const previousIndex = getPreviousSpreadIndex(
        backwardIndex,
        minIndex,
        spreadStartIndex,
        viewMode,
        pages
      );
      if (previousIndex === undefined) {
        break;
      }

      addSpread(preloaded, previousIndex);
      backwardIndex = previousIndex;
    }

    for (const pageIndex of cached) {
      preloaded.delete(pageIndex);
    }

    return { cachedIndices: [...cached], preloadIndices: [...preloaded] };
  }, [
    displayedIndex,
    imagePreloadSpreads,
    maxIndex,
    minIndex,
    pages,
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
    preloadIndices,
    railSpreadIndices,
  };
};
