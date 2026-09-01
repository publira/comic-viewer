"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";
import Link from "next/link";

import { TailwindReader } from "../../_components/tailwind-reader";

const slotCardClassName =
  "flex max-w-sm flex-col gap-3 rounded-lg border border-slate-100/25 bg-black/45 p-6 text-sm leading-6";

interface SlotReaderProps {
  pages: readonly ViewerPage[];
}

/** Renders a reader that opens on a notice and closes on a chapter link. */
export const SlotReader = ({ pages }: SlotReaderProps) => (
  <TailwindReader
    endPage={
      <ComicViewer.EndPage className="flex h-full w-full items-center justify-center overflow-auto data-[page-side=left]:justify-end data-[page-side=right]:justify-start">
        <div className={slotCardClassName}>
          <h3 className="text-base font-semibold">Next chapter</h3>
          <p>Chapter 2 is ready to read.</p>
          <Link className="font-semibold underline" href="/">
            Back to the first chapter
          </Link>
        </div>
      </ComicViewer.EndPage>
    }
    pages={pages}
    startPage={
      <ComicViewer.StartPage className="flex h-full w-full items-center justify-center overflow-auto data-[page-side=left]:justify-end data-[page-side=right]:justify-start">
        <div className={slotCardClassName}>
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
              Early access comes with the membership this chapter was opened
              with.
            </p>
          </details>
        </div>
      </ComicViewer.StartPage>
    }
  />
);
