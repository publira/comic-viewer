import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ViewerPage } from "./viewer-context";

/** The context a page resolver receives with every request. */
export interface PageResolveContext {
  /** Aborts once the viewer stops needing the page. */
  signal: AbortSignal;
}

/**
 * Resolves the metadata of a single page on demand, so a viewer can be given a
 * `pageCount` instead of the whole page list. Returning `undefined` leaves the
 * page unresolved until it enters the resolve window again.
 */
export type PageResolver<TPage extends ViewerPage = ViewerPage> = (
  index: number,
  context: PageResolveContext
) => Promise<TPage | undefined> | TPage | undefined;

/** A page whose metadata could not be resolved, reported with its index. */
export interface PageResolveError {
  /** The error thrown by the resolver. */
  cause: unknown;
  /** The zero-based index of the page within the viewer page list. */
  index: number;
}

/**
 * How many pages on either side of the current one are resolved ahead of the
 * reader by default. It covers a double-page spread and the spread that
 * follows it, so a page turn finds its metadata already resolved.
 */
export const DEFAULT_PAGE_RESOLVE_OVERSCAN = 4;

const EMPTY_PAGES: readonly never[] = [];

interface UsePageSourceOptions<TPage extends ViewerPage> {
  currentIndex: number;
  onPageResolveError?: (error: PageResolveError) => void;
  overscan: number;
  pageCount: number;
  pages: readonly (TPage | undefined)[];
  resolvePage?: PageResolver<TPage>;
}

/**
 * Merges the statically provided pages with the ones a resolver produces on
 * demand, into a list of `pageCount` entries where an unresolved page reads as
 * `undefined`.
 *
 * Only the pages within `overscan` of the current index are kept resolved:
 * metadata that leaves the window is dropped so that a page returned to later
 * is resolved again, which is what keeps expiring URLs usable.
 */
export const usePageSource = <TPage extends ViewerPage>({
  currentIndex,
  onPageResolveError,
  overscan,
  pageCount,
  pages,
  resolvePage,
}: UsePageSourceOptions<TPage>): readonly (TPage | undefined)[] => {
  const [resolvedPages, setResolvedPages] = useState<
    ReadonlyMap<number, TPage>
  >(() => new Map());
  const resolvedPagesRef = useRef<ReadonlyMap<number, TPage>>(new Map());
  const pageRequestsRef = useRef(new Map<number, AbortController>());
  // An index that failed, or that the resolver declined, is not asked again
  // until it leaves the resolve window, so a failure cannot become a loop.
  const settledIndicesRef = useRef(new Set<number>());
  const onPageResolveErrorRef = useRef(onPageResolveError);
  const resolvePageRef = useRef(resolvePage);

  useEffect(() => {
    onPageResolveErrorRef.current = onPageResolveError;
    resolvePageRef.current = resolvePage;
  }, [onPageResolveError, resolvePage]);

  const commitResolvedPages = useCallback(
    (update: (nextPages: Map<number, TPage>) => void): void => {
      const nextPages = new Map(resolvedPagesRef.current);
      update(nextPages);
      resolvedPagesRef.current = nextPages;
      setResolvedPages(nextPages);
    },
    []
  );

  const hasResolver = resolvePage !== undefined;

  useEffect(() => {
    if (!hasResolver) {
      return;
    }

    const resolveWindow = new Set<number>();
    for (
      let index = Math.max(0, currentIndex - overscan);
      index <= Math.min(pageCount - 1, currentIndex + overscan);
      index += 1
    ) {
      resolveWindow.add(index);
    }

    for (const [index, controller] of pageRequestsRef.current) {
      if (!resolveWindow.has(index)) {
        controller.abort();
        pageRequestsRef.current.delete(index);
      }
    }

    for (const index of settledIndicesRef.current) {
      if (!resolveWindow.has(index)) {
        settledIndicesRef.current.delete(index);
      }
    }

    const expiredIndices = [...resolvedPagesRef.current.keys()].filter(
      (index) => !resolveWindow.has(index)
    );
    if (expiredIndices.length > 0) {
      // oxlint-disable-next-line react/set-state-in-effect -- A page leaving the window must forget its metadata so it resolves again with a fresh URL.
      commitResolvedPages((nextPages) => {
        for (const index of expiredIndices) {
          nextPages.delete(index);
        }
      });
    }

    const resolvePageAt = async (index: number): Promise<void> => {
      const controller = new AbortController();
      pageRequestsRef.current.set(index, controller);

      try {
        const page = await resolvePageRef.current?.(index, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) {
          return;
        }

        pageRequestsRef.current.delete(index);
        if (page === undefined) {
          settledIndicesRef.current.add(index);
          return;
        }

        commitResolvedPages((nextPages) => {
          nextPages.set(index, page);
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        pageRequestsRef.current.delete(index);
        settledIndicesRef.current.add(index);
        onPageResolveErrorRef.current?.({ cause: error, index });
      }
    };

    const pendingIndices = [...resolveWindow].filter(
      (index) =>
        pages[index] === undefined &&
        !resolvedPagesRef.current.has(index) &&
        !pageRequestsRef.current.has(index) &&
        !settledIndicesRef.current.has(index)
    );

    void Promise.all(pendingIndices.map(resolvePageAt));
  }, [
    commitResolvedPages,
    currentIndex,
    hasResolver,
    overscan,
    pageCount,
    pages,
  ]);

  useEffect(
    () => () => {
      for (const controller of pageRequestsRef.current.values()) {
        controller.abort();
      }
      pageRequestsRef.current.clear();
      settledIndicesRef.current.clear();
    },
    []
  );

  return useMemo(() => {
    if (!hasResolver && pageCount === pages.length) {
      return pages;
    }

    if (pageCount === 0) {
      return EMPTY_PAGES;
    }

    return Array.from(
      { length: pageCount },
      (_, index) => pages[index] ?? resolvedPages.get(index)
    );
  }, [hasResolver, pageCount, pages, resolvedPages]);
};
