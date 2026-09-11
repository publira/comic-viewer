import { readDemoSource } from "#components/demo-source";
import { basicSamplePages } from "#components/sample-pages";
import { SourceCodePanel } from "#components/source-code-panel";

import { ControlsReader } from "./_components/controls-reader";

const ControlsPage = async () => {
  const source = await readDemoSource(
    "features/controls/_components/controls-reader.tsx"
  );

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section
          aria-label="Comic reader"
          className="aspect-[4/5] min-h-96 w-full overflow-hidden rounded-xl md:aspect-[8/5]"
        >
          <ControlsReader pages={basicSamplePages} />
        </section>
        <section className="rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-semibold">Reader setting toggles</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Tap the page to reveal the toolbar. <code>ViewModeToggle</code>,{" "}
            <code>ReadingDirectionToggle</code>, and{" "}
            <code>PageFitModeToggle</code> drive the settings the viewer context
            exposes, so a toolbar does not have to wire the setters itself. None
            of them is part of the default toolbar: each is an independent named
            export that reaches the tree only where it is placed, and each
            renders a plain button with a text label that Tailwind utilities
            dress here.
          </p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            The view-mode toggle reports the mode through{" "}
            <code>aria-pressed</code> and disables itself on a viewport too
            narrow for a spread. The page-fit buttons each name one mode, so
            they compose into the group around them; a single one given no{" "}
            <code>mode</code> would cycle through the three instead.
          </p>
        </section>
        <SourceCodePanel name={source.path}>{source.code}</SourceCodePanel>
      </div>
    </main>
  );
};

export default ControlsPage;
