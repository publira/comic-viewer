"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

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

const gestureOptions = [
  { label: "Edge click", name: "edgeClick" },
  { label: "Swipe", name: "swipe" },
  { label: "Double tap", name: "doubleTap" },
  { label: "Arrow keys", name: "keyboard" },
] as const;

type GestureName = (typeof gestureOptions)[number]["name"];

const gestureOptionClassName =
  "inline-flex cursor-pointer items-center gap-2 font-semibold has-disabled:cursor-not-allowed has-disabled:text-slate-500 dark:has-disabled:text-slate-400";

interface GesturesReaderProps {
  pages: readonly ViewerPage[];
}

/**
 * A reader whose gestures a panel below it turns on and off. Each gesture is
 * one group of the `gestures` option on the viewport.
 */
export const GesturesReader = ({ pages }: GesturesReaderProps) => {
  const [enabled, setEnabled] = useState<Record<GestureName, boolean>>({
    doubleTap: true,
    edgeClick: true,
    keyboard: true,
    swipe: true,
  });
  const [isKeyboardGlobal, setIsKeyboardGlobal] = useState(false);

  return (
    <>
      <section
        aria-label="Comic reader"
        className="aspect-[4/5] min-h-96 w-full overflow-hidden rounded-xl md:aspect-[8/5]"
      >
        <ComicViewer.Root
          className="relative flex h-full min-h-0 w-full min-w-0 overflow-hidden rounded-xl bg-slate-950 text-slate-100 shadow-2xl shadow-slate-950/30"
          pages={pages}
        >
          {/* The track is three viewports wide and turns pages by translating itself.
              The page set, the slot, and the page each align the half of the spread they
              hold through the `data-page-side` attribute the rail reports. */}
          <ComicViewer.Viewport
            className="group/viewport relative flex min-h-0 min-w-0 flex-1 touch-pan-y overflow-hidden data-[pannable]:cursor-grab data-[pannable]:touch-none data-[panning]:cursor-grabbing"
            gestures={{
              doubleTap: { enabled: enabled.doubleTap },
              edgeClick: { enabled: enabled.edgeClick },
              keyboard: {
                enabled: enabled.keyboard,
                scope: isKeyboardGlobal ? "global" : "viewport",
              },
              swipe: { enabled: enabled.swipe },
            }}
          >
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
      </section>
      <fieldset className="min-w-0 rounded-xl border border-slate-300 bg-white px-5 pt-3 pb-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <legend className="px-1 text-xs text-slate-600 dark:text-slate-300">
          Gestures
        </legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {gestureOptions.map((option) => (
            <label className={gestureOptionClassName} key={option.name}>
              <input
                checked={enabled[option.name]}
                className="size-4 accent-sky-600"
                onChange={(event) => {
                  const { checked } = event.target;
                  setEnabled((current) => ({
                    ...current,
                    [option.name]: checked,
                  }));
                }}
                type="checkbox"
              />
              {option.label}
            </label>
          ))}
          <label className={gestureOptionClassName}>
            <input
              checked={isKeyboardGlobal}
              className="size-4 accent-sky-600"
              disabled={!enabled.keyboard}
              onChange={(event) => {
                setIsKeyboardGlobal(event.target.checked);
              }}
              type="checkbox"
            />
            Arrow keys from anywhere on the page
          </label>
        </div>
      </fieldset>
    </>
  );
};
