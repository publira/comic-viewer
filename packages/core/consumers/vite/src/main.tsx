import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@publira/comic-viewer/default.css";

const pages: ViewerPage[] = [
  { id: "page-1", src: "/pages/1.jpg", title: "Page 1" },
  { id: "page-2", src: "/pages/2.jpg", title: "Page 2" },
];

const container = document.querySelector("#root");

if (container === null) {
  throw new Error("The page has no #root element.");
}

createRoot(container).render(
  <StrictMode>
    <div style={{ height: "100vh" }}>
      <ComicViewer.Root initialReadingDirection="rtl" pages={pages}>
        <ComicViewer.StartPage>Start page</ComicViewer.StartPage>
        <ComicViewer.Viewport />
        <ComicViewer.Toolbar />
        <ComicViewer.PageNavigation />
      </ComicViewer.Root>
    </div>
  </StrictMode>
);
