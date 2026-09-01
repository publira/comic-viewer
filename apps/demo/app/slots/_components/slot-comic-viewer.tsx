"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";
import Link from "next/link";

import { getViewerStyle } from "../../_components/viewer-layout";

import styles from "../page.module.css";

interface SlotComicViewerProps {
  pages: readonly ViewerPage[];
}

/** Renders a reader that opens on a notice and closes on a chapter link. */
export const SlotComicViewer = ({ pages }: SlotComicViewerProps) => (
  <div className={styles.viewer} style={getViewerStyle(pages)}>
    <ComicViewer.Root className={styles.viewerContent} pages={pages}>
      <ComicViewer.StartPage>
        <div className={styles.slotCard}>
          <h3>Before you read</h3>
          <p>
            This chapter is published a week ahead of its free release. Please
            keep the pages to yourself until then.
          </p>
          <details>
            <summary>Why am I seeing this?</summary>
            <p>
              Early access comes with the membership this chapter was opened
              with.
            </p>
          </details>
        </div>
      </ComicViewer.StartPage>

      <ComicViewer.Viewport />

      <ComicViewer.EndPage>
        <div className={styles.slotCard}>
          <h3>Next chapter</h3>
          <p>Chapter 2 is ready to read.</p>
          <Link href="/">Back to the first chapter</Link>
        </div>
      </ComicViewer.EndPage>

      <ComicViewer.Toolbar />
      <ComicViewer.PageNavigation />
    </ComicViewer.Root>
  </div>
);
