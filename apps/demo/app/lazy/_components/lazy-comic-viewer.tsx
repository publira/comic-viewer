"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";
import { useMemo, useState } from "react";

import { useLazyChapters } from "../../_components/use-lazy-chapters";
import { getViewerStyle } from "../../_components/viewer-layout";

import styles from "../page.module.css";

interface LazyComicViewerProps {
  pages: readonly ViewerPage[];
}

/** How many spreads beyond the viewport this demo loads ahead of the reader. */
const IMAGE_PRELOAD_SPREADS = 1;

/** Renders a reader whose page metadata arrives as the reader reaches it. */
export const LazyComicViewer = ({ pages }: LazyComicViewerProps) => {
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
      {/* Every page of this document is the same size, so the box the reader
          sits in is shaped before any metadata has been resolved. */}
      <div className={styles.viewer} style={getViewerStyle(pages)}>
        <ComicViewer.Root
          className={styles.viewerContent}
          imagePreloadSpreads={IMAGE_PRELOAD_SPREADS}
          onEndReached={loadNextChapter}
          pageCount={pageCount}
          plugins={plugins}
          resolvePage={resolvePage}
        >
          <ComicViewer.Viewport />
          <ComicViewer.Toolbar />
          <ComicViewer.PageNavigation />
        </ComicViewer.Root>
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Pages available</span>
          <output aria-label="Pages available" className={styles.statValue}>
            {pageCount} of {pages.length}
          </output>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Metadata requests</span>
          <output aria-label="Metadata requests" className={styles.statValue}>
            {requestCount}
          </output>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Page images decoded</span>
          <output aria-label="Page images decoded" className={styles.statValue}>
            {decodedImageCount}
          </output>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Chapters loaded</span>
          <output aria-label="Chapters loaded" className={styles.statValue}>
            {isLoadingChapter
              ? "Loading…"
              : `${loadedChapterCount} of ${chapterCount}`}
          </output>
        </div>
      </div>
    </>
  );
};
