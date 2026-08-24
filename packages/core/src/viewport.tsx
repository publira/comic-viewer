import { useRef } from "react";
import type { ReactNode } from "react";

import type { PageLoadError } from "./page-load";
import { usePageTurn } from "./use-page-turn";
import { useViewMode } from "./use-view-mode";
import { useViewportGestures } from "./use-viewport-gestures";
import { useViewerContext } from "./viewer-context";
import type { ViewerPage } from "./viewer-context";
import type { ViewportChildren } from "./viewport-page";
import { ViewportRail } from "./viewport-rail";
import { getViewportLayoutTemplate } from "./viewport-template";

export interface ViewportProps<TPage extends ViewerPage> {
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
  className?: string;
  doublePageThreshold?: number;
}

/** Composes the page rail, its page-turn state, and the viewport gestures. */
export const Viewport = <TPage extends ViewerPage>({
  children,
  onPageLoadError,
  renderPage,
  className,
  doublePageThreshold,
}: ViewportProps<TPage>) => {
  const layoutTemplate = getViewportLayoutTemplate(children);
  const pageTemplate =
    layoutTemplate === undefined ? children : layoutTemplate.pageTemplate;
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    pages,
    plugins,
    currentIndex,
    pageFitMode,
    readingDirection,
    spreadStartIndex,
    goToNext,
    goToPrev,
    setPageFitMode,
    toggleControls,
  } = useViewerContext<TPage>();
  const viewMode = useViewMode(containerRef, doublePageThreshold);
  const usesManagedImageLoading =
    children !== undefined || renderPage === undefined;
  const usesPageRail =
    (children === undefined || layoutTemplate !== undefined) &&
    renderPage === undefined;
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
    currentIndex,
    onPageLoadError,
    pages,
    plugins,
    readingDirection,
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
    currentIndex,
    displayedIndex,
    goToNext,
    goToPrev,
    isTransitioning,
    pageCount: pages.length,
    pageFitMode,
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
      className={`pcv-viewport${className === undefined ? "" : ` ${className}`}`}
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
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- The viewer is a composite widget, not a button.
      role="button"
      tabIndex={0}
    >
      <ViewportRail
        activePan={activePan}
        activeZoom={activeZoom}
        dragOffset={dragOffset}
        getPageIndices={orderedIndicesFor}
        isDragging={isDragging}
        layoutTemplate={layoutTemplate}
        onTransitionEnd={onTransitionEnd}
        pageImages={pageImages}
        pageLoadStates={pageLoadStates}
        pageTemplate={pageTemplate}
        pages={pages}
        railSpreadIndices={railSpreadIndices}
        readingDirection={readingDirection}
        renderPage={renderPage}
        retryPage={retryPage}
        slideDirection={slideDirection}
        transitionState={transitionState}
        viewMode={viewMode}
      />
    </div>
  );
};
