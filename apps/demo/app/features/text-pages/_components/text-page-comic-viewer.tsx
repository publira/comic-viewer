"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { PageMetadata } from "@publira/comic-viewer";

import { getViewerStyle } from "#components/viewer-layout";

import styles from "../page.module.css";

/** A page set in type rather than drawn, so it has no image to load. */
interface TextPage extends PageMetadata {
  heading: string;
  paragraphs: readonly string[];
}

const textPages: readonly TextPage[] = [
  {
    heading: "Afterword",
    height: 1000,
    id: "afterword-1",
    paragraphs: [
      "This volume began as a single page drawn on the back of a train timetable, and it kept growing until the timetable ran out of back.",
      "Thank you for following the crew this far. The next arc moves the story out of the harbour, and it is the one I have wanted to draw since the first chapter.",
    ],
    title: "Afterword, page 1",
    width: 800,
  },
  {
    heading: "Afterword, continued",
    height: 1000,
    id: "afterword-2",
    paragraphs: [
      "Every chapter was lettered twice: once in pencil while the pages were still rough, and once more when the art had settled.",
      "The second pass is the one you read, and the first one is what kept the jokes landing in the right panel.",
    ],
    title: "Afterword, page 2",
    width: 800,
  },
  {
    heading: "Character notes",
    height: 1000,
    id: "character-notes",
    paragraphs: [
      "Mira was meant to leave after the third chapter. Readers wrote in asking where she had gone before she had even left.",
      "The harbour master has no name yet. Suggestions are welcome, and the strangest one wins.",
    ],
    title: "Character notes",
    width: 800,
  },
  {
    heading: "Credits",
    height: 1000,
    id: "credits",
    paragraphs: [
      "Story and art by the Publira sample studio.",
      "Set in the browser by the comic viewer, without a single image on these four pages.",
    ],
    title: "Credits",
    width: 800,
  },
];

/** Renders a reader whose pages are drawn from text by the application. */
export const TextPageComicViewer = () => (
  <div className={styles.viewer} style={getViewerStyle(textPages)}>
    <ComicViewer.Root
      className={styles.viewerContent}
      initialReadingDirection="ltr"
      pages={textPages}
    >
      {/* Given renderPage alone, the viewport loads no images, so the pages
          need no src. ViewportPage still places each one in its half. */}
      <ComicViewer.Viewport
        renderPage={(page: TextPage) => (
          <ComicViewer.ViewportPage>
            <article aria-label={page.title} className={styles.textPage}>
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
  </div>
);
