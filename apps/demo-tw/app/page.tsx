import { readerSourceCode } from "./_components/reader-source";
import { basicSamplePages } from "./_components/sample-pages";
import { SourceCodePanel } from "./_components/source-code-panel";
import { TailwindReader } from "./_components/tailwind-reader";

const Home = () => (
  <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8 dark:bg-slate-950 dark:text-slate-100">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section
        aria-label="Comic reader"
        className="aspect-[4/5] min-h-96 w-full overflow-hidden rounded-xl md:aspect-[8/5]"
      >
        <TailwindReader pages={basicSamplePages} />
      </section>
      <section className="rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-semibold">Basic image loading</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Each page uses a normal image URL. This maintained styling reference
          composes the public viewer primitives with Tailwind utilities and
          deliberately does not import{" "}
          <code>@publira/comic-viewer/default.css</code>. Nothing here is
          decoration: the rail turns pages because of <code>w-[300%]</code> and
          the <code>translateX(…)</code> transforms, and the toolbar and the
          navigation hide through <code>aria-hidden:opacity-0</code>, so the
          reader below is the whole styling the other demos build on.
        </p>
      </section>
      <SourceCodePanel code={readerSourceCode} />
    </div>
  </main>
);

export default Home;
