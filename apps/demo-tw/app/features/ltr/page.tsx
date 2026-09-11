import { readDemoSource } from "#components/demo-source";
import { basicSamplePages } from "#components/sample-pages";
import { SourceCodePanel } from "#components/source-code-panel";

import { LeftToRightReader } from "./_components/left-to-right-reader";

const LeftToRightPage = async () => {
  const source = await readDemoSource(
    "features/ltr/_components/left-to-right-reader.tsx"
  );

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section
          aria-label="Comic reader"
          className="aspect-[4/5] min-h-96 w-full overflow-hidden rounded-xl md:aspect-[8/5]"
        >
          <LeftToRightReader pages={basicSamplePages} />
        </section>
        <section className="rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-semibold">Left-to-right reading</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            The other demos keep the default <code>rtl</code> direction. With{" "}
            <code>initialReadingDirection</code> set to <code>ltr</code>, a
            spread starts on its left half, a page turn moves the reader to the
            right, and the last page of this sample, which has no page to face,
            keeps the half a spread starts on.
          </p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Not one utility of the reader changes with the direction. The
            navigation buttons are placed with the logical <code>start-3</code>{" "}
            and <code>end-3</code> rather than with <code>left</code> and{" "}
            <code>right</code>, the slider fill follows the direction through an{" "}
            <code>rtl:</code> variant on a custom property, and the page-turn
            icons are the one thing that reads the direction back out of the
            viewer context.
          </p>
        </section>
        <SourceCodePanel name={source.path}>{source.code}</SourceCodePanel>
      </div>
    </main>
  );
};

export default LeftToRightPage;
