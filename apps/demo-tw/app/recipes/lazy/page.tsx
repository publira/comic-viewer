import { readDemoSource } from "#components/demo-source";
import { basicSamplePages } from "#components/sample-pages";
import { SourceCodePanel } from "#components/source-code-panel";

import { LazyReader } from "./_components/lazy-reader";

const LazyPage = async () => {
  const source = await readDemoSource(
    "recipes/lazy/_components/lazy-reader.tsx"
  );

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <LazyReader pages={basicSamplePages} />
        <section className="rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-semibold">Lazy page metadata</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            This reader is never handed a page list. It is given the number of
            pages it holds and a <code>resolvePage</code> function, and it asks
            for the metadata of a page only as the reader comes near it. The
            imaginary endpoint behind this demo waits more than a second before
            answering, so the placeholder a page shows while its metadata is on
            its way stays on screen long enough to see. It is{" "}
            <code>ViewportPendingPage</code> carrying the utilities this demo
            gives it through <code>renderPendingPage</code>, in the place the
            page will take in the spread.
          </p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Only the pages within <code>pageResolveOverscan</code> of the
            current one are asked for, four on either side by default, which is
            why the request count starts at five rather than at the length of
            the document. A request for a page the reader leaves far behind is
            aborted through the <code>AbortSignal</code> it was given, and its
            metadata is forgotten once the page is further away than both that
            window and the pages the viewport can still render, so a page
            returned to much later is resolved again and a signed URL that has
            expired in the meantime is reissued.
          </p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Page images follow a window of their own.{" "}
            <code>imagePreloadSpreads</code> is <code>1</code> here, so the
            viewer fetches and decodes one spread beyond the ones it can render
            on either side of the reader. Those loads are queued behind the
            spread on screen and dropped when the reader moves away from them,
            so the count of decoded pages runs ahead of the three spreads the
            viewport holds without the current one waiting for them.
          </p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            The document also grows as it is read. It starts as the first
            chapter of seven pages, and <code>onEndReached</code> appends the
            next chapter once the reader comes within two pages of the end,
            which the page count and the reading progress follow immediately.
          </p>
        </section>
        <SourceCodePanel name={source.path}>{source.code}</SourceCodePanel>
      </div>
    </main>
  );
};

export default LazyPage;
