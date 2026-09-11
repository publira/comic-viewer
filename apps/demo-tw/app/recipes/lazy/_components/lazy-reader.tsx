"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { PageResolveContext, ViewerPage } from "@publira/comic-viewer";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

/** How many pages one chapter of the sample document holds. */
const CHAPTER_LENGTH = 7;
/** How long the imaginary page-metadata endpoint takes to answer. */
const PAGE_RESOLVE_DELAY_MS = 1200;
/** How long the imaginary chapter index takes to answer. */
const CHAPTER_LOAD_DELAY_MS = 400;

/** Resolves after the delay, or rejects as soon as the request is aborted. */
const wait = (delayMs: number, signal?: AbortSignal): Promise<void> =>
  // eslint-disable-next-line promise/avoid-new -- A delay is only reachable through the timer callback API.
  new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, delayMs);

    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        reject(signal.reason);
      },
      { once: true }
    );
  });

export interface LazyChapters {
  /** How many chapters the whole document holds. */
  chapterCount: number;
  isLoadingChapter: boolean;
  /** How many chapters have been appended to the viewer so far. */
  loadedChapterCount: number;
  /** Appends the next chapter. Passed to the viewer as `onEndReached`. */
  loadNextChapter: () => void;
  /** The number of pages the viewer knows about, resolved or not. */
  pageCount: number;
  /** How many page-metadata requests have been answered. */
  requestCount: number;
  resolvePage: (
    index: number,
    context: PageResolveContext
  ) => Promise<ViewerPage | undefined>;
}

/**
 * Stands in for a paginated backend: it hands the viewer one chapter of page
 * count at a time, and answers for the metadata of a single page only once the
 * viewer asks for it.
 */
export const useLazyChapters = (pages: readonly ViewerPage[]): LazyChapters => {
  const [pageCount, setPageCount] = useState(() =>
    Math.min(CHAPTER_LENGTH, pages.length)
  );
  const [isLoadingChapter, setIsLoadingChapter] = useState(false);
  const [requestCount, setRequestCount] = useState(0);

  const resolvePage = useCallback(
    async (
      index: number,
      { signal }: PageResolveContext
    ): Promise<ViewerPage | undefined> => {
      await wait(PAGE_RESOLVE_DELAY_MS, signal);
      setRequestCount((count) => count + 1);

      // An endpoint that signs its URLs would sign this one here, which is why
      // the viewer asks again for a page the reader comes back to much later.
      return pages[index];
    },
    [pages]
  );

  const loadNextChapter = useCallback(() => {
    if (pageCount >= pages.length) {
      return;
    }

    setIsLoadingChapter(true);
    void (async () => {
      await wait(CHAPTER_LOAD_DELAY_MS);
      setPageCount((count) => Math.min(pages.length, count + CHAPTER_LENGTH));
      setIsLoadingChapter(false);
    })();
  }, [pageCount, pages.length]);

  return {
    chapterCount: Math.ceil(pages.length / CHAPTER_LENGTH),
    isLoadingChapter,
    loadNextChapter,
    loadedChapterCount: Math.ceil(pageCount / CHAPTER_LENGTH),
    pageCount,
    requestCount,
    resolvePage,
  };
};

const statClassName =
  "flex flex-1 basis-48 flex-col gap-1 rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900";

interface LazyStatProps {
  label: string;
  value: string;
}

const LazyStat = ({ label, value }: LazyStatProps) => (
  <div className={statClassName}>
    <span className="text-xs text-slate-600 dark:text-slate-400">{label}</span>
    <output aria-label={label} className="text-lg font-semibold tabular-nums">
      {value}
    </output>
  </div>
);

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

// Lazily resolved metadata is what this demo is about, so the page standing in
// for one still on its way is styled here like every other part of the reader.
const renderPendingPage = () => (
  <ComicViewer.ViewportPendingPage className="h-full w-full animate-pulse bg-slate-900" />
);

/** How many spreads beyond the viewport this demo loads ahead of the reader. */
const IMAGE_PRELOAD_SPREADS = 1;

interface LazyReaderProps {
  pages: readonly ViewerPage[];
}

/** Renders a reader whose page metadata arrives as the reader reaches it. */
export const LazyReader = ({ pages }: LazyReaderProps) => {
  const [decodedImageCount, setDecodedImageCount] = useState(0);
  // The hook reads each decoded page without returning one of its own, so the
  // viewer keeps drawing the image it decoded.
  const plugins = useMemo(
    () => [
      ComicViewer.definePlugin({
        afterDecode: () => {
          setDecodedImageCount((count) => count + 1);
        },
        name: "count-decoded-pages",
      }),
    ],
    []
  );
  const {
    chapterCount,
    isLoadingChapter,
    loadNextChapter,
    loadedChapterCount,
    pageCount,
    requestCount,
    resolvePage,
  } = useLazyChapters(pages);

  return (
    <>
      <section
        aria-label="Comic reader"
        className="aspect-[4/5] min-h-96 w-full md:aspect-[8/5]"
      >
        <ComicViewer.Root
          className="relative flex h-full min-h-0 w-full min-w-0 overflow-hidden rounded-xl bg-slate-950 text-slate-100 shadow-2xl shadow-slate-950/30"
          pageCount={pageCount}
          imagePreloadSpreads={IMAGE_PRELOAD_SPREADS}
          onEndReached={loadNextChapter}
          plugins={plugins}
          resolvePage={resolvePage}
        >
          {/* The track is three viewports wide and turns pages by translating itself.
              The page set, the slot, and the page each align the half of the spread they
              hold through the `data-page-side` attribute the rail reports. */}
          <ComicViewer.Viewport
            renderPendingPage={renderPendingPage}
            className="group/viewport relative flex min-h-0 min-w-0 flex-1 touch-pan-y overflow-hidden data-[pannable]:cursor-grab data-[pannable]:touch-none data-[panning]:cursor-grabbing"
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
      <div className="flex flex-wrap gap-3">
        <LazyStat
          label="Pages available"
          value={`${pageCount} of ${pages.length}`}
        />
        <LazyStat label="Metadata requests" value={String(requestCount)} />
        <LazyStat
          label="Page images decoded"
          value={String(decodedImageCount)}
        />
        <LazyStat
          label="Chapters loaded"
          value={
            isLoadingChapter
              ? "Loading…"
              : `${loadedChapterCount} of ${chapterCount}`
          }
        />
      </div>
    </>
  );
};
