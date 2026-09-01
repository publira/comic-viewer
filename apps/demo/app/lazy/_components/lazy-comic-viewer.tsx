"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";

import { useLazyChapters } from "../../_components/use-lazy-chapters";
import { getViewerStyle } from "../../_components/viewer-layout";

import styles from "../page.module.css";

interface LazyComicViewerProps {
  pages: readonly ViewerPage[];
}

/** Renders a reader whose page metadata arrives as the reader reaches it. */
export const LazyComicViewer = ({ pages }: LazyComicViewerProps) => {
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
          onEndReached={loadNextChapter}
          pageCount={pageCount}
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
