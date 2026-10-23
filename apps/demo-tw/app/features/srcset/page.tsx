import { readDemoSource } from "#components/demo-source";
import { SourceCodePanel } from "#components/source-code-panel";

import { SrcsetReader } from "./_components/srcset-reader";

const SrcsetPage = async () => {
  const source = await readDemoSource(
    "features/srcset/_components/srcset-reader.tsx"
  );

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section
          aria-label="Comic reader"
          className="aspect-[4/5] min-h-96 w-full overflow-hidden rounded-xl md:aspect-[8/5]"
        >
          <SrcsetReader />
        </section>
        <section className="rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-semibold">Renditions from a srcset</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Every page lists renditions 400, 800, and 1600 pixels wide in{" "}
            <code>srcset</code>, and the viewer fetches the smallest one that
            covers the width it draws the page at in device pixels, the way a
            browser picks a candidate for <code>&lt;img srcset&gt;</code>. The
            label at the top of each page names the rendition on screen: 400w on
            a phone, 800w on a desktop display, and 1600w on a high-density one.
          </p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Widen the window and the pages that have outgrown their rendition
            load the larger one, while the image already on screen stays drawn
            until it arrives. Narrowing the window again fetches nothing: a page
            keeps the larger image and is drawn scaled down.
          </p>
        </section>
        <SourceCodePanel name={source.path}>{source.code}</SourceCodePanel>
      </div>
    </main>
  );
};

export default SrcsetPage;
