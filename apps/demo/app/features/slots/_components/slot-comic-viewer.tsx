"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";
import Link from "next/link";
import type { PropsWithChildren } from "react";

import { getViewerStyle } from "#components/viewer-layout";

import styles from "../page.module.css";

interface SlotComicViewerProps {
  pages: readonly ViewerPage[];
}

/**
 * Lays an extra page out as a page of the book: a sheet the shape of a page,
 * with the card of the notice floating at the centre of it.
 */
const SlotSheet = ({ children }: PropsWithChildren) => (
  <div className={styles.slotSheet}>
    <div className={styles.slotCard}>{children}</div>
  </div>
);

/** Renders a reader that opens on front matter and closes on back matter. */
export const SlotComicViewer = ({ pages }: SlotComicViewerProps) => (
  <div className={styles.viewer} style={getViewerStyle(pages)}>
    {/* Counting the spreads from the first start page pairs the two of them
        with each other, and leaves the document paired as it was. */}
    <ComicViewer.Root
      className={styles.viewerContent}
      pages={pages}
      spreadStartIndex={-2}
    >
      <ComicViewer.StartPage>
        <SlotSheet>
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
        </SlotSheet>
      </ComicViewer.StartPage>

      <ComicViewer.StartPage>
        <SlotSheet>
          <h3>Chapter 1: The long way round</h3>
          <p>Written and drawn by the Publira sample studio.</p>
        </SlotSheet>
      </ComicViewer.StartPage>

      <ComicViewer.Viewport />

      <ComicViewer.EndPage>
        <SlotSheet>
          <h3>Next chapter</h3>
          <p>Chapter 2 is ready to read.</p>
          <Link href="/">Back to the first chapter</Link>
        </SlotSheet>
      </ComicViewer.EndPage>

      <ComicViewer.EndPage>
        <SlotSheet>
          <h3>More from this series</h3>
          <p>
            Three side stories follow the same cast between the chapters of the
            main run.
          </p>
          <Link href="/recipes/progress">
            A longer chapter to scrub through
          </Link>
        </SlotSheet>
      </ComicViewer.EndPage>

      <ComicViewer.Toolbar />
      <ComicViewer.PageNavigation />
    </ComicViewer.Root>
  </div>
);
