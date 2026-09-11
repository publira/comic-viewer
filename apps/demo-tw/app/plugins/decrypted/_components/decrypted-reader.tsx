"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * The key the sample pages were encrypted with. A real application would fetch
 * a key of its own for the document the reader has opened rather than ship one
 * in the bundle.
 */
const encryptionKey = new Uint8Array([
  45, 128, 94, 16, 201, 73, 5, 164, 220, 39, 177, 8, 93, 251, 14, 66, 57, 186,
  109, 34, 240, 12, 154, 80, 28, 198, 71, 115, 9, 166, 42, 203,
]);

/** Every page carries the initialization vector it was encrypted with first. */
const initializationVectorLength = 12;

const decryptPage = async (encryptedBuffer: ArrayBuffer) => {
  const encryptedPage = new Uint8Array(encryptedBuffer);
  const initializationVector = encryptedPage.slice(
    0,
    initializationVectorLength
  );
  const key = await crypto.subtle.importKey(
    "raw",
    encryptionKey,
    "AES-GCM",
    false,
    ["decrypt"]
  );

  return crypto.subtle.decrypt(
    { iv: initializationVector, name: "AES-GCM" },
    key,
    encryptedPage.slice(initializationVectorLength)
  );
};

/**
 * Fetches the `.enc` page itself, because the response is ciphertext the
 * browser cannot decode as an image, and decrypts what came back before the
 * viewer decodes it.
 */
const encryptedJpegPlugin = ComicViewer.definePlugin({
  afterFetch: ({ buffer }) => decryptPage(buffer),
  customFetch: async ({ signal, url }) => {
    const response = await fetch(url, { signal });

    if (!response.ok) {
      throw new Error(`Failed to fetch encrypted page: ${response.status}`);
    }

    return response.arrayBuffer();
  },
  name: "encrypted-jpeg",
});

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

interface DecryptedReaderProps {
  pages: readonly ViewerPage[];
}

/**
 * A plugin changes how a page is fetched and transformed, never how it is
 * styled, so the tree below is the one the entry point is built from.
 */
export const DecryptedReader = ({ pages }: DecryptedReaderProps) => (
  <ComicViewer.Root
    className="relative flex h-full min-h-0 w-full min-w-0 overflow-hidden rounded-xl bg-slate-950 text-slate-100 shadow-2xl shadow-slate-950/30"
    pages={pages}
    plugins={[encryptedJpegPlugin]}
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
);
