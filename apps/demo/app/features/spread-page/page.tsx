import { ComicViewerDemo } from "#components/comic-viewer-demo";
import { spreadPageSamplePages } from "#components/sample-pages";
import { SourceCodePanel } from "#components/source-code-panel";

import styles from "./page.module.css";

const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";

const pages = [
  { id: "page-1", src: "/pages/1.jpg", title: "Page 1" },
  { id: "page-2", src: "/pages/2.jpg", title: "Page 2" },
  { id: "page-3", src: "/pages/3.jpg", title: "Page 3" },
  // One landscape image covering both halves of a printed sheet.
  {
    height: 1000,
    id: "page-4",
    layout: "spread",
    src: "/pages/spread.png",
    title: "Page 4",
    width: 1600,
  },
  { id: "page-5", src: "/pages/5.jpg", title: "Page 5" },
];

export const Reader = () => (
  <ComicViewer.Root pages={pages}>
    <ComicViewer.Viewport />
    <ComicViewer.Toolbar />
    <ComicViewer.PageNavigation />
  </ComicViewer.Root>
);`;

const SpreadPagePage = () => (
  <main className={styles.main}>
    <div className={styles.container}>
      <ComicViewerDemo pages={spreadPageSamplePages} />
      <section className={styles.description}>
        <h2>A page that is a whole spread</h2>
        <p>
          Page 4 of this document is one landscape image covering both halves of
          a printed sheet, which <code>layout: &quot;spread&quot;</code>{" "}
          declares the way EPUB fixed layout does with{" "}
          <code>rendition:page-spread-center</code>. In double-page mode it
          takes a page set of its own at the full width of the viewport rather
          than being squeezed into one half, and it counts as both halves of its
          sheet, so page 3 is left facing the blank half before it and pages 5
          and 6 pair again exactly as they would in print.
        </p>
        <p>
          Narrow the window until the reader falls back to a single page: the
          spread is still shown whole, fitted to the width of the viewport, so a
          phone reader never sees half a picture. Turning the page steps over it
          as one unit in both modes, and the reading progress counts it as the
          one page of the document that it is.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default SpreadPagePage;
