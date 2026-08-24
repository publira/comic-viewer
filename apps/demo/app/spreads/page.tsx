import { ComicViewerDemo } from "../_components/comic-viewer-demo";
import { basicSamplePages } from "../_components/sample-pages";
import { SourceCodePanel } from "../_components/source-code-panel";

import styles from "./page.module.css";

// The first page stands alone, and the even total leaves the last page
// unpaired as well, so both ends of the arrangement are on screen.
const spreadSamplePages = basicSamplePages.slice(0, 8);

const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";

export const Reader = ({ pages }) => (
  <ComicViewer.Root pages={pages} spreadStartIndex={1}>
    <ComicViewer.Viewport />
    <ComicViewer.Toolbar />
    <ComicViewer.PageNavigation />
  </ComicViewer.Root>
);`;

const SpreadsPage = () => (
  <main className={styles.main}>
    <div className={styles.container}>
      <ComicViewerDemo pages={spreadSamplePages} spreadStartIndex={1} />
      <section className={styles.description}>
        <h2>Cover before the spreads</h2>
        <p>
          <code>spreadStartIndex</code> is the page every spread is counted
          from. The default <code>0</code> pairs the pages from the very first
          one, while the <code>1</code> used here leaves the first page on its
          own as a cover and pairs the pages that follow it. A page left
          unpaired at either end keeps the half of the spread it would have in a
          printed book instead of sitting in the middle.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default SpreadsPage;
