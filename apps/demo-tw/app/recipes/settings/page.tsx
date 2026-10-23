import { readDemoSource } from "#components/demo-source";
import { basicSamplePages } from "#components/sample-pages";
import { SourceCodePanel } from "#components/source-code-panel";

import { SettingsReader } from "./_components/settings-reader";

const SettingsPage = async () => {
  const source = await readDemoSource(
    "recipes/settings/_components/settings-reader.tsx"
  );

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <SettingsReader pages={basicSamplePages} />
        <section className="rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-semibold">
            Hold the reader settings in the application
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            The panel under the reader and the toggles in its toolbar change the
            same three settings. The application holds them and hands them to
            the viewer as <code>readingDirection</code>, <code>viewMode</code>,
            and <code>pageFitMode</code>. <code>onReadingDirectionChange</code>,{" "}
            <code>onViewModeChange</code>, and <code>onPageFitModeChange</code>{" "}
            report every change a toolbar toggle or a double tap asks for, so a
            change made on either side shows up on the other. Writing these
            values to storage the way the Progress recipe stores the page index
            would remember a reader&rsquo;s preferences across documents.
          </p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            A controlled view mode is not switched for the viewport width. Pick
            &ldquo;Double page&rdquo; and narrow the window: the reader falls
            back to single pages while a spread does not fit, and the toolbar
            toggle disables itself. The panel keeps &ldquo;Double page&rdquo;
            selected, because the fallback is not reported as a change, and the
            spread comes back once the window is wide enough again.
          </p>
        </section>
        <SourceCodePanel name={source.path}>{source.code}</SourceCodePanel>
      </div>
    </main>
  );
};

export default SettingsPage;
