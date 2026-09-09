import {
  pageLayoutUtilities,
  readerClassNames,
} from "#components/reader-class-names";
import { spreadPageSamplePages } from "#components/sample-pages";
import { SourceCodePanel } from "#components/source-code-panel";
import { TailwindReader } from "#components/tailwind-reader";

const sourceCode = `import { Reader } from "./reader";

// The page list is the only thing this page adds. A page declared as a spread
// keeps both halves of its page set, which the reader sizes with this variant
// on the page slot:
//
//   ViewportPageSlot  ${pageLayoutUtilities(readerClassNames.viewportPageSlot)}
const pages = [
  { id: "page-1", src: "/pages/1.jpg", title: "Page 1" },
  { id: "page-2", src: "/pages/2.jpg", title: "Page 2" },
  { id: "page-3", src: "/pages/3.jpg", title: "Page 3" },
  // One landscape image covering both halves of a printed sheet.
  {
    height: 1000,
    id: "page-4",
    layout: "spread",
    src: "/pages/spread.png",
    title: "Page 4",
    width: 1600,
  },
  { id: "page-5", src: "/pages/5.jpg", title: "Page 5" },
];

export const SpreadPageReader = () => <Reader pages={pages} />;`;

const SpreadPagePage = () => (
  <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8 dark:bg-slate-950 dark:text-slate-100">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section
        aria-label="Comic reader"
        className="aspect-[4/5] min-h-96 w-full overflow-hidden rounded-xl md:aspect-[8/5]"
      >
        <TailwindReader pages={spreadPageSamplePages} />
      </section>
      <section className="rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-semibold">A page that is a whole spread</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Page 4 of this document is one landscape image covering both halves of
          a printed sheet, which <code>layout: &quot;spread&quot;</code>{" "}
          declares the way EPUB fixed layout does with{" "}
          <code>rendition:page-spread-center</code>. The rail reports it as{" "}
          <code>data-page-layout=&quot;spread&quot;</code> on the page slot and
          the page, and the <code>data-[page-layout=spread]</code> variants are
          what give it back the half of the page set the double-page basis would
          otherwise take.
        </p>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          It counts as both halves of its sheet, so page 3 is left facing the
          blank half before it and pages 5 and 6 pair again exactly as they
          would in print. Narrow the window until the reader falls back to a
          single page: the spread is still shown whole, fitted to the width of
          the viewport.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default SpreadPagePage;
