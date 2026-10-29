import { isSpreadPage } from "./page-spread";
import type { SpreadPageList } from "./page-spread";
import { selectSrcsetCandidate } from "./page-srcset";
import type { SrcsetRequirement } from "./page-srcset";
import type { PageFitMode, ViewerPage, ViewMode } from "./viewer-context";

/** The measured viewport, in CSS pixels, and the density it is shown at. */
export interface ViewportSize {
  density: number;
  height: number;
  width: number;
}

/** The URL a page is loaded from, and the size it was selected for. */
export interface PageImageRequest {
  requirement: SrcsetRequirement;
  url: string;
}

/**
 * Returns the CSS width a page is drawn at in the viewport, as the default
 * stylesheet lays it out. The pinch zoom scale is not part of it.
 */
const getRenderedPageWidth = (
  index: number,
  pages: SpreadPageList,
  size: ViewportSize,
  pageFitMode: PageFitMode,
  viewMode: ViewMode
): number => {
  const page = pages[index];

  // An actual-size page is drawn at its own resolution, however wide that is.
  if (pageFitMode === "actual") {
    return page?.width ?? Number.POSITIVE_INFINITY;
  }

  const slotWidth =
    viewMode === "double" && !isSpreadPage(index, pages)
      ? size.width / 2
      : size.width;

  if (
    pageFitMode === "width" ||
    page?.width === undefined ||
    page.height === undefined
  ) {
    return slotWidth;
  }

  return Math.min(slotWidth, (size.height * page.width) / page.height);
};

/** Returns the size the page at `index` is about to be drawn at. */
export const getPageRequirement = (
  index: number,
  pages: SpreadPageList,
  size: ViewportSize,
  pageFitMode: PageFitMode,
  viewMode: ViewMode
): SrcsetRequirement => ({
  density: size.density,
  width:
    getRenderedPageWidth(index, pages, size, pageFitMode, viewMode) *
    size.density,
});

/**
 * Selects what to load for a page drawn at `requirement`. A page that already
 * asked for more keeps asking for it, so a smaller slot never trades the image
 * it holds for a smaller one.
 */
export const getPageImageRequest = (
  page: ViewerPage,
  requirement: SrcsetRequirement,
  previous?: PageImageRequest
): PageImageRequest => {
  const merged =
    previous === undefined
      ? requirement
      : {
          density: Math.max(requirement.density, previous.requirement.density),
          width: Math.max(requirement.width, previous.requirement.width),
        };

  return {
    requirement: merged,
    url: selectSrcsetCandidate(page.srcset, merged) ?? page.src,
  };
};
