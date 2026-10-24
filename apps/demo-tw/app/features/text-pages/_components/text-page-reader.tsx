"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { PageMetadata } from "@publira/comic-viewer";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** A page set in type rather than drawn, so it has no image to load. */
interface TextPage extends PageMetadata {
  heading: string;
  paragraphs: readonly string[];
}

const textPages: readonly TextPage[] = [
  {
    heading: "Afterword",
    height: 1000,
    id: "afterword-1",
    paragraphs: [
      "This volume began as a single page drawn on the back of a train timetable, and it kept growing until the timetable ran out of back.",
      "Thank you for following the crew this far. The next arc moves the story out of the harbour, and it is the one I have wanted to draw since the first chapter.",
    ],
    title: "Afterword, page 1",
    width: 800,
  },
  {
    heading: "Afterword, continued",
    height: 1000,
    id: "afterword-2",
    paragraphs: [
      "Every chapter was lettered twice: once in pencil while the pages were still rough, and once more when the art had settled.",
      "The second pass is the one you read, and the first one is what kept the jokes landing in the right panel.",
    ],
    title: "Afterword, page 2",
    width: 800,
  },
  {
    heading: "Character notes",
    height: 1000,
    id: "character-notes",
    paragraphs: [
      "Mira was meant to leave after the third chapter. Readers wrote in asking where she had gone before she had even left.",
      "The harbour master has no name yet. Suggestions are welcome, and the strangest one wins.",
    ],
    title: "Character notes",
    width: 800,
  },
  {
    heading: "Credits",
    height: 1000,
    id: "credits",
    paragraphs: [
      "Story and art by the Publira sample studio.",
      "Set in the browser by the comic viewer, without a single image on these four pages.",
    ],
    title: "Credits",
    width: 800,
  },
];

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

/**
 * A reader whose pages are drawn from text by the application. Given
 * renderPage alone, the viewport loads no images, so the pages need no src.
 * Such a viewport takes no layout template, so its track and page sets are
 * styled through their public `pcv-*` classes; nothing animates a page turn
 * there, so no transition is needed.
 */
export const TextPageReader = () => (
  <ComicViewer.Root
    className="relative flex h-full min-h-0 w-full min-w-0 overflow-hidden rounded-xl bg-slate-950 text-slate-100 shadow-2xl shadow-slate-950/30"
    initialReadingDirection="ltr"
    pages={textPages}
  >
    <ComicViewer.Viewport
      className="group/viewport relative flex min-h-0 min-w-0 flex-1 overflow-hidden [&_.pcv-viewport-page-set]:flex [&_.pcv-viewport-page-set]:h-full [&_.pcv-viewport-page-set]:min-w-0 [&_.pcv-viewport-page-set]:shrink-0 [&_.pcv-viewport-page-set]:basis-1/3 [&_.pcv-viewport-page-set[data-page-side=left]]:justify-start [&_.pcv-viewport-page-set[data-page-side=right]]:justify-end [&_.pcv-viewport-track]:flex [&_.pcv-viewport-track]:h-full [&_.pcv-viewport-track]:w-[300%] [&_.pcv-viewport-track]:shrink-0 [&_.pcv-viewport-track]:-translate-x-1/3"
      renderPage={(page: TextPage) => (
        // ViewportPage reports the half of the spread the page takes, so each
        // page meets its facing page at the gutter.
        <ComicViewer.ViewportPage className="flex h-full min-w-0 flex-1 items-center justify-center group-data-[view-mode=double]/viewport:max-w-1/2 group-data-[view-mode=double]/viewport:basis-1/2 data-[page-side=left]:justify-end data-[page-side=right]:justify-start">
          <article
            aria-label={page.title}
            className="flex aspect-[4/5] h-full max-w-full flex-col gap-3 overflow-auto bg-[#f4efe4] px-[9%] py-[8%] font-serif text-[clamp(0.75rem,1.6vw,1rem)] leading-relaxed text-stone-800 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)] max-md:text-[clamp(0.75rem,3.6vw,1rem)]"
          >
            <h3 className="text-[1.4em] font-semibold">{page.heading}</h3>
            {page.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </article>
        </ComicViewer.ViewportPage>
      )}
    />
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
