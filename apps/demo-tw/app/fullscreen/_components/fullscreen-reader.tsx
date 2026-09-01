"use client";

import type { ViewerPage } from "@publira/comic-viewer";
import { useRef } from "react";

import { TailwindReader } from "../../_components/tailwind-reader";
import { useFullscreen } from "../../_components/use-fullscreen";

interface FullscreenReaderProps {
  pages: readonly ViewerPage[];
}

/** Renders the reader with a control that hands its container to the screen. */
export const FullscreenReader = ({ pages }: FullscreenReaderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, isSupported, toggleFullscreen } =
    useFullscreen(containerRef);

  const handleToggle = async () => {
    try {
      await toggleFullscreen();
    } catch {
      // A browser that turns the request down leaves the reader as it is, so
      // there is nothing to recover from here.
    }
  };

  return (
    // The container is the element handed to the screen, so the control stays
    // reachable in fullscreen along with the reader it belongs to. The rounded
    // page-shaped box it sits in is dropped once the screen sets its size.
    <div
      className="relative h-full w-full overflow-hidden rounded-xl [&:fullscreen]:rounded-none"
      ref={containerRef}
    >
      <TailwindReader pages={pages} />
      <button
        aria-pressed={isFullscreen}
        className="absolute end-3 top-3 z-20 rounded-full bg-black/60 px-3.5 py-1.5 text-sm font-semibold text-slate-100 shadow-lg outline-offset-2 outline-slate-100 transition hover:bg-black/80 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!isSupported}
        onClick={handleToggle}
        type="button"
      >
        {isFullscreen ? "Exit full screen" : "Enter full screen"}
      </button>
    </div>
  );
};
