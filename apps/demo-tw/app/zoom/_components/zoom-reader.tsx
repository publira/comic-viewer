"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";

import { readerClassNames } from "../../_components/reader-class-names";
import { TailwindReader } from "../../_components/tailwind-reader";
import { zoomClassNames } from "./zoom-class-names";

/**
 * Reports the zoom scale the viewer context carries and offers the reset it
 * exposes. Neither the readout nor the button is part of the library: both are
 * built from `zoomScale` and `resetZoom` alone.
 */
const ZoomStatus = () => {
  const { resetZoom, zoomScale } = ComicViewer.useViewerContext();

  return (
    <div className={zoomClassNames.zoomStatus}>
      <output aria-label="Zoom scale" className={zoomClassNames.zoomScale}>
        {Math.round(zoomScale * 100)}%
      </output>
      <button
        className={readerClassNames.settingToggle}
        disabled={zoomScale === 1}
        onClick={resetZoom}
        type="button"
      >
        Reset zoom
      </button>
    </div>
  );
};

interface ZoomReaderProps {
  pages: readonly ViewerPage[];
}

/**
 * Renders the shared reader with a toolbar that reads the zoom scale back out
 * of the viewer, composed as a child so that it replaces the default one.
 */
export const ZoomReader = ({ pages }: ZoomReaderProps) => (
  <TailwindReader pages={pages}>
    <ComicViewer.Toolbar className={readerClassNames.toolbar}>
      <ZoomStatus />
      <ComicViewer.PageProgress className={readerClassNames.pageProgress}>
        <ComicViewer.PageProgressSlider
          className={readerClassNames.pageProgressSlider}
        />
        <ComicViewer.PageStatus className={readerClassNames.pageStatus} />
      </ComicViewer.PageProgress>
      <div
        aria-label="Page fit"
        className={readerClassNames.pageFitModeGroup}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- A row of toggle buttons is a group of controls, not the form fieldset the semantic tags stand for.
        role="group"
      >
        <ComicViewer.PageFitModeToggle
          className={readerClassNames.settingToggle}
          mode="height"
        />
        <ComicViewer.PageFitModeToggle
          className={readerClassNames.settingToggle}
          mode="width"
        />
        <ComicViewer.PageFitModeToggle
          className={readerClassNames.settingToggle}
          mode="actual"
        />
      </div>
    </ComicViewer.Toolbar>
  </TailwindReader>
);
