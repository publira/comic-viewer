import { SourceCodePanel } from "#components/source-code-panel";

import { TextPageComicViewer } from "./_components/text-page-comic-viewer";

import styles from "./page.module.css";

const sourceCode = `import * as ComicViewer from "@publira/comic-viewer";
import type { PageMetadata } from "@publira/comic-viewer";

// A page set in type has no image, so it extends PageMetadata, which leaves
// src out, with the fields the renderer reads.
interface TextPage extends PageMetadata {
  heading: string;
  paragraphs: string[];
}

const pages: TextPage[] = [
  {
    heading: "Afterword",
    height: 1000,
    id: "afterword-1",
    paragraphs: ["This volume began as a single page drawn on the back of a train timetable…"],
    title: "Afterword, page 1",
    width: 800,
  },
  // …
];

// Given renderPage, the viewport loads no images, so the pages need no src.
// ViewportPage still places each one in its half of the spread.
export const Reader = () => (
  <ComicViewer.Root initialReadingDirection="ltr" pages={pages}>
    <ComicViewer.Viewport
      renderPage={(page: TextPage) => (
        <ComicViewer.ViewportPage>
          <article aria-label={page.title} className="text-page">
            <h3>{page.heading}</h3>
            {page.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </article>
        </ComicViewer.ViewportPage>
      )}
    />
    <ComicViewer.Toolbar />
    <ComicViewer.PageNavigation />
  </ComicViewer.Root>
);`;

const TextPagesPage = () => (
  <main className={styles.main}>
    <div className={styles.container}>
      <TextPageComicViewer />
      <section className={styles.description}>
        <h2>Pages without an image</h2>
        <p>
          A page the application draws itself needs no <code>src</code>. Its
          type extends <code>PageMetadata</code>, which holds what every page
          has: an <code>id</code>, an accessible <code>title</code>, and the
          optional <code>width</code>, <code>height</code>, and{" "}
          <code>layout</code>. The four pages of this afterword carry a heading
          and paragraphs instead, and are set in type in the browser.
        </p>
        <p>
          <code>Viewport</code> accepts such pages only when it is given{" "}
          <code>renderPage</code> and no page template, the form in which it
          loads nothing. Without <code>renderPage</code> it loads the image of
          each page, so TypeScript asks for <code>src</code> there. Each page is
          wrapped in <code>ViewportPage</code>, which places it in its half of
          the spread exactly as an image page is placed, and the pages slide on
          a turn and follow the finger during a swipe as image pages do.
        </p>
      </section>
      <SourceCodePanel code={sourceCode} />
    </div>
  </main>
);

export default TextPagesPage;
