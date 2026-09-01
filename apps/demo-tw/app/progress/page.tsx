import { basicSamplePages } from "../_components/sample-pages";
import { SourceCodePanel } from "../_components/source-code-panel";
import { ProgressReader } from "./_components/progress-reader";

const sourceCode = `import { useCallback, useSyncExternalStore } from "react";

import { Reader } from "./reader";

const getStorageKey = (documentId) =>
  \`comic-viewer:reading-progress:\${documentId}\`;

// The position of every document opened this session, seeded from storage the
// first time a document is asked for and written through to it on every turn.
// The session's own copy is what keeps a reader whose browser refuses storage
// turning pages; only the position outliving the session is lost.
const sessionProgress = new Map();
const progressListeners = new Set();

const subscribeToProgress = (onProgressChange) => {
  progressListeners.add(onProgressChange);

  return () => {
    progressListeners.delete(onProgressChange);
  };
};

const getProgress = (documentId) => {
  const sessionIndex = sessionProgress.get(documentId);

  if (sessionIndex !== undefined) {
    return sessionIndex;
  }

  let storedIndex = null;

  try {
    storedIndex = window.localStorage.getItem(getStorageKey(documentId));
  } catch {
    // A browser set to block site data throws on the very first access.
  }

  // Storage holds whatever an earlier version of an application wrote, so a
  // value that is not a page index is dropped.
  const index = Number(storedIndex);
  const progress =
    storedIndex !== null && Number.isInteger(index) && index >= 0 ? index : null;

  sessionProgress.set(documentId, progress);

  return progress;
};

const setProgress = (documentId, index) => {
  sessionProgress.set(documentId, index);

  try {
    if (index === null) {
      window.localStorage.removeItem(getStorageKey(documentId));
    } else {
      window.localStorage.setItem(getStorageKey(documentId), String(index));
    }
  } catch {
    // The position still stands for as long as this session does.
  }

  for (const listener of progressListeners) {
    listener();
  }
};

// Rendering happens on the server too, where there is no storage to read.
// Its snapshot is a value of its own, so that a position still on its way is
// never taken for a document that has none.
const unrestored = Symbol("unrestored");
const getServerSnapshot = () => unrestored;

const useReadingProgress = (documentId, pageCount) => {
  const storedIndex = useSyncExternalStore(
    subscribeToProgress,
    useCallback(() => getProgress(documentId), [documentId]),
    getServerSnapshot
  );

  const saveIndex = useCallback(
    (index) => setProgress(documentId, index),
    [documentId]
  );

  const resetProgress = useCallback(
    () => setProgress(documentId, null),
    [documentId]
  );

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

export const ProgressReader = ({ documentId, pages }) => {
  const { currentIndex, isRestored, resetProgress, saveIndex, storedIndex } =
    useReadingProgress(documentId, pages.length);

  // The reader waits for the frame it takes to read the position back, so that
  // it opens on the stored page instead of fetching the first one and turning
  // away from it.
  if (!isRestored) {
    return <p className="grid h-full w-full place-items-center">Restoring…</p>;
  }

  return (
    <>
      <Reader
        currentIndex={currentIndex}
        onIndexChange={saveIndex}
        pages={pages}
      />
      <button
        className="rounded-xl border border-slate-300 px-4 py-3 disabled:opacity-50"
        disabled={storedIndex === null}
        onClick={resetProgress}
        type="button"
      >
        Start over
      </button>
    </>
  );
};`;

const ProgressPage = () => (
  <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8 dark:bg-slate-950 dark:text-slate-100">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <ProgressReader pages={basicSamplePages} />
      <section className="rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-semibold">Remember the reading position</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Turn a few pages and reload this page: the reader opens where it was
          left. Nothing about that lives in the viewer, because where a position
          belongs — this browser, this session, or an account that follows a
          reader between devices — is a decision only the application can make.
          This demo keeps it in <code>localStorage</code> under a key that
          carries the document, so one origin can remember a position per
          document; swapping those two storage calls for requests to a backend
          is the whole difference between the two.
        </p>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          The position is held in the application and handed back to the viewer
          as <code>currentIndex</code>, with <code>onIndexChange</code> writing
          every page the reader turns to. A controlled index is what lets the
          &ldquo;Start over&rdquo; button return the reader to the first page as
          it clears the stored one; <code>initialIndex</code> is read once, when
          the viewer mounts, and would leave the reader where it was. An
          application writing to a network instead should debounce these calls,
          which arrive one per page turn.
        </p>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Storage is an external store, and the hook reads it through{" "}
          <code>useSyncExternalStore</code> rather than while rendering: it does
          not exist on the server, and reading it during a render would make the
          markup React hydrates differ from the markup the server sent. The
          reader is held back for the one frame that takes, so that it opens on
          the stored page instead of fetching the first one and turning away
          from it. A browser that refuses storage outright, such as Safari in a
          private window, throws on the very first access; the position lives
          for as long as the tab does there, and an index stored for a document
          that has since grown shorter is clamped to the pages it now holds.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default ProgressPage;
