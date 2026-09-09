"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";
import { useMemo, useState } from "react";

import { readerClassNames } from "../../../_components/reader-class-names";
import { TailwindReader } from "../../../_components/tailwind-reader";
import { useLazyChapters } from "../../../_components/use-lazy-chapters";

// Lazily resolved metadata is what this demo is about, so the page standing in
// for one still on its way is styled here rather than in the shared reader.
const renderPendingPage = () => (
  <ComicViewer.ViewportPendingPage
    className={readerClassNames.viewportPendingPage}
  />
);

interface LazyReaderProps {
  pages: readonly ViewerPage[];
}

const statClassName =
  "flex flex-1 basis-48 flex-col gap-1 rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900";

/** How many spreads beyond the viewport this demo loads ahead of the reader. */
const IMAGE_PRELOAD_SPREADS = 1;

/** Renders a reader whose page metadata arrives as the reader reaches it. */
export const LazyReader = ({ pages }: LazyReaderProps) => {
  const [decodedImageCount, setDecodedImageCount] = useState(0);
  // The hook reads each decoded page without returning one of its own, so the
  // viewer keeps drawing the image it decoded.
  const plugins = useMemo(
    () => [
      ComicViewer.definePlugin({
        afterDecode: () => {
          setDecodedImageCount((count) => count + 1);
        },
        name: "count-decoded-pages",
      }),
    ],
    []
  );
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
        className="aspect-[4/5] min-h-96 w-full md:aspect-[8/5]"
      >
        <TailwindReader
          imagePreloadSpreads={IMAGE_PRELOAD_SPREADS}
          onEndReached={loadNextChapter}
          pageCount={pageCount}
          plugins={plugins}
          renderPendingPage={renderPendingPage}
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
            Page images decoded
          </span>
          <output
            aria-label="Page images decoded"
            className="text-lg font-semibold tabular-nums"
          >
            {decodedImageCount}
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
