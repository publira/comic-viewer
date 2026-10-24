import { readDemoSource } from "#components/demo-source";
import { basicSamplePages } from "#components/sample-pages";
import { SourceCodePanel } from "#components/source-code-panel";

import { GesturesReader } from "./_components/gestures-reader";

const GesturesPage = async () => {
  const source = await readDemoSource(
    "features/gestures/_components/gestures-reader.tsx"
  );

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <GesturesReader pages={basicSamplePages} />
        <section className="rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-semibold">Turn viewport gestures on and off</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Clear a box and try the gesture again. Without the edge click, a
            click anywhere on the page reveals the controls instead of turning
            it; without the swipe, a drag leaves the page where it is; without
            the double tap, a page no longer snaps to fit-to-width. Every
            gesture is one group of the <code>gestures</code> option on{" "}
            <code>Viewport</code>, so a setting added later joins its group
            rather than becoming another prop.
          </p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            The arrow keys answer only while the reader is focused. Click the
            page or tab to it first; a key pressed anywhere else on this page
            leaves the reader alone, so two readers on one page never turn
            together. &ldquo;Arrow keys from anywhere on the page&rdquo; sets{" "}
            <code>keyboard.scope</code> to <code>&quot;global&quot;</code>,
            which listens on the whole window instead. <kbd>Enter</kbd> and{" "}
            <kbd>Space</kbd> keep revealing the controls even with the arrow
            keys off.
          </p>
        </section>
        <SourceCodePanel name={source.path}>{source.code}</SourceCodePanel>
      </div>
    </main>
  );
};

export default GesturesPage;
