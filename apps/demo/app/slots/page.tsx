import { basicSamplePages } from "../_components/sample-pages";
import { SourceCodePanel } from "../_components/source-code-panel";
import { SlotComicViewer } from "./_components/slot-comic-viewer";

import styles from "./page.module.css";

// The odd total leaves the last page without a facing page, so the end page
// pairs with it instead of arriving on a spread of its own.
const slotSamplePages = basicSamplePages.slice(0, 7);

const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";

export const Reader = ({ pages }) => (
  <ComicViewer.Root pages={pages}>
    <ComicViewer.StartPage>
      <CoverNotice />
    </ComicViewer.StartPage>

    <ComicViewer.Viewport />

    <ComicViewer.EndPage>
      <NextChapterCard />
    </ComicViewer.EndPage>

    <ComicViewer.Toolbar />
    <ComicViewer.PageNavigation />
  </ComicViewer.Root>
);`;

const SlotsPage = () => (
  <main className={styles.main}>
    <div className={styles.container}>
      <SlotComicViewer pages={slotSamplePages} />
      <section className={styles.description}>
        <h2>Pages around the chapter</h2>
        <p>
          <code>StartPage</code> and <code>EndPage</code> put content of your
          own at the two ends of the reading sequence. The reader opens on the
          notice before the first page and reaches the next-chapter card after
          the last one, turning to both exactly as it turns to a page.
        </p>
        <p>
          Neither of them is counted as a page. The progress still reads{" "}
          <code>Pages 1-2 of 7</code> on the first spread, and the page list
          keeps the indexes it was given, so the numbering a reader sees is the
          numbering of the document. While one of them is on screen on its own,
          the status names it instead of a page number.
        </p>
        <p>
          In double-page mode they take a half of the spread like any other
          page: this chapter holds an odd number of pages, which leaves the last
          one without a facing page, so the next-chapter card pairs with it. The
          links and the disclosure inside them stay usable, and the swipe and
          edge-click page turns leave a control that was pressed alone.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default SlotsPage;
