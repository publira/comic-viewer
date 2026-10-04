import { readDemoSource } from "#components/demo-source";
import { basicSamplePages } from "#components/sample-pages";
import { SourceCodePanel } from "#components/source-code-panel";

import { LocalizedReader } from "./_components/localized-reader";

const LocalizationPage = async () => {
  const source = await readDemoSource(
    "recipes/localization/_components/localized-reader.tsx"
  );

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section
          aria-label="Comic reader"
          className="aspect-[4/5] min-h-96 w-full overflow-hidden rounded-xl md:aspect-[8/5]"
        >
          <LocalizedReader pages={basicSamplePages} />
        </section>
        <section className="rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-semibold">
            Labels in the reader&rsquo;s language
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Tap the page and the controls read in Japanese. The viewer ships
            English labels, and every one of them can be replaced where the
            component is placed: <code>aria-label</code> names the progress, the
            navigation group, and the page-turn buttons, and a{" "}
            <code>format</code> function names the pages on screen.
          </p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            <code>PageStatus</code> and <code>PageProgressSlider</code> take the
            same <code>format</code>, which receives the pages on screen and
            returns their label. The status shows it, and the slider announces
            it through <code>aria-valuetext</code>, at rest and while a drag is
            under way, so a screen reader hears the page under the thumb in the
            words the toolbar shows. The <code>lang</code> attribute around the
            reader tells it which voice to use.
          </p>
        </section>
        <SourceCodePanel name={source.path}>{source.code}</SourceCodePanel>
      </div>
    </main>
  );
};

export default LocalizationPage;
