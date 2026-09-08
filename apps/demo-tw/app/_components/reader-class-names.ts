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
  pageNavigation:
    "pointer-events-none absolute inset-0 z-10 transition duration-150 ease-out aria-hidden:translate-y-2 aria-hidden:opacity-0",
  pageProgress: "mx-auto min-w-0 shrink basis-3/5",
  pageProgressTrack:
    "block h-1 w-full appearance-none overflow-hidden rounded-full border-0 bg-black/65 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-slate-100 [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-slate-100",
  pageStatus: "mt-1.5 block text-center text-sm text-slate-100",
  previousPageButton:
    "pointer-events-auto absolute start-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/60 p-0 text-slate-100 shadow-lg outline-offset-2 outline-slate-100 transition hover:bg-black/80 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50",
  root: "relative flex h-full min-h-0 w-full min-w-0 overflow-hidden rounded-xl bg-slate-950 text-slate-100 shadow-2xl shadow-slate-950/30",
  toolbar:
    "absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 bg-linear-to-t from-black/80 via-black/55 to-transparent px-3 pt-8 pb-3 transition duration-150 ease-out aria-hidden:translate-y-2 aria-hidden:opacity-0",
  viewport:
    "group/viewport relative flex min-h-0 min-w-0 flex-1 touch-pan-y overflow-hidden data-[pannable]:cursor-grab data-[pannable]:touch-none data-[panning]:cursor-grabbing",
  viewportPage:
    "flex h-full w-full min-w-0 items-center justify-center data-[page-side=left]:justify-end data-[page-side=right]:justify-start",
  viewportPageSet:
    "flex h-full min-w-0 shrink-0 basis-1/3 data-[page-side=left]:justify-start data-[page-side=right]:justify-end data-[rail-slot=current]:[transform:translate(var(--pcv-pan-x,0)_var(--pcv-pan-y,0))_scale(var(--pcv-zoom-scale,1))]",
  viewportPageSlot:
    "flex min-w-0 flex-1 items-center justify-center data-[page-side=left]:justify-end data-[page-side=right]:justify-start data-[view-mode=double]:max-w-1/2 data-[view-mode=double]:basis-1/2",
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
