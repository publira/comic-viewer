"use client";

import { ComicViewer } from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";

import "@publira/comic-viewer/core.css";
import { getViewerStyle } from "./viewer-layout";

import styles from "../page.module.css";

interface ComicViewerDemoProps {
  pages: readonly ViewerPage[];
}

export const ComicViewerDemo = ({ pages }: ComicViewerDemoProps) => (
  <div className={styles.viewer} style={getViewerStyle(pages)}>
    <ComicViewer pages={pages} className={styles.viewerContent}>
      <ComicViewer.Viewport />
    </ComicViewer>
  </div>
);
