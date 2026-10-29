import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Provider } from "react";

import type { PageMetadata, ViewerPage } from "./viewer-context";

/** The context a page resolver receives with every request. */
export interface PageResolveContext {
  /** Aborts once the viewer stops needing the page. */
  signal: AbortSignal;
}

/**
 * Resolves the metadata of a single page on demand, so a viewer can be given a
 * `pageCount` instead of the whole page list. Returning `undefined` leaves the
 * page unresolved until it enters the resolve window again, and rejecting
 * leaves it failed until a retry is asked for through `usePageResolveState`.
 */
export type PageResolver<TPage extends PageMetadata = ViewerPage> = (
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
 * Where a page stands in metadata resolution. `"idle"` is a page not asked for
 * yet or one the resolver returned `undefined` for, and `"error"` is one whose
 * resolver rejected.
 */
export type PageResolveStatus = "idle" | "resolving" | "resolved" | "error";

/** The metadata resolution state of a single page. */
export interface PageResolveState {
  /** The last failure for this page, kept until a retry settles. */
  error?: PageResolveError;
  index: number;
  /** Asks the resolver again for a failed page. Does nothing otherwise. */
  retry: () => void;
  status: PageResolveStatus;
}

/** A page with a request in flight or a failure to report. */
interface PageRequestState {
  error?: PageResolveError;
  status: "resolving" | "error";
}

/** What `usePageResolveState` reads from the provider. */
export interface PageResolveStore {
  pages: readonly (PageMetadata | undefined)[];
  requestStates: ReadonlyMap<number, PageRequestState>;
  retryPageResolution: (index: number) => void;
}

const PageResolveStoreContext = createContext<PageResolveStore | null>(null);

export const PageResolveStoreProvider: Provider<PageResolveStore | null> =
  PageResolveStoreContext.Provider;

/** Reads the store of the enclosing ViewerProvider. */
export const usePageResolveStore = (consumerName: string): PageResolveStore => {
  const store = useContext(PageResolveStoreContext);
  if (store === null) {
    throw new Error(`${consumerName} must be used within a ViewerProvider`);
  }

  return store;
};

export const getPageResolveStatus = (
  store: PageResolveStore,
  index: number
): PageResolveStatus =>
  store.pages[index] === undefined
    ? (store.requestStates.get(index)?.status ?? "idle")
    : "resolved";

/**
 * Reads where the page at `index` stands in metadata resolution, so a pending
 * page can tell a page on its way from one that failed and offer a retry.
 */
export const usePageResolveState = (index: number): PageResolveState => {
  const store = usePageResolveStore("usePageResolveState");
  const { retryPageResolution } = store;
  const status = getPageResolveStatus(store, index);
  const error =
    status === "resolved" ? undefined : store.requestStates.get(index)?.error;
  const retry = useCallback(() => {
    retryPageResolution(index);
  }, [index, retryPageResolution]);

  return useMemo(
    () => ({ error, index, retry, status }),
    [error, index, retry, status]
  );
};

/**
 * How many pages on either side of the current one are resolved ahead of the
 * reader by default. It covers a double-page spread and the spread that
 * follows it, so a page turn finds its metadata already resolved.
 */
export const DEFAULT_PAGE_RESOLVE_OVERSCAN = 4;

/**
 * How far from the current index a resolved page is retained however narrow
 * the resolve window is. The rail renders the spread before and the spread
 * after the displayed one, and the displayed spread trails the current index
 * by a whole spread while a page turn runs, which reaches five pages ahead of
 * it. Retaining that much keeps a page the rail is still rendering from losing
 * its metadata mid-transition.
 */
const RAIL_RETENTION_DISTANCE = 5;

const EMPTY_PAGES: readonly never[] = [];

interface UsePageSourceOptions<TPage extends PageMetadata> {
  currentIndex: number;
  onPageResolveError?: (error: PageResolveError) => void;
  overscan: number;
  pageCount: number;
  pages: readonly (TPage | undefined)[];
  resolvePage?: PageResolver<TPage>;
}

interface PageSource<TPage extends PageMetadata> {
  pages: readonly (TPage | undefined)[];
  resolveStore: PageResolveStore;
}

/**
 * Merges the statically provided pages with the ones a resolver produces on
 * demand, into a list of `pageCount` entries where an unresolved page reads as
 * `undefined`.
 *
 * Only the pages within `overscan` of the current index are asked for. A
 * resolved page keeps its metadata while it stays within that window or within
 * the reach of the rail, whichever is further, and loses it beyond that, so a
 * page returned to later is resolved again, which is what keeps expiring URLs
 * usable.
 */
export const usePageSource = <TPage extends PageMetadata>({
  currentIndex,
  onPageResolveError,
  overscan,
  pageCount,
  pages,
  resolvePage,
}: UsePageSourceOptions<TPage>): PageSource<TPage> => {
  const [resolvedPages, setResolvedPages] = useState<
    ReadonlyMap<number, TPage>
  >(() => new Map());
  const resolvedPagesRef = useRef<ReadonlyMap<number, TPage>>(new Map());
  const [requestStates, setRequestStates] = useState<
    ReadonlyMap<number, PageRequestState>
  >(() => new Map());
  const requestStatesRef = useRef<ReadonlyMap<number, PageRequestState>>(
    new Map()
  );
  const pageRequestsRef = useRef(new Map<number, AbortController>());
  // An index that failed, or that the resolver declined, is not asked again
  // until it leaves the resolve window or a retry is asked for, so a failure
  // cannot become a loop.
  const settledIndicesRef = useRef(new Set<number>());
  const onPageResolveErrorRef = useRef(onPageResolveError);
  const pagesRef = useRef(pages);
  const resolvePageRef = useRef(resolvePage);

  useEffect(() => {
    onPageResolveErrorRef.current = onPageResolveError;
    pagesRef.current = pages;
    resolvePageRef.current = resolvePage;
  }, [onPageResolveError, pages, resolvePage]);

  const commitResolvedPages = useCallback(
    (update: (nextPages: Map<number, TPage>) => void): void => {
      const nextPages = new Map(resolvedPagesRef.current);
      update(nextPages);
      resolvedPagesRef.current = nextPages;
      setResolvedPages(nextPages);
    },
    []
  );

  const commitRequestStates = useCallback(
    (update: (nextStates: Map<number, PageRequestState>) => void): void => {
      const nextStates = new Map(requestStatesRef.current);
      update(nextStates);
      requestStatesRef.current = nextStates;
      setRequestStates(nextStates);
    },
    []
  );

  const resolvePageAt = useCallback(
    async (index: number): Promise<void> => {
      const controller = new AbortController();
      pageRequestsRef.current.set(index, controller);
      // A retry keeps the failure it follows until it settles.
      const previousError = requestStatesRef.current.get(index)?.error;
      commitRequestStates((nextStates) => {
        nextStates.set(
          index,
          previousError === undefined
            ? { status: "resolving" }
            : { error: previousError, status: "resolving" }
        );
      });

      try {
        const page = await resolvePageRef.current?.(index, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) {
          return;
        }

        pageRequestsRef.current.delete(index);
        commitRequestStates((nextStates) => {
          nextStates.delete(index);
        });
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

        const resolveError = { cause: error, index };
        pageRequestsRef.current.delete(index);
        settledIndicesRef.current.add(index);
        commitRequestStates((nextStates) => {
          nextStates.set(index, { error: resolveError, status: "error" });
        });
        onPageResolveErrorRef.current?.(resolveError);
      }
    },
    [commitRequestStates, commitResolvedPages]
  );

  const retryPageResolution = useCallback(
    (index: number): void => {
      if (
        requestStatesRef.current.get(index)?.status !== "error" ||
        pagesRef.current[index] !== undefined
      ) {
        return;
      }

      settledIndicesRef.current.delete(index);
      void resolvePageAt(index);
    },
    [resolvePageAt]
  );

  const hasResolver = resolvePage !== undefined;

  useEffect(() => {
    if (!hasResolver) {
      return;
    }

    const pageWindow = (distance: number): Set<number> => {
      const indices = new Set<number>();

      for (
        let index = Math.max(0, currentIndex - distance);
        index <= Math.min(pageCount - 1, currentIndex + distance);
        index += 1
      ) {
        indices.add(index);
      }

      return indices;
    };
    const resolveWindow = pageWindow(overscan);
    // A page the rail still renders keeps its metadata even once it falls
    // outside the resolve window, so a narrow window cannot turn the spread a
    // page turn is leaving behind into pending placeholders.
    const retainedWindow =
      overscan >= RAIL_RETENTION_DISTANCE
        ? resolveWindow
        : pageWindow(RAIL_RETENTION_DISTANCE);

    for (const [index, controller] of pageRequestsRef.current) {
      if (!retainedWindow.has(index)) {
        controller.abort();
        pageRequestsRef.current.delete(index);
      }
    }

    for (const index of settledIndicesRef.current) {
      if (!retainedWindow.has(index)) {
        settledIndicesRef.current.delete(index);
      }
    }

    const leftRequestIndices = [...requestStatesRef.current.keys()].filter(
      (index) => !retainedWindow.has(index)
    );
    if (leftRequestIndices.length > 0) {
      // oxlint-disable-next-line react/set-state-in-effect -- A page leaving the window forgets its failure along with the request it aborts.
      commitRequestStates((nextStates) => {
        for (const index of leftRequestIndices) {
          nextStates.delete(index);
        }
      });
    }

    const expiredIndices = [...resolvedPagesRef.current.keys()].filter(
      (index) => !retainedWindow.has(index)
    );
    if (expiredIndices.length > 0) {
      // oxlint-disable-next-line react/set-state-in-effect -- A page leaving the window must forget its metadata so it resolves again with a fresh URL.
      commitResolvedPages((nextPages) => {
        for (const index of expiredIndices) {
          nextPages.delete(index);
        }
      });
    }

    const pendingIndices = [...resolveWindow].filter(
      (index) =>
        pages[index] === undefined &&
        !resolvedPagesRef.current.has(index) &&
        !pageRequestsRef.current.has(index) &&
        !settledIndicesRef.current.has(index)
    );

    void Promise.all(pendingIndices.map(resolvePageAt));
  }, [
    commitRequestStates,
    commitResolvedPages,
    currentIndex,
    hasResolver,
    overscan,
    pageCount,
    pages,
    resolvePageAt,
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

  const sourcePages = useMemo(() => {
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

  const resolveStore = useMemo(
    () => ({ pages: sourcePages, requestStates, retryPageResolution }),
    [requestStates, retryPageResolution, sourcePages]
  );

  return { pages: sourcePages, resolveStore };
};
