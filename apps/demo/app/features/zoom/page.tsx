import { basicSamplePages } from "#components/sample-pages";
import { SourceCodePanel } from "#components/source-code-panel";

import { ZoomComicViewer } from "./_components/zoom-comic-viewer";

import styles from "./page.module.css";

const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";

const ZOOM_STEP = 0.5;

const ZoomControls = () => {
  const { maxZoomScale, minZoomScale, resetZoom, setZoomScale, zoomScale } =
    ComicViewer.useViewerContext();

  return (
    <div>
      <button
        aria-label="Zoom out"
        disabled={zoomScale <= minZoomScale}
        onClick={() => setZoomScale(zoomScale - ZOOM_STEP)}
        type="button"
      >
        −
      </button>
      <output aria-label="Zoom scale">{Math.round(zoomScale * 100)}%</output>
      <button
        aria-label="Zoom in"
        disabled={zoomScale >= maxZoomScale}
        onClick={() => setZoomScale(zoomScale + ZOOM_STEP)}
        type="button"
      >
        +
      </button>
      <button disabled={zoomScale === 1} onClick={resetZoom} type="button">
        Reset zoom
      </button>
    </div>
  );
};

export const Reader = ({ pages }) => (
  <ComicViewer.Root pages={pages}>
    <ComicViewer.Viewport />
    <ComicViewer.Toolbar>
      <ZoomControls />
      <ComicViewer.PageProgress>
        <ComicViewer.PageProgressSlider />
        <ComicViewer.PageStatus />
      </ComicViewer.PageProgress>
      <div role="group" aria-label="Page fit">
        <ComicViewer.PageFitModeToggle mode="height" />
        <ComicViewer.PageFitModeToggle mode="width" />
        <ComicViewer.PageFitModeToggle mode="actual" />
      </div>
    </ComicViewer.Toolbar>
    <ComicViewer.PageNavigation />
  </ComicViewer.Root>
);`;

const ZoomPage = () => (
  <main className={styles.main}>
    <div className={styles.container}>
      <ZoomComicViewer pages={basicSamplePages} />
      <section className={styles.description}>
        <h2>Build zoom controls on the viewer context</h2>
        <p>
          Tap the page to reveal the toolbar, then zoom with the &ldquo;+&rdquo;
          and &ldquo;&minus;&rdquo; buttons, or pinch the page with two fingers
          on a touch screen. The readout follows both, and &ldquo;Reset
          zoom&rdquo; returns the spread to the size its fit mode gives it. A
          double tap still snaps the page to fit-to-width, as it does in every
          other demo.
        </p>
        <p>
          None of these controls comes from the library. The viewer ships no
          zoom UI at all: <code>useViewerContext()</code> carries the scale as{" "}
          <code>zoomScale</code>, which is <code>1</code> while the spread rests
          at the size its fit mode gives it, the limits a pinch stops at as{" "}
          <code>minZoomScale</code> and <code>maxZoomScale</code>,{" "}
          <code>setZoomScale()</code>, which zooms about the centre of the
          viewport or about a point given in client coordinates, and{" "}
          <code>resetZoom()</code>, which clears the scale and the pan offset
          together. The buttons disable themselves at the ends of the range
          without reading the <code>--pcv-zoom-scale</code> custom property back
          out of the DOM.
        </p>
        <p>
          The scale belongs to the spread rather than to the reader. Turning the
          page returns it to <code>1</code>, and so does picking another
          page-fit mode from the buttons at the end of the toolbar, because the
          zoom was made against the size the previous mode gave the page.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default ZoomPage;
