"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";

import { getViewerStyle } from "#components/viewer-layout";

import styles from "../page.module.css";

const ZOOM_STEP = 0.5;

/**
 * Zooms the spread in and out, reads the scale back, and resets it. None of
 * these controls is part of the library: they are built from `zoomScale`, its
 * limits, `setZoomScale`, and `resetZoom` alone.
 */
const ZoomControls = () => {
  const { maxZoomScale, minZoomScale, resetZoom, setZoomScale, zoomScale } =
    ComicViewer.useViewerContext();

  return (
    <div className={styles.zoomControls}>
      <button
        aria-label="Zoom out"
        className={styles.zoomButton}
        disabled={zoomScale <= minZoomScale}
        onClick={() => setZoomScale(zoomScale - ZOOM_STEP)}
        type="button"
      >
        −
      </button>
      <output aria-label="Zoom scale" className={styles.zoomScale}>
        {Math.round(zoomScale * 100)}%
      </output>
      <button
        aria-label="Zoom in"
        className={styles.zoomButton}
        disabled={zoomScale >= maxZoomScale}
        onClick={() => setZoomScale(zoomScale + ZOOM_STEP)}
        type="button"
      >
        +
      </button>
      <button
        className={styles.zoomButton}
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

/** Renders a reader whose toolbar zooms the spread through the viewer context. */
export const ZoomComicViewer = ({ pages }: ZoomComicViewerProps) => (
  <div className={styles.viewer} style={getViewerStyle(pages)}>
    <ComicViewer.Root className={styles.viewerContent} pages={pages}>
      <ComicViewer.Viewport />
      <ComicViewer.Toolbar className={styles.toolbar}>
        <ZoomControls />
        <ComicViewer.PageProgress className={styles.pageProgress}>
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
