import { encryptedSamplePages } from "../../_components/sample-pages";
import { EncryptedComicViewer } from "./_components/encrypted-comic-viewer";

import styles from "./page.module.css";

export default function PluginDemoPage() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <EncryptedComicViewer pages={encryptedSamplePages} />
        <section className={styles.heading}>
          <div>
            <h2>Decrypted plugin sample</h2>
            <p>
              Each page is fetched only as an AES-GCM encrypted{" "}
              <code>.enc</code>
              file. <code>definePlugin()</code> decrypts it before the image is
              rendered.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
