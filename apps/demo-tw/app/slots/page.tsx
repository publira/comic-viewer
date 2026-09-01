import { basicSamplePages } from "../_components/sample-pages";
import { SourceCodePanel } from "../_components/source-code-panel";
import { SlotReader } from "./_components/slot-reader";

// The odd total leaves the last page without a facing page, so the end page
// pairs with it instead of arriving on a spread of its own.
const slotSamplePages = basicSamplePages.slice(0, 7);

const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";

export const Reader = ({ pages }) => (
  <ComicViewer.Root pages={pages}>
    <ComicViewer.StartPage className="flex h-full w-full items-center justify-center data-[page-side=left]:justify-end data-[page-side=right]:justify-start">
      <CoverNotice />
    </ComicViewer.StartPage>

    <ComicViewer.Viewport>{/* ... */}</ComicViewer.Viewport>

    <ComicViewer.EndPage className="flex h-full w-full items-center justify-center data-[page-side=left]:justify-end data-[page-side=right]:justify-start">
      <NextChapterCard />
    </ComicViewer.EndPage>

    <ComicViewer.Toolbar />
    <ComicViewer.PageNavigation />
  </ComicViewer.Root>
);`;

const SlotsPage = () => (
  <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8 dark:bg-slate-950 dark:text-slate-100">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section
        aria-label="Comic reader"
        className="aspect-[8/5] min-h-96 w-full overflow-hidden rounded-xl"
      >
        <SlotReader pages={slotSamplePages} />
      </section>
      <section className="rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-semibold">Pages around the chapter</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          <code>StartPage</code> and <code>EndPage</code> put content of your
          own at the two ends of the reading sequence, and neither of them is
          counted as a page: the progress still reads{" "}
          <code>Pages 1-2 of 7</code> on the first spread. They carry the same{" "}
          <code>data-page-side</code> attribute as a page, so the same variants
          keep them on the half of the spread they belong to.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default SlotsPage;
