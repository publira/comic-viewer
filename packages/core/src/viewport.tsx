import { useRef } from "react";
import type { ReactNode } from "react";

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
  renderPage?: (page: TPage, index: number) => ReactNode;
  className?: string;
  doublePageThreshold?: number;
}

/** Composes the page rail, its page-turn state, and the viewport gestures. */
export const Viewport = <TPage extends ViewerPage>({
  children,
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
    railSpreadIndices,
    setDragOffset,
    slideDirection,
    transitionState,
  } = usePageTurn({
    currentIndex,
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
        pageTemplate={pageTemplate}
        pages={pages}
        railSpreadIndices={railSpreadIndices}
        readingDirection={readingDirection}
        renderPage={renderPage}
        slideDirection={slideDirection}
        transitionState={transitionState}
        viewMode={viewMode}
      />
    </div>
  );
};
