import { basicSamplePages } from "../_components/sample-pages";
import { SourceCodePanel } from "../_components/source-code-panel";
import { FullscreenComicViewer } from "./_components/fullscreen-comic-viewer";

import styles from "./page.module.css";

const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";
import { useCallback, useEffect, useRef, useState } from "react";

const useFullscreen = (targetRef) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === targetRef.current);
    };

    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
    };
  }, [targetRef]);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement === null) {
      await targetRef.current?.requestFullscreen();
      return;
    }

    await document.exitFullscreen();
  }, [targetRef]);

  return { isFullscreen, toggleFullscreen };
};

export const Reader = ({ pages }) => {
  const containerRef = useRef(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);

  // The container is the element handed to the screen, so the control goes
  // inside it and stays reachable once the reader fills the display.
  return (
    <div className="reader" ref={containerRef}>
      <ComicViewer.Root pages={pages}>
        <ComicViewer.Viewport />
        <ComicViewer.Toolbar />
        <ComicViewer.PageNavigation />
      </ComicViewer.Root>
      <button onClick={() => void toggleFullscreen()} type="button">
        {isFullscreen ? "Exit full screen" : "Enter full screen"}
      </button>
    </div>
  );
};`;

const FullscreenPage = () => (
  <main className={styles.main}>
    <div className={styles.container}>
      <FullscreenComicViewer pages={basicSamplePages} />
      <section className={styles.description}>
        <h2>Fullscreen reading</h2>
        <p>
          The viewer leaves the browser&apos;s Fullscreen API to the host
          application, because which element should fill the screen and what the
          control looks like are decisions only the surrounding page can make.
          This demo passes its own reader container to{" "}
          <code>requestFullscreen()</code> instead of the whole document, so the
          reader and its toggle are the only things left on screen.
        </p>
        <p>
          The button reads its label back from the <code>fullscreenchange</code>{" "}
          event rather than from the call it made, which keeps it in step when a
          reader leaves fullscreen through <kbd>Esc</kbd> or the browser&apos;s
          own control. Nothing has to be told about the new size: the viewer
          measures its container with a <code>ResizeObserver</code>, so the page
          fit and the switch between the single- and double-page layouts follow
          the container into fullscreen and back out on their own.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default FullscreenPage;
