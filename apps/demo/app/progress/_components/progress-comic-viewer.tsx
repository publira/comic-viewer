"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";

import { useReadingProgress } from "../../_components/use-reading-progress";
import { getViewerStyle } from "../../_components/viewer-layout";

import styles from "../page.module.css";

/** What the stored position is keyed by. A real one would be a slug or an ID. */
const documentId = "basic-sample";

interface ProgressComicViewerProps {
  pages: readonly ViewerPage[];
}

/** Renders a reader that opens on the page it was last left on. */
export const ProgressComicViewer = ({ pages }: ProgressComicViewerProps) => {
  const { currentIndex, isRestored, resetProgress, saveIndex, storedIndex } =
    useReadingProgress(documentId, pages.length);

  return (
    <>
      <div className={styles.viewer} style={getViewerStyle(pages)}>
        {isRestored ? (
          <ComicViewer.Root
            className={styles.viewerContent}
            currentIndex={currentIndex}
            onIndexChange={saveIndex}
            pages={pages}
          >
            <ComicViewer.Viewport />
            <ComicViewer.Toolbar />
            <ComicViewer.PageNavigation />
          </ComicViewer.Root>
        ) : (
          // The reader waits for the frame it takes to read storage, so that
          // it opens on the stored page instead of fetching the first one and
          // turning away from it.
          <p className={styles.restoring}>Restoring your place…</p>
        )}
      </div>
      <div className={styles.progress}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Saved position</span>
          <output aria-label="Saved position" className={styles.statValue}>
            {storedIndex === null
              ? "Not saved yet"
              : `Page ${currentIndex + 1}`}
          </output>
        </div>
        <button
          className={styles.resetButton}
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
