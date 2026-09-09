import { basicSamplePages } from "../../_components/sample-pages";
import { SourceCodePanel } from "../../_components/source-code-panel";
import { SlotComicViewer } from "./_components/slot-comic-viewer";

import styles from "./page.module.css";

// The odd total leaves the last page without a facing page, so the end page
// pairs with it instead of arriving on a spread of its own.
const slotSamplePages = basicSamplePages.slice(0, 7);

const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";

// The sheet gives the extra page the shape and the colour of a page, and the
// card floats at the centre of it.
const SlotSheet = ({ children }) => (
  <div className={styles.slotSheet}>
    <div className={styles.slotCard}>{children}</div>
  </div>
);

// A slot holds as many pages as it is written with, in that order, and
// counting the spreads from the first start page pairs the two of them.
export const Reader = ({ pages }) => (
  <ComicViewer.Root pages={pages} spreadStartIndex={-2}>
    <ComicViewer.StartPage>
      <SlotSheet>
        <CoverNotice />
      </SlotSheet>
    </ComicViewer.StartPage>

    <ComicViewer.StartPage>
      <SlotSheet>
        <ChapterTitleCard />
      </SlotSheet>
    </ComicViewer.StartPage>

    <ComicViewer.Viewport />

    <ComicViewer.EndPage>
      <SlotSheet>
        <NextChapterCard />
      </SlotSheet>
    </ComicViewer.EndPage>

    <ComicViewer.EndPage>
      <SlotSheet>
        <SeriesRecommendations />
      </SlotSheet>
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
          None of them is counted as a page. The progress reads{" "}
          <code>Pages 1-2 of 7</code> on the first spread of the chapter, and
          the page list keeps the indexes it was given, so the numbering a
          reader sees is the numbering of the document. While the extra pages
          are the ones on screen, the status names them and their place in the
          slot instead, as <code>Start pages 1-2 of 2</code>.
        </p>
        <p>
          In double-page mode they take a half of the spread like any other
          page. Every index before <code>spreadStartIndex</code> is shown on its
          own, so this reader counts the spreads from the first start page with{" "}
          <code>spreadStartIndex=&#123;-2&#125;</code> to open the chapter on
          the two of them facing each other; the chapter itself pairs from page
          1 either way. At the other end the odd page count leaves the last page
          without a facing page, so the next-chapter card pairs with it and the
          side stories arrive on a spread of their own. Each extra page is laid
          out as a sheet the shape of a page, with its card floating at the
          centre, so it sits in the spread exactly where a page would. The links
          and the disclosure inside them stay usable, and the swipe and
          edge-click page turns leave a control that was pressed alone.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default SlotsPage;
