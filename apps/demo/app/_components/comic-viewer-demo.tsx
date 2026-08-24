"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ReadingDirection, ViewerPage } from "@publira/comic-viewer";

import { getViewerStyle } from "./viewer-layout";

import styles from "../page.module.css";

interface ComicViewerDemoProps {
  initialReadingDirection?: ReadingDirection;
  pages: readonly ViewerPage[];
  spreadStartIndex?: number;
}

/** Renders the shared canvas viewer used by the standard image demo. */
export const ComicViewerDemo = ({
  initialReadingDirection,
  pages,
  spreadStartIndex,
}: ComicViewerDemoProps) => (
  <div className={styles.viewer} style={getViewerStyle(pages)}>
    <ComicViewer.Root
      className={styles.viewerContent}
      initialReadingDirection={initialReadingDirection}
      pages={pages}
      spreadStartIndex={spreadStartIndex}
    >
      <ComicViewer.Viewport />
      <ComicViewer.Toolbar />
      <ComicViewer.PageNavigation />
    </ComicViewer.Root>
  </div>
);
