import { basicSamplePages } from "../_components/sample-pages";
import { SourceCodePanel } from "../_components/source-code-panel";
import { TailwindReader } from "../_components/tailwind-reader";

// The first page stands alone, and the even total leaves the last page
// unpaired as well, so both ends of the arrangement are on screen.
const spreadSamplePages = basicSamplePages.slice(0, 8);

const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";

export const Reader = ({ pages }) => (
  <ComicViewer.Root pages={pages} spreadStartIndex={1}>
    <ComicViewer.Viewport>
      <ComicViewer.ViewportTrack>
        <ComicViewer.ViewportPageSet className="data-[page-side=left]:justify-start data-[page-side=right]:justify-end">
          <ComicViewer.ViewportPageSlot className="data-[page-side=left]:justify-end data-[page-side=right]:justify-start">
            <ComicViewer.ViewportPage className="data-[page-side=left]:justify-end data-[page-side=right]:justify-start">
              <ComicViewer.PageCanvas />
            </ComicViewer.ViewportPage>
          </ComicViewer.ViewportPageSlot>
        </ComicViewer.ViewportPageSet>
      </ComicViewer.ViewportTrack>
    </ComicViewer.Viewport>
    <ComicViewer.Toolbar />
    <ComicViewer.PageNavigation />
  </ComicViewer.Root>
);`;

const SpreadsPage = () => (
  <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8 dark:bg-slate-950 dark:text-slate-100">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section
        aria-label="Comic reader"
        className="aspect-[8/5] min-h-96 w-full overflow-hidden rounded-xl"
      >
        <TailwindReader pages={spreadSamplePages} spreadStartIndex={1} />
      </section>
      <section className="rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-semibold">Cover before the spreads</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          <code>spreadStartIndex</code> is the page every spread is counted
          from. The default <code>0</code> pairs the pages from the very first
          one, while the <code>1</code> used here leaves the first page on its
          own as a cover and pairs the pages that follow it. The{" "}
          <code>data-page-side</code> variants on the page set, the page slot,
          and the page are what keep a page left unpaired at either end on the
          half of the spread it belongs to.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default SpreadsPage;
