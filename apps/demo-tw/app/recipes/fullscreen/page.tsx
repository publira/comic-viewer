import { readDemoSource } from "#components/demo-source";
import { basicSamplePages } from "#components/sample-pages";
import { SourceCodePanel } from "#components/source-code-panel";

import { FullscreenReader } from "./_components/fullscreen-reader";

const FullscreenPage = async () => {
  const source = await readDemoSource(
    "recipes/fullscreen/_components/fullscreen-reader.tsx"
  );

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section
          aria-label="Comic reader"
          className="aspect-[4/5] min-h-96 w-full md:aspect-[8/5]"
        >
          <FullscreenReader pages={basicSamplePages} />
        </section>
        <section className="rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-semibold">Fullscreen reading</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            The viewer leaves the browser&apos;s Fullscreen API to the host
            application, because which element should fill the screen and what
            the control looks like are decisions only the surrounding page can
            make. This demo passes its own reader container to{" "}
            <code>requestFullscreen()</code> instead of the whole document, so
            the reader and its toggle are the only things left on screen, and
            the <code>[&amp;:fullscreen]</code> variant drops the rounding the
            box carries the rest of the time.
          </p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            The button reads its label back from the{" "}
            <code>fullscreenchange</code> event rather than from the call it
            made, which keeps it in step when a reader leaves fullscreen through{" "}
            <kbd>Esc</kbd> or the browser&apos;s own control. Nothing has to be
            told about the new size: the viewer measures its container with a{" "}
            <code>ResizeObserver</code>, so the page fit and the switch between
            the single- and double-page layouts follow the container into
            fullscreen and back out on their own.
          </p>
        </section>
        <SourceCodePanel name={source.path}>{source.code}</SourceCodePanel>
      </div>
    </main>
  );
};

export default FullscreenPage;
