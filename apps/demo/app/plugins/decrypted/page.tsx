import { encryptedSamplePages } from "../../_components/sample-pages";
import { SourceCodePanel } from "../../_components/source-code-panel";
import { EncryptedComicViewer } from "./_components/encrypted-comic-viewer";

import styles from "./page.module.css";

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

const PluginDemoPage = () => (
  <main className={styles.main}>
    <div className={styles.container}>
      <EncryptedComicViewer pages={encryptedSamplePages} />
      <section className={styles.heading}>
        <div>
          <h2>Decrypted plugin sample</h2>
          <p>
            Each page is fetched only as an AES-GCM encrypted <code>.enc</code>
            file. <code>definePlugin()</code> decrypts it before the image is
            rendered.
          </p>
        </div>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default PluginDemoPage;
