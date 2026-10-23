"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";

// Slot pages and layout templates are found by component identity, which a
// server component cannot pass on, so they are written in a client component.
export const SlotReader = ({ pages }: { pages: ViewerPage[] }) => (
  <ComicViewer.Root initialIndex={ComicViewer.START_PAGE_INDEX} pages={pages}>
    <ComicViewer.StartPage>
      <p>Start page written in a client component</p>
    </ComicViewer.StartPage>
    <ComicViewer.Viewport>
      <ComicViewer.ViewportTrack className="slot-reader-track">
        <ComicViewer.ViewportPageSet>
          <ComicViewer.ViewportPageSlot>
            <ComicViewer.ViewportPage>
              <ComicViewer.PageCanvas />
            </ComicViewer.ViewportPage>
          </ComicViewer.ViewportPageSlot>
        </ComicViewer.ViewportPageSet>
      </ComicViewer.ViewportTrack>
    </ComicViewer.Viewport>
    <ComicViewer.EndPage>
      <p>End page written in a client component</p>
    </ComicViewer.EndPage>
  </ComicViewer.Root>
);
