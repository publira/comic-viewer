import { readerClassNames } from "../../_components/reader-class-names";
import { basicSamplePages } from "../../_components/sample-pages";
import { SourceCodePanel } from "../../_components/source-code-panel";
import { zoomClassNames } from "./_components/zoom-class-names";
import { ZoomReader } from "./_components/zoom-reader";

// "./reader" is the styled reader the front page shows in full. A Toolbar
// written among its children takes the place of the one it renders by default,
// so the only thing left for this snippet is the toolbar itself.
const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";

import { Reader } from "./reader";

const ZoomStatus = () => {
  const { resetZoom, zoomScale } = ComicViewer.useViewerContext();

  return (
    <div className="${zoomClassNames.zoomStatus}">
      <output aria-label="Zoom scale" className="${zoomClassNames.zoomScale}">
        {Math.round(zoomScale * 100)}%
      </output>
      <button
        className="${readerClassNames.settingToggle}"
        disabled={zoomScale === 1}
        onClick={resetZoom}
        type="button"
      >
        Reset zoom
      </button>
    </div>
  );
};

export const ZoomReader = ({ pages }) => (
  <Reader pages={pages}>
    <ComicViewer.Toolbar className="${readerClassNames.toolbar}">
      <ZoomStatus />
      <ComicViewer.PageProgress className="${readerClassNames.pageProgress}">
        <ComicViewer.PageProgressSlider className="${readerClassNames.pageProgressSlider}" />
        <ComicViewer.PageStatus className="${readerClassNames.pageStatus}" />
      </ComicViewer.PageProgress>
      <div role="group" aria-label="Page fit" className="${readerClassNames.pageFitModeGroup}">
        <ComicViewer.PageFitModeToggle mode="height" className="${readerClassNames.settingToggle}" />
        <ComicViewer.PageFitModeToggle mode="width" className="${readerClassNames.settingToggle}" />
        <ComicViewer.PageFitModeToggle mode="actual" className="${readerClassNames.settingToggle}" />
      </div>
    </ComicViewer.Toolbar>
  </Reader>
);`;

const ZoomPage = () => (
  <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8 dark:bg-slate-950 dark:text-slate-100">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section
        aria-label="Comic reader"
        className="aspect-[4/5] min-h-96 w-full overflow-hidden rounded-xl md:aspect-[8/5]"
      >
        <ZoomReader pages={basicSamplePages} />
      </section>
      <section className="rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-semibold">Read the zoom scale back</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Tap the page to reveal the toolbar, then pinch the page with two
          fingers — on a touch screen, or through the device toolbar of a
          browser&rsquo;s developer tools. The readout follows the pinch, and
          &ldquo;Reset zoom&rdquo; returns the spread to the size its fit mode
          gives it. A double tap still snaps the page to fit-to-width, as it
          does in every other demo.
        </p>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
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
        <p className="mt-2 text-slate-600 dark:text-slate-300">
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
