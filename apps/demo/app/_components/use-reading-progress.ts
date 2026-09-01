"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Namespaced, so one origin can hold the progress of many documents. */
const getStorageKey = (documentId: string) =>
  `comic-viewer:reading-progress:${documentId}`;

/**
 * Reads the position stored for a document, or `null` when there is none.
 *
 * Storage holds whatever an earlier version of an application wrote, so a
 * value that is not a page index is dropped rather than handed to the viewer,
 * and a browser set to block site data throws on the very first access.
 */
const readStoredIndex = (documentId: string): number | null => {
  let storedIndex: string | null;

  try {
    storedIndex = window.localStorage.getItem(getStorageKey(documentId));
  } catch {
    return null;
  }

  // An empty entry would read as zero, which is a page rather than nothing.
  if (storedIndex === null || storedIndex.trim() === "") {
    return null;
  }

  const index = Number(storedIndex);

  return Number.isInteger(index) && index >= 0 ? index : null;
};

/**
 * The position of every document opened this session, and the store the hook
 * subscribes to. It is seeded from `localStorage` the first time a document is
 * asked for, and written through to it on every turn. Holding the session's
 * own copy is what lets a reader whose browser refuses storage — Safari in a
 * private window, or one set to block site data — keep turning pages: only the
 * position outliving the session is lost.
 */
const sessionProgress = new Map<string, number | null>();
const progressListeners = new Set<() => void>();

const subscribeToProgress = (onProgressChange: () => void) => {
  progressListeners.add(onProgressChange);

  return () => {
    progressListeners.delete(onProgressChange);
  };
};

/** Reads through to storage once per document, then answers from the map. */
const getProgress = (documentId: string): number | null => {
  const sessionIndex = sessionProgress.get(documentId);

  if (sessionIndex !== undefined) {
    return sessionIndex;
  }

  const storedIndex = readStoredIndex(documentId);
  sessionProgress.set(documentId, storedIndex);

  return storedIndex;
};

/** Records a position, or forgets it when given `null`. */
const setProgress = (documentId: string, index: number | null) => {
  sessionProgress.set(documentId, index);

  try {
    if (index === null) {
      window.localStorage.removeItem(getStorageKey(documentId));
    } else {
      window.localStorage.setItem(getStorageKey(documentId), String(index));
    }
  } catch {
    // The position still stands for this session; nothing else is recoverable.
  }

  for (const listener of progressListeners) {
    listener();
  }
};

/**
 * Rendering happens on the server too, where there is no storage to read. The
 * snapshot it renders from is its own value rather than `null`, so that a
 * position still on its way is never taken for a document that has none.
 */
const unrestored = Symbol("unrestored");

/** A stored index, `null` where a document has none, or the server's own. */
type ProgressSnapshot = number | null | typeof unrestored;

const getServerSnapshot = (): ProgressSnapshot => unrestored;

interface ReadingProgress {
  /** The zero-based index to hand the viewer as `currentIndex`. */
  currentIndex: number;
  /**
   * Whether the stored position has been read back yet. It is false on the
   * server and through hydration, where there is no storage to ask.
   */
  isRestored: boolean;
  /** Forgets the stored position and opens the document at its first page. */
  resetProgress: () => void;
  /** Records the page the reader turned to. Passed as `onIndexChange`. */
  saveIndex: (index: number) => void;
  /** The remembered zero-based index, or `null` while none is remembered. */
  storedIndex: number | null;
}

/**
 * Keeps the page a document was left on in `localStorage`, keyed by document.
 *
 * The viewer holds no opinion about persistence, because where a position
 * belongs — this browser, this session, or an account that follows a reader
 * between devices — is a decision only the application can make. Swapping the
 * storage calls in `getProgress` and `setProgress` for requests to a backend
 * is the whole difference between the two.
 */
export const useReadingProgress = (
  documentId: string,
  pageCount: number
): ReadingProgress => {
  // Storage is an external store, and reading it while rendering would make
  // the markup React hydrates differ from the markup the server sent. The
  // snapshot the server renders from is what tells a component that the
  // position has not been read back yet.
  const storedIndex = useSyncExternalStore<ProgressSnapshot>(
    subscribeToProgress,
    useCallback(() => getProgress(documentId), [documentId]),
    getServerSnapshot
  );

  const saveIndex = useCallback(
    (index: number) => {
      setProgress(documentId, index);
    },
    [documentId]
  );

  const resetProgress = useCallback(() => {
    setProgress(documentId, null);
  }, [documentId]);

  const restoredIndex = typeof storedIndex === "number" ? storedIndex : null;

  return {
    // A document can be shorter than it was when the position was stored, so
    // the index is held inside the document rather than trusted as it comes.
    currentIndex: Math.min(restoredIndex ?? 0, Math.max(0, pageCount - 1)),
    isRestored: storedIndex !== unrestored,
    resetProgress,
    saveIndex,
    storedIndex: restoredIndex,
  };
};
