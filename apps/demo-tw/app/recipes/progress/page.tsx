import { readDemoSource } from "#components/demo-source";
import { basicSamplePages } from "#components/sample-pages";
import { SourceCodePanel } from "#components/source-code-panel";

import { ProgressReader } from "./_components/progress-reader";

const ProgressPage = async () => {
  const source = await readDemoSource(
    "recipes/progress/_components/progress-reader.tsx"
  );

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <ProgressReader pages={basicSamplePages} />
        <section className="rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-semibold">Remember the reading position</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Turn a few pages and reload this page: the reader opens where it was
            left. Nothing about that lives in the viewer, because where a
            position belongs — this browser, this session, or an account that
            follows a reader between devices — is a decision only the
            application can make. This demo keeps it in{" "}
            <code>localStorage</code> under a key that carries the document, so
            one origin can remember a position per document; swapping those two
            storage calls for requests to a backend is the whole difference
            between the two.
          </p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            The position is held in the application and handed back to the
            viewer as <code>currentIndex</code>, with <code>onIndexChange</code>{" "}
            writing every page the reader turns to. A controlled index is what
            lets the &ldquo;Start over&rdquo; button return the reader to the
            first page as it clears the stored one; <code>initialIndex</code> is
            read once, when the viewer mounts, and would leave the reader where
            it was. An application writing to a network instead should debounce
            these calls, which arrive one per page turn.
          </p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Storage is an external store, and the hook reads it through{" "}
            <code>useSyncExternalStore</code> rather than while rendering: it
            does not exist on the server, and reading it during a render would
            make the markup React hydrates differ from the markup the server
            sent. The reader is held back for the one frame that takes, so that
            it opens on the stored page instead of fetching the first one and
            turning away from it. A browser that refuses storage outright, such
            as Safari in a private window, throws on the very first access; the
            position lives for as long as the tab does there, and an index
            stored for a document that has since grown shorter is clamped to the
            pages it now holds.
          </p>
        </section>
        <SourceCodePanel name={source.path}>{source.code}</SourceCodePanel>
      </div>
    </main>
  );
};

export default ProgressPage;
