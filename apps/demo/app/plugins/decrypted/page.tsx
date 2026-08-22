import { encryptedSamplePages } from "../../_components/sample-pages";
import { SourceCodePanel } from "../../_components/source-code-panel";
import { EncryptedComicViewer } from "./_components/encrypted-comic-viewer";

import styles from "./page.module.css";

const sourceCode = `import { ComicViewer, definePlugin } from "@publira/comic-viewer";

const encryptedJpegPlugin = definePlugin({
  name: "encrypted-jpeg",
  customFetch: (url) => fetch(url).then((response) => response.arrayBuffer()),
  afterFetch: decryptPage,
});

export const Reader = ({ pages }) => (
  <ComicViewer pages={pages} plugins={[encryptedJpegPlugin]}>
    <ComicViewer.Viewport />
    <ComicViewer.PageNavigation />
  </ComicViewer>
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
