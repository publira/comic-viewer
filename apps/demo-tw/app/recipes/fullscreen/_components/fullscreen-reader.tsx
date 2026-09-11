"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useRef, useSyncExternalStore } from "react";
import type { RefObject } from "react";

/**
 * The document reports every change, including the ones the page did not ask
 * for, such as leaving fullscreen through Escape or the browser's own control.
 */
const subscribeToFullscreenChange = (onFullscreenChange: () => void) => {
  document.addEventListener("fullscreenchange", onFullscreenChange);

  return () => {
    document.removeEventListener("fullscreenchange", onFullscreenChange);
  };
};

/** Whether the API exists never changes, so there is nothing to listen to. */
const subscribeToNothing = () => () => {
  // The value is fixed for the lifetime of the document.
};

const isFullscreenEnabled = () => document.fullscreenEnabled;

/** Rendering happens on the server, where there is no Fullscreen API to ask. */
const getServerSnapshot = () => false;

interface Fullscreen {
  /** Whether the element behind the ref is the one currently filling the screen. */
  isFullscreen: boolean;
  /** Whether this document is allowed to enter fullscreen at all. */
  isSupported: boolean;
  /** Enters fullscreen, or leaves it when an element already fills the screen. */
  toggleFullscreen: () => Promise<void>;
}

/**
 * Drives the native Fullscreen API for a single element. A browser only grants
 * a request that comes out of a user gesture, so call `toggleFullscreen`
 * straight from an event handler.
 *
 * The state is read back from the document rather than from the return of the
 * request, which keeps a control in step with what is on screen however
 * fullscreen was left.
 *
 * Only the standard names are used. The prefixed WebKit ones would matter for
 * Safari before 16.4, which is older than the CSS these demos are already
 * written in, such as `light-dark()`, so a fallback could never be reached.
 */
export const useFullscreen = (
  targetRef: RefObject<HTMLElement | null>
): Fullscreen => {
  const isFullscreen = useSyncExternalStore(
    subscribeToFullscreenChange,
    () =>
      targetRef.current !== null &&
      document.fullscreenElement === targetRef.current,
    getServerSnapshot
  );
  // Until the browser has hydrated the markup there is no API to ask, so a
  // control renders unavailable and turns usable where fullscreen is offered.
  const isSupported = useSyncExternalStore(
    subscribeToNothing,
    isFullscreenEnabled,
    getServerSnapshot
  );

  const toggleFullscreen = useCallback(async () => {
    const target = targetRef.current;

    if (target === null) {
      return;
    }

    if (document.fullscreenElement === null) {
      await target.requestFullscreen();
      return;
    }

    await document.exitFullscreen();
  }, [targetRef]);

  return { isFullscreen, isSupported, toggleFullscreen };
};

const navigationButtonClassName =
  "pointer-events-auto absolute top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/60 p-0 text-slate-100 shadow-lg outline-offset-2 outline-slate-100 transition hover:bg-black/80 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * The page-turn buttons over the page. The logical `start-3` and `end-3` place
 * them on the sides the reading direction gives them, and the icons point the
 * way a page turn goes, which the viewer context reports.
 */
const PageNavigation = () => {
  const { readingDirection } = ComicViewer.useViewerContext();
  const PreviousIcon = readingDirection === "rtl" ? ChevronRight : ChevronLeft;
  const NextIcon = readingDirection === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <ComicViewer.PageNavigation className="pointer-events-none absolute inset-0 z-10 transition duration-150 ease-out aria-hidden:translate-y-2 aria-hidden:opacity-0">
      <ComicViewer.PreviousPageButton
        className={`start-3 ${navigationButtonClassName}`}
      >
        <PreviousIcon aria-hidden="true" className="size-6" />
      </ComicViewer.PreviousPageButton>
      <ComicViewer.NextPageButton
        className={`end-3 ${navigationButtonClassName}`}
      >
        <NextIcon aria-hidden="true" className="size-6" />
      </ComicViewer.NextPageButton>
    </ComicViewer.PageNavigation>
  );
};

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
      <ComicViewer.Root
        className="relative flex h-full min-h-0 w-full min-w-0 overflow-hidden rounded-xl bg-slate-950 text-slate-100 shadow-2xl shadow-slate-950/30"
        pages={pages}
      >
        {/* The track is three viewports wide and turns pages by translating itself.
            The page set, the slot, and the page each align the half of the spread they
            hold through the `data-page-side` attribute the rail reports. */}
        <ComicViewer.Viewport className="group/viewport relative flex min-h-0 min-w-0 flex-1 touch-pan-y overflow-hidden data-[pannable]:cursor-grab data-[pannable]:touch-none data-[panning]:cursor-grabbing">
          <ComicViewer.ViewportTrack className="flex h-full w-[300%] shrink-0 basis-[300%] [transform:translateX(calc(-33.3333%_+_var(--pcv-drag-offset)))] data-[dragging]:transition-none data-[transition-state=active]:transition-transform data-[transition-state=active]:duration-[260ms] data-[transition-state=active]:ease-out data-[transition-state=active]:data-[slide-direction=left]:[transform:translateX(calc(-66.6667%_+_var(--pcv-drag-offset)))] data-[transition-state=active]:data-[slide-direction=right]:[transform:translateX(var(--pcv-drag-offset))]">
            {/* The pan and the zoom of a pinch gesture apply to the spread on screen. */}
            <ComicViewer.ViewportPageSet className="flex h-full min-w-0 shrink-0 basis-1/3 data-[page-side=left]:justify-start data-[page-side=right]:justify-end data-[rail-slot=current]:[transform:translate(var(--pcv-pan-x,0)_var(--pcv-pan-y,0))_scale(var(--pcv-zoom-scale,1))]">
              {/* A page that is a whole spread on its own keeps both halves of the set,
                  so the double-page basis it would otherwise take is given back to it. */}
              <ComicViewer.ViewportPageSlot className="flex min-w-0 flex-1 items-center justify-center data-[page-side=left]:justify-end data-[page-side=right]:justify-start data-[view-mode=double]:max-w-1/2 data-[view-mode=double]:basis-1/2 data-[view-mode=double]:data-[page-layout=spread]:max-w-full data-[view-mode=double]:data-[page-layout=spread]:basis-full">
                <ComicViewer.ViewportPage className="flex h-full w-full min-w-0 items-center justify-center data-[page-side=left]:justify-end data-[page-side=right]:justify-start">
                  {/* The page fit mode the viewport reports is what sizes the image. */}
                  <ComicViewer.PageCanvas className="h-full max-w-full bg-slate-900 object-contain transition-[filter] duration-150 group-data-[page-fit-mode=actual]/viewport:h-auto group-data-[page-fit-mode=actual]/viewport:w-auto group-data-[page-fit-mode=actual]/viewport:max-w-none group-data-[page-fit-mode=width]/viewport:h-auto group-data-[page-fit-mode=width]/viewport:w-full group-data-[page-fit-mode=width]/viewport:max-w-none data-[placeholder]:brightness-75 data-[placeholder]:saturate-75" />
                </ComicViewer.ViewportPage>
              </ComicViewer.ViewportPageSlot>
            </ComicViewer.ViewportPageSet>
          </ComicViewer.ViewportTrack>
        </ComicViewer.Viewport>
        {/* The toolbar slides out of sight with the `aria-hidden` the viewer sets
            on it while the reader controls are at rest. */}
        <ComicViewer.Toolbar className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 bg-linear-to-t from-black/80 via-black/55 to-transparent px-3 pt-8 pb-3 transition duration-150 ease-out aria-hidden:translate-y-2 aria-hidden:opacity-0">
          {/* The slider reports the share of the document its thumb rests at as
                `--pcv-page-progress-fill`, which paints the part of the track behind it,
                and the fill runs the way the reader turns pages. */}
          <ComicViewer.PageProgress className="mx-auto min-w-0 shrink basis-3/5">
            <ComicViewer.PageProgressSlider className="block h-3.5 w-full cursor-pointer appearance-none bg-transparent p-0 outline-offset-4 outline-slate-100 [--pcv-page-progress-fill-direction:to_right] focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50 rtl:[--pcv-page-progress-fill-direction:to_left] [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-slate-100 [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-black/65 [&::-moz-range-track]:[background-image:linear-gradient(var(--pcv-page-progress-fill-direction),var(--color-slate-100)_var(--pcv-page-progress-fill),transparent_var(--pcv-page-progress-fill))] [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-black/65 [&::-webkit-slider-runnable-track]:[background-image:linear-gradient(var(--pcv-page-progress-fill-direction),var(--color-slate-100)_var(--pcv-page-progress-fill),transparent_var(--pcv-page-progress-fill))] [&::-webkit-slider-thumb]:-mt-[0.3125rem] [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-slate-100" />
            <ComicViewer.PageStatus className="mt-1.5 block text-center text-sm text-slate-100" />
          </ComicViewer.PageProgress>
        </ComicViewer.Toolbar>
        <PageNavigation />
      </ComicViewer.Root>
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
