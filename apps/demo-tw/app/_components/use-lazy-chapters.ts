"use client";

import type { PageResolveContext, ViewerPage } from "@publira/comic-viewer";
import { useCallback, useState } from "react";

/** How many pages one chapter of the sample document holds. */
const CHAPTER_LENGTH = 7;
/** How long the imaginary page-metadata endpoint takes to answer. */
const PAGE_RESOLVE_DELAY_MS = 1200;
/** How long the imaginary chapter index takes to answer. */
const CHAPTER_LOAD_DELAY_MS = 400;

/** Resolves after the delay, or rejects as soon as the request is aborted. */
const wait = (delayMs: number, signal?: AbortSignal): Promise<void> =>
  // eslint-disable-next-line promise/avoid-new -- A delay is only reachable through the timer callback API.
  new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, delayMs);

    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        reject(signal.reason);
      },
      { once: true }
    );
  });

export interface LazyChapters {
  /** How many chapters the whole document holds. */
  chapterCount: number;
  isLoadingChapter: boolean;
  /** How many chapters have been appended to the viewer so far. */
  loadedChapterCount: number;
  /** Appends the next chapter. Passed to the viewer as `onEndReached`. */
  loadNextChapter: () => void;
  /** The number of pages the viewer knows about, resolved or not. */
  pageCount: number;
  /** How many page-metadata requests have been answered. */
  requestCount: number;
  resolvePage: (
    index: number,
    context: PageResolveContext
  ) => Promise<ViewerPage | undefined>;
}

/**
 * Stands in for a paginated backend: it hands the viewer one chapter of page
 * count at a time, and answers for the metadata of a single page only once the
 * viewer asks for it.
 */
export const useLazyChapters = (pages: readonly ViewerPage[]): LazyChapters => {
  const [pageCount, setPageCount] = useState(() =>
    Math.min(CHAPTER_LENGTH, pages.length)
  );
  const [isLoadingChapter, setIsLoadingChapter] = useState(false);
  const [requestCount, setRequestCount] = useState(0);

  const resolvePage = useCallback(
    async (
      index: number,
      { signal }: PageResolveContext
    ): Promise<ViewerPage | undefined> => {
      await wait(PAGE_RESOLVE_DELAY_MS, signal);
      setRequestCount((count) => count + 1);

      // An endpoint that signs its URLs would sign this one here, which is why
      // the viewer asks again for a page the reader comes back to much later.
      return pages[index];
    },
    [pages]
  );

  const loadNextChapter = useCallback(() => {
    if (pageCount >= pages.length) {
      return;
    }

    setIsLoadingChapter(true);
    void (async () => {
      await wait(CHAPTER_LOAD_DELAY_MS);
      setPageCount((count) => Math.min(pages.length, count + CHAPTER_LENGTH));
      setIsLoadingChapter(false);
    })();
  }, [pageCount, pages.length]);

  return {
    chapterCount: Math.ceil(pages.length / CHAPTER_LENGTH),
    isLoadingChapter,
    loadNextChapter,
    loadedChapterCount: Math.ceil(pageCount / CHAPTER_LENGTH),
    pageCount,
    requestCount,
    resolvePage,
  };
};
