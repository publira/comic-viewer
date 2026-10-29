"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";
import { useMemo, useState } from "react";

import { useLazyChapters } from "#components/use-lazy-chapters";
import { getViewerStyle } from "#components/viewer-layout";

import styles from "../page.module.css";

interface LazyComicViewerProps {
  pages: readonly ViewerPage[];
}

/**
 * Stands in for a page whose metadata is on its way, and offers a retry once
 * the endpoint has failed for it.
 */
const PendingPage = ({ index }: { index: number }) => {
  const { retry, status } = ComicViewer.usePageResolveState(index);

  return (
    <ComicViewer.ViewportPendingPage>
      {status === "error" && (
        <div className={styles.pendingError} role="alert">
          <p>Page {index + 1} could not be resolved.</p>
          <button className={styles.retryButton} onClick={retry} type="button">
            Try again
          </button>
        </div>
      )}
    </ComicViewer.ViewportPendingPage>
  );
};

const renderPendingPage = (index: number) => <PendingPage index={index} />;

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
    failsRequests,
    isLoadingChapter,
    loadNextChapter,
    loadedChapterCount,
    pageCount,
    requestCount,
    resolvePage,
    setFailsRequests,
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
          <ComicViewer.Viewport renderPendingPage={renderPendingPage} />
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
      <label className={styles.failureSwitch}>
        <input
          checked={failsRequests}
          onChange={(event) => {
            setFailsRequests(event.target.checked);
          }}
          type="checkbox"
        />
        Fail page-metadata requests
      </label>
    </>
  );
};
