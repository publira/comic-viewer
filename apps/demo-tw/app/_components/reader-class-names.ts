/**
 * The Tailwind utilities the reader is built from.
 *
 * The reader component and the source code panels that document it both read
 * their classes from here, so a snippet on a demo page cannot fall out of step
 * with the component the same page is showing.
 */
export const readerClassNames = {
  navigationIcon:
    "size-6 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]",
  nextPageButton:
    "pointer-events-auto absolute end-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/60 p-0 text-slate-100 shadow-lg outline-offset-2 outline-slate-100 transition hover:bg-black/80 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50",
  pageCanvas:
    "h-full max-w-full bg-slate-900 object-contain transition-[filter] duration-150 group-data-[page-fit-mode=actual]/viewport:h-auto group-data-[page-fit-mode=actual]/viewport:w-auto group-data-[page-fit-mode=actual]/viewport:max-w-none group-data-[page-fit-mode=width]/viewport:h-auto group-data-[page-fit-mode=width]/viewport:w-full group-data-[page-fit-mode=width]/viewport:max-w-none data-[placeholder]:brightness-75 data-[placeholder]:saturate-75",
  pageFitModeGroup: "flex shrink-0 items-center gap-1",
  pageNavigation:
    "pointer-events-none absolute inset-0 z-10 transition duration-150 ease-out aria-hidden:translate-y-2 aria-hidden:opacity-0",
  pageProgress: "mx-auto min-w-0 shrink basis-3/5",
  // The slider reports the share of the document its thumb rests at as
  // `--pcv-page-progress-fill`, which paints the part of the track behind it.
  // The fill runs the way the reader turns pages, as the slider itself does
  // inside a toolbar that carries the reading direction.
  pageProgressSlider:
    "block h-3.5 w-full cursor-pointer appearance-none bg-transparent p-0 outline-offset-4 outline-slate-100 [--pcv-page-progress-fill-direction:to_right] focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50 rtl:[--pcv-page-progress-fill-direction:to_left] [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-slate-100 [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-black/65 [&::-moz-range-track]:[background-image:linear-gradient(var(--pcv-page-progress-fill-direction),var(--color-slate-100)_var(--pcv-page-progress-fill),transparent_var(--pcv-page-progress-fill))] [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-black/65 [&::-webkit-slider-runnable-track]:[background-image:linear-gradient(var(--pcv-page-progress-fill-direction),var(--color-slate-100)_var(--pcv-page-progress-fill),transparent_var(--pcv-page-progress-fill))] [&::-webkit-slider-thumb]:-mt-[0.3125rem] [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-slate-100",
  pageStatus: "mt-1.5 block text-center text-sm text-slate-100",
  previousPageButton:
    "pointer-events-auto absolute start-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/60 p-0 text-slate-100 shadow-lg outline-offset-2 outline-slate-100 transition hover:bg-black/80 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50",
  root: "relative flex h-full min-h-0 w-full min-w-0 overflow-hidden rounded-xl bg-slate-950 text-slate-100 shadow-2xl shadow-slate-950/30",
  /**
   * The reader-setting toggles carry no look of their own, so the demo dresses
   * them as the pill the navigation buttons wear and lets `aria-pressed` mark
   * the mode the reader is on.
   */
  settingToggle:
    "shrink-0 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-slate-100 outline-offset-2 outline-slate-100 transition hover:bg-black/80 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:bg-slate-100/25",
  toolbar:
    "absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 bg-linear-to-t from-black/80 via-black/55 to-transparent px-3 pt-8 pb-3 transition duration-150 ease-out aria-hidden:translate-y-2 aria-hidden:opacity-0",
  viewport:
    "group/viewport relative flex min-h-0 min-w-0 flex-1 touch-pan-y overflow-hidden data-[pannable]:cursor-grab data-[pannable]:touch-none data-[panning]:cursor-grabbing",
  viewportPage:
    "flex h-full w-full min-w-0 items-center justify-center data-[page-side=left]:justify-end data-[page-side=right]:justify-start",
  viewportPageSet:
    "flex h-full min-w-0 shrink-0 basis-1/3 data-[page-side=left]:justify-start data-[page-side=right]:justify-end data-[rail-slot=current]:[transform:translate(var(--pcv-pan-x,0)_var(--pcv-pan-y,0))_scale(var(--pcv-zoom-scale,1))]",
  // A page that is a whole spread on its own keeps both halves of the set, so
  // the double-page basis it would otherwise take is given back to it.
  viewportPageSlot:
    "flex min-w-0 flex-1 items-center justify-center data-[page-side=left]:justify-end data-[page-side=right]:justify-start data-[view-mode=double]:max-w-1/2 data-[view-mode=double]:basis-1/2 data-[view-mode=double]:data-[page-layout=spread]:max-w-full data-[view-mode=double]:data-[page-layout=spread]:basis-full",
  viewportPendingPage: "h-full w-full animate-pulse bg-slate-900",
  viewportTrack:
    "flex h-full w-[300%] shrink-0 basis-[300%] [transform:translateX(calc(-33.3333%_+_var(--pcv-drag-offset)))] data-[dragging]:transition-none data-[transition-state=active]:transition-transform data-[transition-state=active]:duration-[260ms] data-[transition-state=active]:ease-out data-[transition-state=active]:data-[slide-direction=left]:[transform:translateX(calc(-66.6667%_+_var(--pcv-drag-offset)))] data-[transition-state=active]:data-[slide-direction=right]:[transform:translateX(var(--pcv-drag-offset))]",
} as const;

/**
 * The `data-page-side` variants of a reader class, for a demo page that
 * documents the spread alignment on its own rather than repeating the class.
 */
export const pageSideUtilities = (className: string): string =>
  className
    .split(" ")
    .filter((utility) => utility.startsWith("data-[page-side"))
    .join(" ");

/**
 * The variants of a reader class that size a page covering a whole spread,
 * for the demo page that documents them.
 */
export const pageLayoutUtilities = (className: string): string =>
  className
    .split(" ")
    .filter((utility) => utility.includes("data-[page-layout"))
    .join(" ");
