import { ComicViewerDemo } from "#components/comic-viewer-demo";
import { srcsetSamplePages } from "#components/sample-pages";
import { SourceCodePanel } from "#components/source-code-panel";

import styles from "./page.module.css";

const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";

const pages = [
  {
    height: 1000,
    id: "page-1",
    // The fallback when srcset is missing or yields no candidate.
    src: "/pages/1-800w.jpg",
    // The same image at 400, 800, and 1600 pixels wide.
    srcset:
      "/pages/1-400w.jpg 400w, /pages/1-800w.jpg 800w, /pages/1-1600w.jpg 1600w",
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
          Every page lists renditions 400, 800, and 1600 pixels wide in{" "}
          <code>srcset</code>, and the viewer fetches the smallest one that
          covers the width it draws the page at in device pixels, the way a
          browser picks a candidate for <code>&lt;img srcset&gt;</code>. The
          label at the top of each page names the rendition on screen: 400w on a
          phone, 800w on a desktop display, and 1600w on a high-density one.
        </p>
        <p>
          Widen the window and the pages that have outgrown their rendition load
          the larger one, while the image already on screen stays drawn until it
          arrives. Narrowing the window again fetches nothing: a page keeps the
          larger image and is drawn scaled down.
        </p>
        <p>
          The rendition is then decoded no wider than the page is drawn, rather
          than at the size of the file, so a page never holds more pixels in
          memory than the screen shows. A rendition that is narrower already is
          decoded at its own size.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default SrcsetPage;
