import { basicSamplePages } from "../../_components/sample-pages";
import { getViewerStyle } from "../../_components/viewer-layout";
import { WatermarkedComicViewer } from "./_components/watermarked-comic-viewer";

import styles from "./page.module.css";

const WatermarkPluginDemoPage = () => (
  <main className={styles.main}>
    <div className={styles.container}>
      <div className={styles.viewer} style={getViewerStyle(basicSamplePages)}>
        <WatermarkedComicViewer pages={basicSamplePages} />
      </div>
      <section className={styles.heading}>
        <div>
          <h2>Text watermark plugin sample</h2>
          <p>
            The <code>afterFetch</code> hook draws a text watermark onto each
            JPEG before the viewer renders it.
          </p>
        </div>
      </section>
    </div>
  </main>
);

export default WatermarkPluginDemoPage;
