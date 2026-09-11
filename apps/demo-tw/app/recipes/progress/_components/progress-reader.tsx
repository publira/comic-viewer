"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";

/** Namespaced, so one origin can hold the progress of many documents. */
const getStorageKey = (documentId: string) =>
  `comic-viewer:reading-progress:${documentId}`;

/**
 * Reads the position stored for a document, or `null` when there is none.
 *
 * Storage holds whatever an earlier version of an application wrote, so a
 * value that is not a page index is dropped rather than handed to the viewer,
 * and a browser set to block site data throws on the very first access.
 */
const readStoredIndex = (documentId: string): number | null => {
  let storedIndex: string | null;

  try {
    storedIndex = window.localStorage.getItem(getStorageKey(documentId));
  } catch {
    return null;
  }

  // An empty entry would read as zero, which is a page rather than nothing.
  if (storedIndex === null || storedIndex.trim() === "") {
    return null;
  }

  const index = Number(storedIndex);

  return Number.isInteger(index) && index >= 0 ? index : null;
};

/**
 * The position of every document opened this session, and the store the hook
 * subscribes to. It is seeded from `localStorage` the first time a document is
 * asked for, and written through to it on every turn. Holding the session's
 * own copy is what lets a reader whose browser refuses storage — Safari in a
 * private window, or one set to block site data — keep turning pages: only the
 * position outliving the session is lost.
 */
const sessionProgress = new Map<string, number | null>();
const progressListeners = new Set<() => void>();

const subscribeToProgress = (onProgressChange: () => void) => {
  progressListeners.add(onProgressChange);

  return () => {
    progressListeners.delete(onProgressChange);
  };
};

/** Reads through to storage once per document, then answers from the map. */
const getProgress = (documentId: string): number | null => {
  const sessionIndex = sessionProgress.get(documentId);

  if (sessionIndex !== undefined) {
    return sessionIndex;
  }

  const storedIndex = readStoredIndex(documentId);
  sessionProgress.set(documentId, storedIndex);

  return storedIndex;
};

/** Records a position, or forgets it when given `null`. */
const setProgress = (documentId: string, index: number | null) => {
  sessionProgress.set(documentId, index);

  try {
    if (index === null) {
      window.localStorage.removeItem(getStorageKey(documentId));
    } else {
      window.localStorage.setItem(getStorageKey(documentId), String(index));
    }
  } catch {
    // The position still stands for this session; nothing else is recoverable.
  }

  for (const listener of progressListeners) {
    listener();
  }
};

/**
 * Rendering happens on the server too, where there is no storage to read. The
 * snapshot it renders from is its own value rather than `null`, so that a
 * position still on its way is never taken for a document that has none.
 */
const unrestored = Symbol("unrestored");

/** A stored index, `null` where a document has none, or the server's own. */
type ProgressSnapshot = number | null | typeof unrestored;

const getServerSnapshot = (): ProgressSnapshot => unrestored;

interface ReadingProgress {
  /** The zero-based index to hand the viewer as `currentIndex`. */
  currentIndex: number;
  /**
   * Whether the stored position has been read back yet. It is false on the
   * server and through hydration, where there is no storage to ask.
   */
  isRestored: boolean;
  /** Forgets the stored position and opens the document at its first page. */
  resetProgress: () => void;
  /** Records the page the reader turned to. Passed as `onIndexChange`. */
  saveIndex: (index: number) => void;
  /** The remembered zero-based index, or `null` while none is remembered. */
  storedIndex: number | null;
}

/**
 * Keeps the page a document was left on in `localStorage`, keyed by document.
 *
 * The viewer holds no opinion about persistence, because where a position
 * belongs — this browser, this session, or an account that follows a reader
 * between devices — is a decision only the application can make. Swapping the
 * storage calls in `getProgress` and `setProgress` for requests to a backend
 * is the whole difference between the two.
 */
export const useReadingProgress = (
  documentId: string,
  pageCount: number
): ReadingProgress => {
  // Storage is an external store, and reading it while rendering would make
  // the markup React hydrates differ from the markup the server sent. The
  // snapshot the server renders from is what tells a component that the
  // position has not been read back yet.
  const storedIndex = useSyncExternalStore<ProgressSnapshot>(
    subscribeToProgress,
    useCallback(() => getProgress(documentId), [documentId]),
    getServerSnapshot
  );

  const saveIndex = useCallback(
    (index: number) => {
      setProgress(documentId, index);
    },
    [documentId]
  );

  const resetProgress = useCallback(() => {
    setProgress(documentId, null);
  }, [documentId]);

  const restoredIndex = typeof storedIndex === "number" ? storedIndex : null;

  return {
    // A document can be shorter than it was when the position was stored, so
    // the index is held inside the document rather than trusted as it comes.
    currentIndex: Math.min(restoredIndex ?? 0, Math.max(0, pageCount - 1)),
    isRestored: storedIndex !== unrestored,
    resetProgress,
    saveIndex,
    storedIndex: restoredIndex,
  };
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

/** What the stored position is keyed by. A real one would be a slug or an ID. */
const documentId = "basic-sample";

interface ProgressReaderProps {
  pages: readonly ViewerPage[];
}

/**
 * Renders a reader that opens on the page it was last left on. The position is
 * held here and handed back to the viewer as `currentIndex`, with
 * `onIndexChange` writing every page the reader turns to.
 */
export const ProgressReader = ({ pages }: ProgressReaderProps) => {
  const { currentIndex, isRestored, resetProgress, saveIndex, storedIndex } =
    useReadingProgress(documentId, pages.length);

  return (
    <>
      <section
        aria-label="Comic reader"
        className="aspect-[4/5] min-h-96 w-full md:aspect-[8/5]"
      >
        {isRestored ? (
          <ComicViewer.Root
            className="relative flex h-full min-h-0 w-full min-w-0 overflow-hidden rounded-xl bg-slate-950 text-slate-100 shadow-2xl shadow-slate-950/30"
            pages={pages}
            currentIndex={currentIndex}
            onIndexChange={saveIndex}
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
        ) : (
          // The reader waits for the frame it takes to read storage, so that it
          // opens on the stored page instead of fetching the first one and
          // turning away from it.
          <p className="grid h-full w-full place-items-center rounded-xl bg-slate-950 text-sm text-slate-300">
            Restoring your place…
          </p>
        )}
      </section>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 basis-48 flex-col gap-1 rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <span className="text-xs text-slate-600 dark:text-slate-400">
            Saved position
          </span>
          <output
            aria-label="Saved position"
            className="text-lg font-semibold tabular-nums"
          >
            {storedIndex === null
              ? "Not saved yet"
              : `Page ${currentIndex + 1}`}
          </output>
        </div>
        {/* A controlled index is what lets this button return the reader to the
            first page as it clears the stored one. */}
        <button
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          disabled={storedIndex === null}
          onClick={resetProgress}
          type="button"
        >
          Start over
        </button>
      </div>
    </>
  );
};
