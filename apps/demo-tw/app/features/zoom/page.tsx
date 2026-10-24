import { readDemoSource } from "#components/demo-source";
import { basicSamplePages } from "#components/sample-pages";
import { SourceCodePanel } from "#components/source-code-panel";

import { ZoomReader } from "./_components/zoom-reader";

const ZoomPage = async () => {
  const source = await readDemoSource(
    "features/zoom/_components/zoom-reader.tsx"
  );

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section
          aria-label="Comic reader"
          className="aspect-[4/5] min-h-96 w-full overflow-hidden rounded-xl md:aspect-[8/5]"
        >
          <ZoomReader pages={basicSamplePages} />
        </section>
        <section className="rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-semibold">
            Build zoom controls on the viewer context
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Tap the page to reveal the toolbar, then zoom with the magnifier
            buttons, or pinch the page with two fingers on a touch screen. The
            readout follows both, and &ldquo;Reset zoom&rdquo; returns the
            spread to the size its fit mode gives it. A double tap still snaps
            the page to fit-to-width, as it does in every other demo.
          </p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            None of these controls comes from the library. The viewer ships no
            zoom UI at all: <code>useViewerContext()</code> carries the scale as{" "}
            <code>zoomScale</code>, which is <code>1</code> while the spread
            rests at the size its fit mode gives it, the limits a pinch stops at
            as <code>minZoomScale</code> and <code>maxZoomScale</code>,{" "}
            <code>setZoomScale()</code>, which zooms about the centre of the
            viewport or about a point given in client coordinates, and{" "}
            <code>resetZoom()</code>, which clears the scale and the pan offset
            together. The buttons disable themselves at the ends of the range
            without reading the <code>--pcv-zoom-scale</code> custom property
            back out of the DOM.
          </p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            The scale belongs to the spread rather than to the reader. Turning
            the page returns it to <code>1</code>, and so does picking another
            page-fit mode from the buttons at the end of the toolbar, because
            the zoom was made against the size the previous mode gave the page.
          </p>
        </section>
        <SourceCodePanel name={source.path}>{source.code}</SourceCodePanel>
      </div>
    </main>
  );
};

export default ZoomPage;
