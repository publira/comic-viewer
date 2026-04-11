"use client";

import { ComicViewer } from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";

import "@publira/comic-viewer/core.css";
import styles from "./page.module.css";

const createPlaceholderPage = (
  id: string,
  title: string,
  from: string,
  to: string
): ViewerPage => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000" role="img" aria-label="${title}"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/></linearGradient></defs><rect width="800" height="1000" fill="url(#bg)"/><text x="50%" y="50%" font-family="ui-sans-serif, system-ui" font-size="72" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${title}</text></svg>`;
  return {
    id,
    src: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    title,
  };
};

const samplePages: ViewerPage[] = [
  createPlaceholderPage("page-1", "Page 1", "#6d28d9", "#1d4ed8"),
  createPlaceholderPage("page-2", "Page 2", "#0f766e", "#1d4ed8"),
  createPlaceholderPage("page-3", "Page 3", "#b45309", "#b91c1c"),
  createPlaceholderPage("page-4", "Page 4", "#047857", "#0f766e"),
  createPlaceholderPage("page-5", "Page 5", "#1d4ed8", "#4338ca"),
];

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1>Comic Viewer Demo</h1>
        <ComicViewer pages={samplePages} className={styles.viewer}>
          <ComicViewer.Toolbar />
          <ComicViewer.Viewport />
        </ComicViewer>
      </div>
    </main>
  );
}
