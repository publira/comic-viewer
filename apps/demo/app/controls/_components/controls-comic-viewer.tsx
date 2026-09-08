"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";

import { getViewerStyle } from "../../_components/viewer-layout";

import styles from "../page.module.css";

interface ControlsComicViewerProps {
  pages: readonly ViewerPage[];
}

/**
 * Renders the reader with a toolbar of its own, holding the reader-setting
 * toggles next to the reading progress the default toolbar shows alone.
 */
export const ControlsComicViewer = ({ pages }: ControlsComicViewerProps) => (
  <div className={styles.viewer} style={getViewerStyle(pages)}>
    <ComicViewer.Root className={styles.viewerContent} pages={pages}>
      <ComicViewer.Viewport />
      <ComicViewer.Toolbar>
        <ComicViewer.ViewModeToggle />
        <ComicViewer.ReadingDirectionToggle />
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
