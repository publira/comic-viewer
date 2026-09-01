"use client";

import type { ViewerPage } from "@publira/comic-viewer";

import { TailwindReader } from "../../_components/tailwind-reader";
import { useLazyChapters } from "../../_components/use-lazy-chapters";

interface LazyReaderProps {
  pages: readonly ViewerPage[];
}

const statClassName =
  "flex flex-1 basis-48 flex-col gap-1 rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900";

/** Renders a reader whose page metadata arrives as the reader reaches it. */
export const LazyReader = ({ pages }: LazyReaderProps) => {
  const {
    chapterCount,
    isLoadingChapter,
    loadNextChapter,
    loadedChapterCount,
    pageCount,
    requestCount,
    resolvePage,
  } = useLazyChapters(pages);

  return (
    <>
      <section
        aria-label="Comic reader"
        className="aspect-[8/5] min-h-96 w-full"
      >
        <TailwindReader
          onEndReached={loadNextChapter}
          pageCount={pageCount}
          resolvePage={resolvePage}
        />
      </section>
      <div className="flex flex-wrap gap-3">
        <div className={statClassName}>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            Pages available
          </span>
          <output
            aria-label="Pages available"
            className="text-lg font-semibold tabular-nums"
          >
            {pageCount} of {pages.length}
          </output>
        </div>
        <div className={statClassName}>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            Metadata requests
          </span>
          <output
            aria-label="Metadata requests"
            className="text-lg font-semibold tabular-nums"
          >
            {requestCount}
          </output>
        </div>
        <div className={statClassName}>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            Chapters loaded
          </span>
          <output
            aria-label="Chapters loaded"
            className="text-lg font-semibold tabular-nums"
          >
            {isLoadingChapter
              ? "Loading…"
              : `${loadedChapterCount} of ${chapterCount}`}
          </output>
        </div>
      </div>
    </>
  );
};
