import { readDemoSource } from "#components/demo-source";
import { encryptedSamplePages } from "#components/sample-pages";
import { SourceCodePanel } from "#components/source-code-panel";

import { DecryptedReader } from "./_components/decrypted-reader";

const DecryptedPluginDemoPage = async () => {
  const source = await readDemoSource(
    "plugins/decrypted/_components/decrypted-reader.tsx"
  );

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section
          aria-label="Comic reader"
          className="aspect-[4/5] min-h-96 w-full overflow-hidden rounded-xl md:aspect-[8/5]"
        >
          <DecryptedReader pages={encryptedSamplePages} />
        </section>
        <section className="rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-semibold">Decrypted plugin sample</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            A <code>customFetch</code> hook retrieves the pre-encrypted{" "}
            <code>.enc</code> pages, because the response is ciphertext the
            browser cannot decode as an image, and an <code>afterFetch</code>{" "}
            hook decrypts what came back before the viewer decodes it. The page
            list names the type the bytes turn out to be through{" "}
            <code>mimeType</code>.
          </p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            A plugin changes how a page is fetched and transformed, never how it
            is styled, so the reader below is composed exactly as it is on the
            entry point.
          </p>
        </section>
        <SourceCodePanel name={source.path}>{source.code}</SourceCodePanel>
      </div>
    </main>
  );
};

export default DecryptedPluginDemoPage;
