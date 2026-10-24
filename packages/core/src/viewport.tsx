import { useMemo, useRef } from "react";
import type { ReactElement, ReactNode } from "react";

import { composeClassName } from "./class-names";
import type { PageLoadError } from "./page-load";
import { usePageTurn } from "./use-page-turn";
import { useViewMode } from "./use-view-mode";
import { useViewportGestures } from "./use-viewport-gestures";
import type { ViewportGestures } from "./use-viewport-gestures";
import { getScrubSpread, useViewerContext } from "./viewer-context";
import type { PageMetadata, ViewerPage } from "./viewer-context";
import type { ViewportChildren } from "./viewport-page";
import { ViewportRail } from "./viewport-rail";
import { getViewportLayoutTemplate } from "./viewport-template";
import type { ViewportTrackProps } from "./viewport-template";

interface ViewportBaseProps {
  /**
   * The accessible name of the reading surface, which assistive technology
   * announces as a region. Defaults to "Comic pages".
   */
  "aria-label"?: string;
  /**
   * Turns the edge click, the swipe, the double tap, and the arrow keys on and
   * off. Every gesture is enabled by default, and the arrow keys answer only
   * while the viewport is focused.
   */
  gestures?: ViewportGestures;
  /**
   * Renders the placeholder for a page inside the viewport whose metadata is
   * still being resolved by `resolvePage`. Defaults to ViewportPendingPage.
   */
  renderPendingPage?: (index: number) => ReactNode;
  className?: string;
  doublePageThreshold?: number;
}

/** The props of a Viewport that loads and draws the image of each page. */
export interface ViewportProps<
  TPage extends ViewerPage,
> extends ViewportBaseProps {
  /**
   * A page template rendered for each visible page. Use ViewportPage and
   * PageCanvas to style the public page elements without private selectors.
   */
  children?: ViewportChildren<TPage>;
  /**
   * Called whenever a page fails to fetch, transform, or decode. The failure
   * carries the page, its index, the stage that failed, and the original error.
   * Pages rendered through `renderPage` never report here because the viewer
   * loads nothing for them.
   */
  onPageLoadError?: (error: PageLoadError<TPage>) => void;
  renderPage?: (page: TPage, index: number) => ReactNode;
}

/**
 * The props of a Viewport that draws every page itself. It loads no images, so
 * its pages need no `src`.
 */
export interface CustomPageViewportProps<
  TPage extends PageMetadata,
> extends ViewportBaseProps {
  /**
   * An optional layout template whose ViewportPageSlot holds no page template,
   * since `renderPage` draws the page inside each slot.
   */
  children?: ReactElement<ViewportTrackProps>;
  renderPage: (page: TPage, index: number) => ReactNode;
}

/** Viewport takes pages without `src` only in the forms that load nothing. */
interface ViewportComponent {
  <TPage extends PageMetadata = ViewerPage>(
    props: CustomPageViewportProps<TPage>
  ): ReactNode;
  <TPage extends ViewerPage = ViewerPage>(
    props: ViewportProps<TPage>
  ): ReactNode;
}

/**
 * Composes the page rail, its page-turn state, and the viewport gestures.
 * Given `renderPage`, alone or with a layout template, it draws each page itself
 * and accepts pages without `src`; otherwise it loads the image of each page.
 */
export const Viewport = (<TPage extends ViewerPage>({
  "aria-label": ariaLabel = "Comic pages",
  children,
  gestures,
  onPageLoadError,
  renderPage,
  renderPendingPage,
  className,
  doublePageThreshold,
}: ViewportProps<TPage>) => {
  const layoutTemplate = getViewportLayoutTemplate(children);
  const pageTemplate =
    layoutTemplate === undefined ? children : layoutTemplate.pageTemplate;
  if (renderPage !== undefined && pageTemplate !== undefined) {
    throw new Error(
      "Viewport takes either renderPage or a page template, not both."
    );
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const {
    endPages,
    imagePreloadSpreads,
    maxIndex,
    minIndex,
    pageCount,
    pages,
    plugins,
    currentIndex,
    pageFitMode,
    readingDirection,
    scrubPosition,
    spreadStartIndex,
    startPages,
    goToNext,
    goToPrev,
    setPageFitMode,
    toggleControls,
  } = useViewerContext<TPage>();
  const viewMode = useViewMode(containerRef, doublePageThreshold);
  const usesManagedImageLoading = renderPage === undefined;
  const usesPageRail = children === undefined || layoutTemplate !== undefined;
  const scrubSpread = useMemo(
    () =>
      scrubPosition === null
        ? null
        : getScrubSpread(
            scrubPosition,
            minIndex,
            maxIndex,
            spreadStartIndex,
            viewMode,
            pages
          ),
    [maxIndex, minIndex, pages, scrubPosition, spreadStartIndex, viewMode]
  );
  const {
    displayedIndex,
    dragOffset,
    isTransitioning,
    onTransitionEnd,
    orderedIndices,
    orderedIndicesFor,
    pageImages,
    pageLoadStates,
    railSpreadIndices,
    retryPage,
    setDragOffset,
    slideDirection,
    transitionState,
  } = usePageTurn({
    containerRef,
    currentIndex,
    imagePreloadSpreads,
    maxIndex,
    minIndex,
    onPageLoadError,
    pageCount,
    pageFitMode,
    pages,
    plugins,
    readingDirection,
    scrubSpread,
    spreadStartIndex,
    usesManagedImageLoading,
    usesPageRail,
    viewMode,
  });
  const {
    activePan,
    activeZoom,
    isDragging,
    isPannable,
    isPanning,
    viewportProps,
  } = useViewportGestures({
    containerRef,
    currentIndex: scrubSpread?.nearestIndex ?? currentIndex,
    displayedIndex,
    gestures,
    goToNext,
    goToPrev,
    isTransitioning,
    maxIndex,
    minIndex,
    pageFitMode,
    pages,
    readingDirection,
    setDragOffset,
    setPageFitMode,
    spreadStartIndex,
    toggleControls,
    usesPageRail,
    viewMode,
  });

  return (
    <div
      ref={containerRef}
      className={composeClassName("pcv-viewport", className)}
      data-reading-direction={readingDirection}
      data-slide-direction={slideDirection}
      data-transition-state={transitionState}
      data-view-mode={viewMode}
      data-page-count={orderedIndices.length}
      data-dragging={isDragging || undefined}
      data-pannable={isPannable || undefined}
      data-panning={isPanning || undefined}
      data-page-fit-mode={pageFitMode}
      {...viewportProps}
      aria-label={ariaLabel}
      // The surface holds pages that may carry links and buttons of their own,
      // which a widget role such as button would flatten away.
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- A `section` would change the element consumers style.
      role="region"
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The keyboard turns pages and reveals the controls from here.
      tabIndex={0}
    >
      <ViewportRail
        activePan={activePan}
        activeZoom={activeZoom}
        dragOffset={dragOffset}
        endPages={endPages}
        getPageIndices={orderedIndicesFor}
        isDragging={isDragging}
        layoutTemplate={layoutTemplate}
        onTransitionEnd={onTransitionEnd}
        pageCount={pageCount}
        pageImages={pageImages}
        pageLoadStates={pageLoadStates}
        pageTemplate={pageTemplate}
        pages={pages}
        railSpreadIndices={railSpreadIndices}
        readingDirection={readingDirection}
        renderPage={renderPage}
        renderPendingPage={renderPendingPage}
        retryPage={retryPage}
        slideDirection={slideDirection}
        spreadStartIndex={spreadStartIndex}
        startPages={startPages}
        transitionState={transitionState}
        viewMode={viewMode}
      />
    </div>
  );
}) as ViewportComponent;
