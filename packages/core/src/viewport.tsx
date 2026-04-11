import { Fragment, useRef } from "react";
import type { ReactNode } from "react";

import { useViewMode } from "./use-view-mode";
import { useViewerContext } from "./viewer-context";
import type { ViewerPage } from "./viewer-context";

export interface ViewportProps<TPage extends ViewerPage> {
  renderPage: (page: TPage, index: number) => ReactNode;
  className?: string;
  doublePageThreshold?: number;
}

export const Viewport = <TPage extends ViewerPage>({
  renderPage,
  className,
  doublePageThreshold,
}: ViewportProps<TPage>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { pages, currentIndex, readingDirection } = useViewerContext<TPage>();
  const viewMode = useViewMode(containerRef, doublePageThreshold);

  const visibleIndices: number[] = [currentIndex];
  if (viewMode === "double" && currentIndex + 1 < pages.length) {
    visibleIndices.push(currentIndex + 1);
  }

  // In RTL mode the next page visually appears on the left side
  const orderedIndices =
    readingDirection === "rtl" && visibleIndices.length === 2
      ? [visibleIndices[1], visibleIndices[0]]
      : visibleIndices;

  return (
    <div
      ref={containerRef}
      className={`pcv-viewport${className === undefined ? "" : ` ${className}`}`}
    >
      {orderedIndices.map((index) => (
        <Fragment key={index}>{renderPage(pages[index], index)}</Fragment>
      ))}
    </div>
  );
};
