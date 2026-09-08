import {
  pageSideUtilities,
  readerClassNames,
} from "../_components/reader-class-names";
import { basicSamplePages } from "../_components/sample-pages";
import { SourceCodePanel } from "../_components/source-code-panel";
import { TailwindReader } from "../_components/tailwind-reader";

// The first page stands alone, and the even total leaves the last page
// unpaired as well, so both ends of the arrangement are on screen.
const spreadSamplePages = basicSamplePages.slice(0, 8);

const sourceCode = `import { Reader } from "./reader";

// spreadStartIndex is the only thing this page adds. The alignment it relies
// on is already part of the reader, which carries these variants alongside the
// rest of its utilities:
//
//   ViewportPageSet   ${pageSideUtilities(readerClassNames.viewportPageSet)}
//   ViewportPageSlot  ${pageSideUtilities(readerClassNames.viewportPageSlot)}
//   ViewportPage      ${pageSideUtilities(readerClassNames.viewportPage)}
export const SpreadsReader = ({ pages }) => (
  <Reader pages={pages} spreadStartIndex={1} />
);`;

const SpreadsPage = () => (
  <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8 dark:bg-slate-950 dark:text-slate-100">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section
        aria-label="Comic reader"
        className="aspect-[4/5] min-h-96 w-full overflow-hidden rounded-xl md:aspect-[8/5]"
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
