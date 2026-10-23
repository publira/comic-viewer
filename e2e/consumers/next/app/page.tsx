import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";

import { SlotReader } from "./slot-reader";
import { ZoomStatus } from "./zoom-status";

const pages: ViewerPage[] = [
  { id: "page-1", src: "/pages/1.jpg", title: "Page 1" },
  { id: "page-2", src: "/pages/2.jpg", title: "Page 2" },
];

// A server component, so every part of the viewer is a client reference here.
const Home = () => (
  <main>
    <div style={{ height: "100vh" }}>
      <ComicViewer.Root initialReadingDirection="rtl" pages={pages}>
        <ComicViewer.Viewport />
        <ComicViewer.Toolbar>
          <ComicViewer.PageProgress>
            <ComicViewer.PageProgressSlider />
            <ComicViewer.PageStatus />
          </ComicViewer.PageProgress>
        </ComicViewer.Toolbar>
        <ComicViewer.PageNavigation />
        <ZoomStatus />
      </ComicViewer.Root>
    </div>
    <div style={{ height: "100vh" }}>
      <SlotReader pages={pages} />
    </div>
  </main>
);

export default Home;
