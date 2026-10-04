"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { PageStatusValue, ViewerPage } from "@publira/comic-viewer";

import { getViewerStyle } from "#components/viewer-layout";

import styles from "../page.module.css";

/**
 * Labels the pages on screen in Japanese. The status and the slider share it,
 * so what the toolbar shows and what a screen reader hears always agree.
 */
const formatPageStatus = ({
  firstPage,
  lastPage,
  pageCount,
  slot,
}: PageStatusValue) => {
  if (firstPage === 0) {
    if (slot === undefined) {
      return "ページがありません";
    }

    return slot === "start" ? "巻頭ページ" : "巻末ページ";
  }

  return firstPage === lastPage
    ? `${firstPage} / ${pageCount} ページ`
    : `${firstPage}〜${lastPage} / ${pageCount} ページ`;
};

/**
 * The page-turn buttons, named in Japanese. Giving them children replaces the
 * default icons, so the arrows are drawn here the way the reading direction
 * points them.
 */
const PageNavigation = () => {
  const { readingDirection } = ComicViewer.useViewerContext();
  const previousPath =
    readingDirection === "rtl" ? "m10 6 6 6-6 6" : "m14 6-6 6 6 6";
  const nextPath =
    readingDirection === "rtl" ? "m14 6-6 6 6 6" : "m10 6 6 6-6 6";

  return (
    <ComicViewer.PageNavigation aria-label="ページ送り">
      <ComicViewer.PreviousPageButton aria-label="前のページ">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d={previousPath} />
        </svg>
      </ComicViewer.PreviousPageButton>
      <ComicViewer.NextPageButton aria-label="次のページ">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d={nextPath} />
        </svg>
      </ComicViewer.NextPageButton>
    </ComicViewer.PageNavigation>
  );
};

interface LocalizedComicViewerProps {
  pages: readonly ViewerPage[];
}

/** Renders a reader whose controls speak Japanese. */
export const LocalizedComicViewer = ({ pages }: LocalizedComicViewerProps) => (
  // `lang` tells a screen reader which voice to read the labels in.
  <div className={styles.viewer} lang="ja" style={getViewerStyle(pages)}>
    <ComicViewer.Root className={styles.viewerContent} pages={pages}>
      <ComicViewer.Viewport />
      <ComicViewer.Toolbar>
        <ComicViewer.PageProgress aria-label="読書の進み具合">
          <ComicViewer.PageProgressSlider format={formatPageStatus} />
          <ComicViewer.PageStatus format={formatPageStatus} />
        </ComicViewer.PageProgress>
      </ComicViewer.Toolbar>
      <PageNavigation />
    </ComicViewer.Root>
  </div>
);
