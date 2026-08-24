import { ComicViewerDemo } from "../_components/comic-viewer-demo";
import { basicSamplePages } from "../_components/sample-pages";
import { SourceCodePanel } from "../_components/source-code-panel";

import styles from "./page.module.css";

const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";

export const Reader = ({ pages }) => (
  <ComicViewer.Root pages={pages} initialReadingDirection="ltr">
    <ComicViewer.Viewport />
    <ComicViewer.Toolbar />
    <ComicViewer.PageNavigation />
  </ComicViewer.Root>
);`;

const LeftToRightPage = () => (
  <main className={styles.main}>
    <div className={styles.container}>
      <ComicViewerDemo initialReadingDirection="ltr" pages={basicSamplePages} />
      <section className={styles.description}>
        <h2>Left-to-right reading</h2>
        <p>
          The other demos keep the default <code>rtl</code> direction. With{" "}
          <code>initialReadingDirection</code> set to <code>ltr</code>, a spread
          starts on its left half, a page turn moves the reader to the right,
          and the navigation buttons swap sides to match. The last page of this
          sample has no page to face, and it keeps the half a spread starts on.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default LeftToRightPage;
