import { basicSamplePages } from "#components/sample-pages";
import { SourceCodePanel } from "#components/source-code-panel";
import { getViewerStyle } from "#components/viewer-layout";

import { WatermarkedComicViewer } from "./_components/watermarked-comic-viewer";

import styles from "./page.module.css";

const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";

const watermarkPlugin = ComicViewer.definePlugin({
  name: "text-watermark",
  // The page has already been decoded, so the watermark is drawn onto the
  // image itself instead of being re-encoded as a JPEG for the viewer.
  afterDecode: ({ image }) => addWatermark(image),
});

export const Reader = ({ pages }) => (
  <ComicViewer.Root pages={pages} plugins={[watermarkPlugin]}>
    <ComicViewer.Viewport />
    <ComicViewer.Toolbar />
    <ComicViewer.PageNavigation />
  </ComicViewer.Root>
);`;

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
            The <code>afterDecode</code> hook draws a text watermark onto each
            page after the viewer has decoded it. It hands back the image it
            drew, so the page reaches the canvas without the second decode and
            the lossy re-encode that transforming the fetched JPEG would cost.
          </p>
        </div>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default WatermarkPluginDemoPage;
