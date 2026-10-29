import { useEffect, useRef } from "react";

import { clampInteger } from "./clamp-integer";

interface UseEndReachedOptions {
  currentIndex: number;
  endReachedThreshold: number;
  onEndReached: (() => void) | undefined;
  pageCount: number;
}

/**
 * Calls `onEndReached` once the reader comes within `endReachedThreshold`
 * pages of the end of the document.
 */
export const useEndReached = ({
  currentIndex,
  endReachedThreshold,
  onEndReached,
  pageCount,
}: UseEndReachedOptions): void => {
  // A page count that has already been reported is not reported again, so a
  // consumer that has nothing more to append is not asked in a loop.
  const onEndReachedRef = useRef(onEndReached);
  const reportedEndPageCountRef = useRef<number | null>(null);

  useEffect(() => {
    onEndReachedRef.current = onEndReached;
  }, [onEndReached]);

  useEffect(() => {
    const remainingPageCount = pageCount - (currentIndex + 1);

    if (
      pageCount === 0 ||
      remainingPageCount >
        clampInteger(endReachedThreshold, 0, Number.MAX_SAFE_INTEGER)
    ) {
      return;
    }

    if (reportedEndPageCountRef.current === pageCount) {
      return;
    }

    reportedEndPageCountRef.current = pageCount;
    onEndReachedRef.current?.();
  }, [currentIndex, endReachedThreshold, pageCount]);
};
