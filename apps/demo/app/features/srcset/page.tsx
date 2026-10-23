import { ComicViewerDemo } from "#components/comic-viewer-demo";
import { srcsetSamplePages } from "#components/sample-pages";
import { SourceCodePanel } from "#components/source-code-panel";

import styles from "./page.module.css";

const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";

const pages = [
  {
    height: 1000,
    id: "page-1",
    src: "/pages/1.jpg",
    // The same image at 400 and 800 pixels wide.
    srcset: "/pages/1-400w.jpg 400w, /pages/1.jpg 800w",
    title: "Page 1",
    width: 800,
  },
  // ...
];

export const Reader = () => (
  <ComicViewer.Root pages={pages}>
    <ComicViewer.Viewport />
    <ComicViewer.Toolbar />
    <ComicViewer.PageNavigation />
  </ComicViewer.Root>
);`;

const SrcsetPage = () => (
  <main className={styles.main}>
    <div className={styles.container}>
      <ComicViewerDemo pages={srcsetSamplePages} />
      <section className={styles.description}>
        <h2>Renditions from a srcset</h2>
        <p>
          Every page lists a 400-pixel and an 800-pixel rendition in{" "}
          <code>srcset</code>, and the viewer fetches the smallest one that
          covers the width it draws the page at in device pixels, the way a
          browser picks a candidate for <code>&lt;img srcset&gt;</code>. On a
          phone that is the small one.
        </p>
        <p>
          Widen the window and the pages that have outgrown their rendition load
          the larger one, while the image already on screen stays drawn until it
          arrives. Narrowing the window again fetches nothing: a page keeps the
          larger image and is drawn scaled down.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default SrcsetPage;
