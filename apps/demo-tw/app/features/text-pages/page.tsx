import { readDemoSource } from "#components/demo-source";
import { SourceCodePanel } from "#components/source-code-panel";

import { TextPageReader } from "./_components/text-page-reader";

const TextPagesPage = async () => {
  const source = await readDemoSource(
    "features/text-pages/_components/text-page-reader.tsx"
  );

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section
          aria-label="Comic reader"
          className="aspect-[4/5] min-h-96 w-full overflow-hidden rounded-xl md:aspect-[8/5]"
        >
          <TextPageReader />
        </section>
        <section className="rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-semibold">Pages without an image</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            A page the application draws itself needs no <code>src</code>: its
            type extends <code>PageMetadata</code>, and these four pages of an
            afterword carry a heading and paragraphs set in type instead.{" "}
            <code>Viewport</code> accepts them only when it is given{" "}
            <code>renderPage</code> and no page template, the one form in which
            it loads nothing. That form takes no layout template either, so the
            track and the page sets are styled through their public{" "}
            <code>pcv-*</code> classes, and <code>ViewportPage</code> reports
            the <code>data-page-side</code> each page meets the gutter by.
          </p>
        </section>
        <SourceCodePanel name={source.path}>{source.code}</SourceCodePanel>
      </div>
    </main>
  );
};

export default TextPagesPage;
