import { basicSamplePages } from "../_components/sample-pages";
import { SourceCodePanel } from "../_components/source-code-panel";
import { slotClassNames } from "./_components/slot-class-names";
import { SlotReader } from "./_components/slot-reader";

// The odd total leaves the last page without a facing page, so the end page
// pairs with it instead of arriving on a spread of its own.
const slotSamplePages = basicSamplePages.slice(0, 7);

const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";

import { Reader } from "./reader";

// A slot page carries the same data-page-side attribute as a page, so the same
// variants keep it on the half of the spread it belongs to.
const slotPageClassName =
  "${slotClassNames.slotPage}";

const slotCardClassName =
  "${slotClassNames.slotCard}";

// The reader hands its children to the viewer root, so a start or an end page
// is composed into it exactly as it is into ComicViewer.Root, and each end
// takes as many of them as it is written with.
export const SlotReader = ({ pages }) => (
  <Reader pages={pages}>
    <ComicViewer.StartPage className={slotPageClassName}>
      <div className={slotCardClassName}>
        <CoverNotice />
      </div>
    </ComicViewer.StartPage>

    <ComicViewer.StartPage className={slotPageClassName}>
      <div className={slotCardClassName}>
        <ChapterTitleCard />
      </div>
    </ComicViewer.StartPage>

    <ComicViewer.EndPage className={slotPageClassName}>
      <div className={slotCardClassName}>
        <NextChapterCard />
      </div>
    </ComicViewer.EndPage>

    <ComicViewer.EndPage className={slotPageClassName}>
      <div className={slotCardClassName}>
        <SeriesRecommendations />
      </div>
    </ComicViewer.EndPage>
  </Reader>
);`;

const SlotsPage = () => (
  <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8 dark:bg-slate-950 dark:text-slate-100">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section
        aria-label="Comic reader"
        className="aspect-[4/5] min-h-96 w-full overflow-hidden rounded-xl md:aspect-[8/5]"
      >
        <SlotReader pages={slotSamplePages} />
      </section>
      <section className="rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-semibold">Pages around the chapter</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          <code>StartPage</code> and <code>EndPage</code> put content of your
          own at the two ends of the reading sequence, as many of them at each
          end as you write, and none of them is counted as a page: the progress
          still reads <code>Pages 1-2 of 7</code> on the first spread. They
          carry the same <code>data-page-side</code> attribute as a page, so the
          same variants keep them on the half of the spread they belong to, and
          a <code>data-slot-page</code> attribute of their own for the place
          each of them takes in its slot.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default SlotsPage;
