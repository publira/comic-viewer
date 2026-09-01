import { basicSamplePages } from "../_components/sample-pages";
import { SourceCodePanel } from "../_components/source-code-panel";
import { LazyComicViewer } from "./_components/lazy-comic-viewer";

import styles from "./page.module.css";

const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";
import { useCallback, useState } from "react";

const CHAPTER_LENGTH = 7;

export const Reader = () => {
  const [pageCount, setPageCount] = useState(CHAPTER_LENGTH);

  const resolvePage = useCallback(async (index, { signal }) => {
    // The endpoint signs the URL it hands back, and the viewer fetches the
    // page right after asking, while the signature is still valid.
    const response = await fetch(\`/api/pages/\${index}\`, { signal });

    return response.json();
  }, []);

  const loadNextChapter = useCallback(() => {
    setPageCount((count) => count + CHAPTER_LENGTH);
  }, []);

  return (
    <ComicViewer.Root
      onEndReached={loadNextChapter}
      pageCount={pageCount}
      resolvePage={resolvePage}
    >
      <ComicViewer.Viewport />
      <ComicViewer.Toolbar />
      <ComicViewer.PageNavigation />
    </ComicViewer.Root>
  );
};`;

const LazyPage = () => (
  <main className={styles.main}>
    <div className={styles.container}>
      <LazyComicViewer pages={basicSamplePages} />
      <section className={styles.description}>
        <h2>Lazy page metadata</h2>
        <p>
          This reader is never handed a page list. It is given the number of
          pages it holds and a <code>resolvePage</code> function, and it asks
          for the metadata of a page only as the reader comes near it. The
          imaginary endpoint behind this demo waits more than a second before
          answering, so the pending placeholder a page shows while its metadata
          is on its way stays on screen long enough to see.
        </p>
        <p>
          Only the pages within <code>pageResolveOverscan</code> of the current
          one are asked for, four on either side by default, which is why the
          request count starts at five rather than at the length of the
          document. A request for a page the reader leaves far behind is aborted
          through the <code>AbortSignal</code> it was given, and its metadata is
          forgotten once the page is further away than both that window and the
          pages the viewport can still render, so a page returned to much later
          is resolved again and a signed URL that has expired in the meantime is
          reissued.
        </p>
        <p>
          The document also grows as it is read. It starts as the first chapter
          of seven pages, and <code>onEndReached</code> appends the next chapter
          once the reader comes within two pages of the end, which the page
          count and the reading progress follow immediately.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default LazyPage;
