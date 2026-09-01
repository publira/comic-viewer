"use client";

import type { ViewerPage } from "@publira/comic-viewer";

import { TailwindReader } from "../../_components/tailwind-reader";
import { useReadingProgress } from "../../_components/use-reading-progress";

/** What the stored position is keyed by. A real one would be a slug or an ID. */
const documentId = "basic-sample";

interface ProgressReaderProps {
  pages: readonly ViewerPage[];
}

/** Renders a reader that opens on the page it was last left on. */
export const ProgressReader = ({ pages }: ProgressReaderProps) => {
  const { currentIndex, isRestored, resetProgress, saveIndex, storedIndex } =
    useReadingProgress(documentId, pages.length);

  return (
    <>
      <section
        aria-label="Comic reader"
        className="aspect-[8/5] min-h-96 w-full"
      >
        {isRestored ? (
          <TailwindReader
            currentIndex={currentIndex}
            onIndexChange={saveIndex}
            pages={pages}
          />
        ) : (
          // The reader waits for the frame it takes to read storage, so that
          // it opens on the stored page instead of fetching the first one and
          // turning away from it.
          <p className="grid h-full w-full place-items-center rounded-xl bg-slate-950 text-sm text-slate-300">
            Restoring your place…
          </p>
        )}
      </section>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 basis-48 flex-col gap-1 rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <span className="text-xs text-slate-600 dark:text-slate-400">
            Saved position
          </span>
          <output
            aria-label="Saved position"
            className="text-lg font-semibold tabular-nums"
          >
            {storedIndex === null
              ? "Not saved yet"
              : `Page ${currentIndex + 1}`}
          </output>
        </div>
        <button
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          disabled={storedIndex === null}
          onClick={resetProgress}
          type="button"
        >
          Start over
        </button>
      </div>
    </>
  );
};
