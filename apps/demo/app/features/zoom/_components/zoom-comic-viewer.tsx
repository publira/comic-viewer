"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";

import { getViewerStyle } from "#components/viewer-layout";

import styles from "../page.module.css";

/**
 * Reports the zoom scale the viewer context carries and offers the reset it
 * exposes. Neither the readout nor the button is part of the library: both are
 * built from `zoomScale` and `resetZoom` alone.
 */
const ZoomStatus = () => {
  const { resetZoom, zoomScale } = ComicViewer.useViewerContext();

  return (
    <div className={styles.zoomStatus}>
      <output aria-label="Zoom scale" className={styles.zoomScale}>
        {Math.round(zoomScale * 100)}%
      </output>
      <button
        className={styles.resetZoomButton}
        disabled={zoomScale === 1}
        onClick={resetZoom}
        type="button"
      >
        Reset zoom
      </button>
    </div>
  );
};

interface ZoomComicViewerProps {
  pages: readonly ViewerPage[];
}

/** Renders a reader whose toolbar reads the zoom scale back out of the viewer. */
export const ZoomComicViewer = ({ pages }: ZoomComicViewerProps) => (
  <div className={styles.viewer} style={getViewerStyle(pages)}>
    <ComicViewer.Root className={styles.viewerContent} pages={pages}>
      <ComicViewer.Viewport />
      <ComicViewer.Toolbar>
        <ZoomStatus />
        <ComicViewer.PageProgress>
          <ComicViewer.PageProgressSlider />
          <ComicViewer.PageStatus />
        </ComicViewer.PageProgress>
        <div
          aria-label="Page fit"
          className={styles.pageFitModeGroup}
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- A row of toggle buttons is a group of controls, not the form fieldset the semantic tags stand for.
          role="group"
        >
          <ComicViewer.PageFitModeToggle mode="height" />
          <ComicViewer.PageFitModeToggle mode="width" />
          <ComicViewer.PageFitModeToggle mode="actual" />
        </div>
      </ComicViewer.Toolbar>
      <ComicViewer.PageNavigation />
    </ComicViewer.Root>
  </div>
);
