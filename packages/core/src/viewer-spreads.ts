import { clampInteger } from "./clamp-integer";
import { isSpreadPage, startsPageSet } from "./page-spread";
import type { SpreadPageList } from "./page-spread";
import type { ViewMode } from "./viewer-context";

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
  viewMode: ViewMode,
  pages: SpreadPageList
): number | undefined => {
  if (currentIndex <= minIndex) {
    return undefined;
  }

  if (viewMode === "double" && currentIndex > spreadStartIndex) {
    const previousIndex = startsPageSet(
      currentIndex - 1,
      spreadStartIndex,
      pages
    )
      ? currentIndex - 1
      : currentIndex - 2;

    return Math.max(spreadStartIndex, previousIndex);
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
  viewMode: ViewMode,
  pages: SpreadPageList
): number => {
  const clampedIndex = clampInteger(index, minIndex, maxIndex);

  if (viewMode !== "double" || clampedIndex <= spreadStartIndex) {
    return clampedIndex;
  }

  return startsPageSet(clampedIndex, spreadStartIndex, pages)
    ? clampedIndex
    : clampedIndex - 1;
};

/**
 * Returns how many pages the set at `currentIndex` puts on screen. A spread
 * page fills a set on its own, and so does the page that would have faced it,
 * which keeps its own half and leaves the other one to the spread.
 */
export const getVisiblePageCount = (
  viewMode: ViewMode,
  currentIndex: number,
  maxIndex: number,
  spreadStartIndex: number,
  pages: SpreadPageList
): number => {
  if (
    viewMode !== "double" ||
    currentIndex < spreadStartIndex ||
    currentIndex >= maxIndex
  ) {
    return 1;
  }

  return isSpreadPage(currentIndex, pages) ||
    isSpreadPage(currentIndex + 1, pages)
    ? 1
    : 2;
};

/** Where a scrub position falls among the spreads of the document. */
export interface ScrubSpread {
  /** The spread the position has passed, addressed by its first page. */
  index: number;
  /**
   * How far the position has moved from that spread towards the next one,
   * from `0` up to, but not including, `1`.
   */
  fraction: number;
  /** The spread nearest the position, which a scrub released there commits. */
  nearestIndex: number;
}

/**
 * Places a scrub position between the two spreads it lies between. A spread
 * rests at the index of its first page, so a position halfway to the next
 * spread is halfway through the turn to it.
 */
export const getScrubSpread = (
  position: number,
  minIndex: number,
  maxIndex: number,
  spreadStartIndex: number,
  viewMode: ViewMode,
  pages: SpreadPageList
): ScrubSpread => {
  const clampedPosition = Number.isFinite(position)
    ? Math.min(maxIndex, Math.max(minIndex, position))
    : minIndex;

  const index = getSpreadIndex(
    Math.floor(clampedPosition),
    minIndex,
    maxIndex,
    spreadStartIndex,
    viewMode,
    pages
  );

  const nextIndex =
    index +
    getVisiblePageCount(viewMode, index, maxIndex, spreadStartIndex, pages);

  if (nextIndex > maxIndex) {
    return { fraction: 0, index, nearestIndex: index };
  }

  const fraction = Math.min(
    Math.max((clampedPosition - index) / (nextIndex - index), 0),
    1
  );

  return fraction === 1
    ? { fraction: 0, index: nextIndex, nearestIndex: nextIndex }
    : {
        fraction,
        index,
        nearestIndex: fraction < 0.5 ? index : nextIndex,
      };
};
