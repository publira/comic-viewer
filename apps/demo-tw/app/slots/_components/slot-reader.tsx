"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";
import Link from "next/link";

import { TailwindReader } from "../../_components/tailwind-reader";
import { slotClassNames } from "./slot-class-names";

interface SlotReaderProps {
  pages: readonly ViewerPage[];
}

/** Renders a reader that opens on front matter and closes on back matter. */
export const SlotReader = ({ pages }: SlotReaderProps) => (
  <TailwindReader pages={pages}>
    <ComicViewer.StartPage className={slotClassNames.slotPage}>
      <div className={slotClassNames.slotCard}>
        <h3 className="text-base font-semibold">Before you read</h3>
        <p>
          This chapter is published a week ahead of its free release. Please
          keep the pages to yourself until then.
        </p>
        <details>
          <summary className="cursor-pointer font-semibold">
            Why am I seeing this?
          </summary>
          <p className="mt-2">
            Early access comes with the membership this chapter was opened with.
          </p>
        </details>
      </div>
    </ComicViewer.StartPage>

    <ComicViewer.StartPage className={slotClassNames.slotPage}>
      <div className={slotClassNames.slotCard}>
        <h3 className="text-base font-semibold">
          Chapter 1: The long way round
        </h3>
        <p>Written and drawn by the Publira sample studio.</p>
      </div>
    </ComicViewer.StartPage>

    <ComicViewer.EndPage className={slotClassNames.slotPage}>
      <div className={slotClassNames.slotCard}>
        <h3 className="text-base font-semibold">Next chapter</h3>
        <p>Chapter 2 is ready to read.</p>
        <Link className="font-semibold underline" href="/">
          Back to the first chapter
        </Link>
      </div>
    </ComicViewer.EndPage>

    <ComicViewer.EndPage className={slotClassNames.slotPage}>
      <div className={slotClassNames.slotCard}>
        <h3 className="text-base font-semibold">More from this series</h3>
        <p>
          Three side stories follow the same cast between the chapters of the
          main run.
        </p>
        <Link className="font-semibold underline" href="/progress">
          A longer chapter to scrub through
        </Link>
      </div>
    </ComicViewer.EndPage>
  </TailwindReader>
);
