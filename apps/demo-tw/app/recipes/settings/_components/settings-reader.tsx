"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type {
  PageFitMode,
  ReadingDirection,
  ViewerPage,
  ViewMode,
} from "@publira/comic-viewer";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface SettingOption<TValue extends string> {
  label: string;
  value: TValue;
}

const readingDirectionOptions: readonly SettingOption<ReadingDirection>[] = [
  { label: "Right to left", value: "rtl" },
  { label: "Left to right", value: "ltr" },
];

const viewModeOptions: readonly SettingOption<ViewMode>[] = [
  { label: "Single page", value: "single" },
  { label: "Double page", value: "double" },
];

const pageFitModeOptions: readonly SettingOption<PageFitMode>[] = [
  { label: "Height", value: "height" },
  { label: "Width", value: "width" },
  { label: "Actual size", value: "actual" },
];

interface SettingOptionsProps<TValue extends string> {
  legend: string;
  name: string;
  onChange: (value: TValue) => void;
  options: readonly SettingOption<TValue>[];
  value: TValue;
}

/** One setting of the panel, as a group of radio buttons. */
const SettingOptions = <TValue extends string>({
  legend,
  name,
  onChange,
  options,
  value,
}: SettingOptionsProps<TValue>) => (
  <fieldset className="min-w-0 flex-1 basis-56 rounded-xl border border-slate-300 bg-white px-4 pt-2 pb-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <legend className="px-1 text-xs text-slate-600 dark:text-slate-400">
      {legend}
    </legend>
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {options.map((option) => (
        <label
          className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold"
          key={option.value}
        >
          <input
            checked={option.value === value}
            className="accent-sky-600 dark:accent-sky-400"
            name={name}
            onChange={() => onChange(option.value)}
            type="radio"
            value={option.value}
          />
          {option.label}
        </label>
      ))}
    </div>
  </fieldset>
);

/**
 * The reader-setting toggles of the library carry no look of their own, so this
 * demo dresses them as the pill the navigation buttons wear and lets
 * `aria-pressed` mark the setting the reader is on.
 */
const settingToggleClassName =
  "shrink-0 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-slate-100 outline-offset-2 outline-slate-100 transition hover:bg-black/80 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:bg-slate-100/25";

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

interface SettingsReaderProps {
  pages: readonly ViewerPage[];
}

/**
 * Renders a reader whose settings the application holds, so that a panel
 * outside the viewer and the toggles in its toolbar stay on the same values.
 */
export const SettingsReader = ({ pages }: SettingsReaderProps) => {
  const [readingDirection, setReadingDirection] =
    useState<ReadingDirection>("rtl");

  const [viewMode, setViewMode] = useState<ViewMode>("double");
  const [pageFitMode, setPageFitMode] = useState<PageFitMode>("height");

  return (
    <>
      <section
        aria-label="Comic reader"
        className="aspect-[4/5] min-h-96 w-full overflow-hidden rounded-xl md:aspect-[8/5]"
      >
        <ComicViewer.Root
          className="relative flex h-full min-h-0 w-full min-w-0 overflow-hidden rounded-xl bg-slate-950 text-slate-100 shadow-2xl shadow-slate-950/30"
          onPageFitModeChange={setPageFitMode}
          onReadingDirectionChange={setReadingDirection}
          onViewModeChange={setViewMode}
          pageFitMode={pageFitMode}
          pages={pages}
          readingDirection={readingDirection}
          viewMode={viewMode}
        >
          {/* The track is three viewports wide and turns pages by translating itself.
              The page set, the slot, and the page each align the half of the spread they
              hold through the `data-page-side` attribute the rail reports. */}
          <ComicViewer.Viewport className="group/viewport relative flex min-h-0 min-w-0 flex-1 touch-pan-y overflow-hidden data-[pannable]:cursor-grab data-[pannable]:touch-none data-[panning]:cursor-grabbing">
            <ComicViewer.ViewportTrack className="flex h-full w-[300%] shrink-0 basis-[300%] [transform:translateX(calc(-33.3333%_+_var(--pcv-drag-offset)))] data-[dragging]:transition-none data-[transition-state=active]:transition-transform data-[transition-state=active]:duration-[260ms] data-[transition-state=active]:ease-out data-[transition-state=active]:data-[slide-direction=left]:[transform:translateX(calc(-66.6667%_+_var(--pcv-drag-offset)))] data-[transition-state=active]:data-[slide-direction=right]:[transform:translateX(var(--pcv-drag-offset))]">
              {/* The pan and the zoom of a pinch gesture apply to the spread on screen. */}
              <ComicViewer.ViewportPageSet className="flex h-full min-w-0 shrink-0 basis-1/3 data-[page-side=left]:justify-start data-[page-side=right]:justify-end data-[rail-slot=current]:[transform:translate(var(--pcv-pan-x,0),var(--pcv-pan-y,0))_scale(var(--pcv-zoom-scale,1))]">
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
          <ComicViewer.Toolbar className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-2 bg-linear-to-t from-black/80 via-black/55 to-transparent px-3 pt-8 pb-3 transition duration-150 ease-out aria-hidden:translate-y-2 aria-hidden:opacity-0">
            <ComicViewer.ViewModeToggle className={settingToggleClassName} />
            <ComicViewer.ReadingDirectionToggle
              className={settingToggleClassName}
            />
            {/* Given no mode, the toggle cycles through the three. */}
            <ComicViewer.PageFitModeToggle className={settingToggleClassName} />
          </ComicViewer.Toolbar>
          <PageNavigation />
        </ComicViewer.Root>
      </section>
      <form aria-label="Reader settings" className="flex flex-wrap gap-3">
        <SettingOptions
          legend="Reading direction"
          name="reading-direction"
          onChange={setReadingDirection}
          options={readingDirectionOptions}
          value={readingDirection}
        />
        <SettingOptions
          legend="View mode"
          name="view-mode"
          onChange={setViewMode}
          options={viewModeOptions}
          value={viewMode}
        />
        <SettingOptions
          legend="Page fit"
          name="page-fit-mode"
          onChange={setPageFitMode}
          options={pageFitModeOptions}
          value={pageFitMode}
        />
      </form>
    </>
  );
};
