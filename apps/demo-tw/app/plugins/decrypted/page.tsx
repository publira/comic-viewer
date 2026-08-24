import { encryptedSamplePages } from "../../_components/sample-pages";
import { SourceCodePanel } from "../../_components/source-code-panel";
import { TailwindReader } from "../../_components/tailwind-reader";

const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";

const encryptedJpegPlugin = ComicViewer.definePlugin({
  name: "encrypted-jpeg",
  customFetch: ({ signal, url }) =>
    fetch(url, { signal }).then((response) => response.arrayBuffer()),
  afterFetch: ({ buffer }) => decryptPage(buffer),
});

export const Reader = ({ pages }) => (
  <ComicViewer.Root pages={pages} plugins={[encryptedJpegPlugin]}>
    <ComicViewer.Viewport />
    <ComicViewer.Toolbar />
    <ComicViewer.PageNavigation />
  </ComicViewer.Root>
);`;

const DecryptedPluginDemoPage = () => (
  <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950 sm:px-8 dark:bg-slate-950 dark:text-slate-100">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section
        aria-label="Comic reader"
        className="aspect-[8/5] min-h-96 w-full overflow-hidden rounded-xl"
      >
        <TailwindReader mode="encrypted" pages={encryptedSamplePages} />
      </section>
      <section className="rounded-xl border border-slate-300 bg-white p-5 text-sm leading-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-semibold">Decrypted plugin sample</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          A custom fetch hook encrypts each source image for this demo, and an
          <code>afterFetch</code> hook decrypts it before the viewer renders it.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default DecryptedPluginDemoPage;
