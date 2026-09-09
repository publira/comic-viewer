import { basicSamplePages } from "../_components/sample-pages";
import { SourceCodePanel } from "../_components/source-code-panel";
import { SlotComicViewer } from "./_components/slot-comic-viewer";

import styles from "./page.module.css";

// The odd total leaves the last page without a facing page, so the end page
// pairs with it instead of arriving on a spread of its own.
const slotSamplePages = basicSamplePages.slice(0, 7);

const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";

// A slot holds as many pages as it is written with, in that order.
export const Reader = ({ pages }) => (
  <ComicViewer.Root pages={pages}>
    <ComicViewer.StartPage>
      <CoverNotice />
    </ComicViewer.StartPage>

    <ComicViewer.StartPage>
      <ChapterTitleCard />
    </ComicViewer.StartPage>

    <ComicViewer.Viewport />

    <ComicViewer.EndPage>
      <NextChapterCard />
    </ComicViewer.EndPage>

    <ComicViewer.EndPage>
      <SeriesRecommendations />
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
          own at the two ends of the reading sequence, and each end takes as
          many of them as it is written with. This chapter opens on a notice and
          a title card, and closes on a next-chapter card and a list of side
          stories, each of them turned to exactly as a page is.
        </p>
        <p>
          None of them is counted as a page. The progress still reads{" "}
          <code>Pages 1-2 of 7</code> on the first spread, and the page list
          keeps the indexes it was given, so the numbering a reader sees is the
          numbering of the document. While one of them is on screen on its own,
          the status names it and its place in the slot, as{" "}
          <code>Start page 2 of 2</code>.
        </p>
        <p>
          In double-page mode they take a half of the spread like any other
          page: the pages before the first spread are shown one at a time, so
          the two opening pages arrive in turn, while this chapter holds an odd
          number of pages, which leaves the last one without a facing page, so
          the next-chapter card pairs with it. The links and the disclosure
          inside them stay usable, and the swipe and edge-click page turns leave
          a control that was pressed alone.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default SlotsPage;
