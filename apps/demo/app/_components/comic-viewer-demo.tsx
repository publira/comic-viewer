"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";

import { getViewerStyle } from "./viewer-layout";

import styles from "../page.module.css";

interface ComicViewerDemoProps {
  pages: readonly ViewerPage[];
}

/** Renders the shared canvas viewer used by the standard image demo. */
export const ComicViewerDemo = ({ pages }: ComicViewerDemoProps) => (
  <div className={styles.viewer} style={getViewerStyle(pages)}>
    <ComicViewer.Root pages={pages} className={styles.viewerContent}>
      <ComicViewer.Viewport />
      <ComicViewer.Toolbar />
      <ComicViewer.PageNavigation />
    </ComicViewer.Root>
  </div>
);
