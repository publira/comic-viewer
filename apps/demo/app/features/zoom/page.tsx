import { basicSamplePages } from "../../_components/sample-pages";
import { SourceCodePanel } from "../../_components/source-code-panel";
import { ZoomComicViewer } from "./_components/zoom-comic-viewer";

import styles from "./page.module.css";

const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";

const ZoomStatus = () => {
  const { resetZoom, zoomScale } = ComicViewer.useViewerContext();

  return (
    <div>
      <output aria-label="Zoom scale">{Math.round(zoomScale * 100)}%</output>
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
      <ZoomStatus />
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
        <h2>Read the zoom scale back</h2>
        <p>
          Tap the page to reveal the toolbar, then pinch the page with two
          fingers — on a touch screen, or through the device toolbar of a
          browser&rsquo;s developer tools. The readout follows the pinch, and
          &ldquo;Reset zoom&rdquo; returns the spread to the size its fit mode
          gives it. A double tap still snaps the page to fit-to-width, as it
          does in every other demo.
        </p>
        <p>
          Neither control comes from the library. The viewer ships no zoom UI at
          all: it carries the scale as a read-only <code>zoomScale</code> on{" "}
          <code>useViewerContext()</code>, which is <code>1</code> while the
          spread rests at the size its fit mode gives it, and one write
          operation, <code>resetZoom()</code>, which clears the scale and the
          pan offset together. Everything above is built from those two, so a
          reader that wants a percentage badge, a disabled control, or a reset
          button does not have to read the <code>--pcv-zoom-scale</code> custom
          property back out of the DOM.
        </p>
        <p>
          The scale belongs to the spread rather than to the reader. Turning the
          page returns it to <code>1</code>, and so does picking another
          page-fit mode from the buttons at the end of the toolbar, because the
          gesture was made against the size the previous mode gave the page.
          Zooming in and out programmatically stays out of the API; the pinch
          and the double tap are what change the scale.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default ZoomPage;
