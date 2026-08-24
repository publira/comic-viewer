import { basicSamplePages } from "../_components/sample-pages";
import { SourceCodePanel } from "../_components/source-code-panel";
import { TailwindReader } from "../_components/tailwind-reader";

const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";

export const Reader = ({ pages }) => (
  <ComicViewer.Root pages={pages} initialReadingDirection="ltr">
    <ComicViewer.Viewport>
      <ComicViewer.ViewportTrack>
        <ComicViewer.ViewportPageSet>
          <ComicViewer.ViewportPageSlot>
            <ComicViewer.ViewportPage>
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

const LeftToRightPage = () => (
  <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8 dark:bg-slate-950 dark:text-slate-100">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section
        aria-label="Comic reader"
        className="aspect-[8/5] min-h-96 w-full overflow-hidden rounded-xl"
      >
        <TailwindReader
          initialReadingDirection="ltr"
          pages={basicSamplePages}
        />
      </section>
      <section className="rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-semibold">Left-to-right reading</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          The other demos keep the default <code>rtl</code> direction. With{" "}
          <code>initialReadingDirection</code> set to <code>ltr</code>, a spread
          starts on its left half, a page turn moves the reader to the right,
          and the logical <code>start</code> and <code>end</code> utilities
          place the navigation buttons on the matching sides. The last page of
          this sample has no page to face, and it keeps the half a spread starts
          on.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default LeftToRightPage;
