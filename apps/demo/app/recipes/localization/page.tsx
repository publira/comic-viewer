import { basicSamplePages } from "#components/sample-pages";
import { SourceCodePanel } from "#components/source-code-panel";

import { LocalizedComicViewer } from "./_components/localized-comic-viewer";

import styles from "./page.module.css";

const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";

// The status and the slider share it, so what the toolbar shows and what a
// screen reader hears always agree.
const formatPageStatus = ({ firstPage, lastPage, pageCount, slot }) => {
  if (firstPage === 0) {
    if (slot === undefined) {
      return "ページがありません";
    }

    return slot === "start" ? "巻頭ページ" : "巻末ページ";
  }

  return firstPage === lastPage
    ? \`\${firstPage} / \${pageCount} ページ\`
    : \`\${firstPage}〜\${lastPage} / \${pageCount} ページ\`;
};

// Giving the buttons children replaces the default icons, so the arrows are
// drawn here the way the reading direction points them.
const PageNavigation = () => {
  const { readingDirection } = ComicViewer.useViewerContext();
  const previousPath =
    readingDirection === "rtl" ? "m10 6 6 6-6 6" : "m14 6-6 6 6 6";
  const nextPath =
    readingDirection === "rtl" ? "m14 6-6 6 6 6" : "m10 6 6 6-6 6";

  return (
    <ComicViewer.PageNavigation aria-label="ページ送り">
      <ComicViewer.PreviousPageButton aria-label="前のページ">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d={previousPath} />
        </svg>
      </ComicViewer.PreviousPageButton>
      <ComicViewer.NextPageButton aria-label="次のページ">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d={nextPath} />
        </svg>
      </ComicViewer.NextPageButton>
    </ComicViewer.PageNavigation>
  );
};

export const Reader = ({ pages }) => (
  <div lang="ja">
    <ComicViewer.Root pages={pages}>
      <ComicViewer.Viewport />
      <ComicViewer.Toolbar>
        <ComicViewer.PageProgress aria-label="読書の進み具合">
          <ComicViewer.PageProgressSlider format={formatPageStatus} />
          <ComicViewer.PageStatus format={formatPageStatus} />
        </ComicViewer.PageProgress>
      </ComicViewer.Toolbar>
      <PageNavigation />
    </ComicViewer.Root>
  </div>
);`;

const LocalizationPage = () => (
  <main className={styles.main}>
    <div className={styles.container}>
      <LocalizedComicViewer pages={basicSamplePages} />
      <section className={styles.description}>
        <h2>Labels in the reader&rsquo;s language</h2>
        <p>
          Tap the page and the controls read in Japanese. The viewer ships
          English labels, and every one of them can be replaced where the
          component is placed: <code>aria-label</code> names the progress, the
          navigation group, and the page-turn buttons, and a <code>format</code>{" "}
          function names the pages on screen.
        </p>
        <p>
          <code>PageStatus</code> and <code>PageProgressSlider</code> take the
          same <code>format</code>, which receives the pages on screen and
          returns their label. The status shows it, and the slider announces it
          through <code>aria-valuetext</code>, at rest and while a drag is under
          way, so a screen reader hears the page under the thumb in the words
          the toolbar shows. The <code>lang</code> attribute around the reader
          tells it which voice to use.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default LocalizationPage;
