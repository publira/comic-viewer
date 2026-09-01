"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";
import { useRef } from "react";

import { useFullscreen } from "../../_components/use-fullscreen";
import { getViewerStyle } from "../../_components/viewer-layout";

import styles from "../page.module.css";

interface FullscreenComicViewerProps {
  pages: readonly ViewerPage[];
}

/** Renders the reader with a control that hands its container to the screen. */
export const FullscreenComicViewer = ({
  pages,
}: FullscreenComicViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, isSupported, toggleFullscreen } =
    useFullscreen(containerRef);

  const handleToggle = async () => {
    try {
      await toggleFullscreen();
    } catch {
      // A browser that turns the request down leaves the reader as it is, so
      // there is nothing to recover from here.
    }
  };

  return (
    // The container is the element handed to the screen, so the control stays
    // reachable in fullscreen along with the reader it belongs to.
    <div
      className={styles.viewer}
      ref={containerRef}
      style={getViewerStyle(pages)}
    >
      <ComicViewer.Root className={styles.viewerContent} pages={pages}>
        <ComicViewer.Viewport />
        <ComicViewer.Toolbar />
        <ComicViewer.PageNavigation />
      </ComicViewer.Root>
      <button
        aria-pressed={isFullscreen}
        className={styles.fullscreenButton}
        disabled={!isSupported}
        onClick={handleToggle}
        type="button"
      >
        {isFullscreen ? "Exit full screen" : "Enter full screen"}
      </button>
    </div>
  );
};
