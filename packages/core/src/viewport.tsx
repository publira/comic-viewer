import { Fragment, useEffect, useRef } from "react";
import type { MouseEvent, ReactNode, TouchEvent } from "react";

import { useViewMode } from "./use-view-mode";
import { useViewerContext } from "./viewer-context";
import type { ViewerPage } from "./viewer-context";

// デフォルトのページ描画: 画像src/titleがあればimg表示、それ以外はid表示
const defaultRenderPage = (page: ViewerPage, index: number) => (
  <div key={page.id ?? index} className="pcv-page">
    <img src={page.src} alt={page.title ?? page.id} />
  </div>
);

export interface ViewportProps<TPage extends ViewerPage> {
  renderPage?: (page: TPage, index: number) => ReactNode;
  className?: string;
  doublePageThreshold?: number;
}

const EDGE_CLICK_RATIO = 0.3;
const MIN_SWIPE_THRESHOLD_PX = 48;
const SWIPE_THRESHOLD_RATIO = 0.12;

export const Viewport = <TPage extends ViewerPage>({
  renderPage,
  className,
  doublePageThreshold,
}: ViewportProps<TPage>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStateRef = useRef<{
    startX: number;
    currentX: number;
    active: boolean;
  }>({
    active: false,
    currentX: 0,
    startX: 0,
  });
  const { pages, currentIndex, readingDirection, goToNext, goToPrev } =
    useViewerContext<TPage>();
  const viewMode = useViewMode(containerRef, doublePageThreshold);

  const goByHorizontalDirection = (direction: "left" | "right"): void => {
    if (direction === "left") {
      if (readingDirection === "rtl") {
        goToNext();
      } else {
        goToPrev();
      }
      return;
    }

    if (readingDirection === "rtl") {
      goToPrev();
    } else {
      goToNext();
    }
  };

  const goBySwipeDirection = (swipeDirection: "left" | "right"): void => {
    if (swipeDirection === "left") {
      goToNext();
      return;
    }

    goToPrev();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "ArrowLeft") {
        goByHorizontalDirection("left");
      } else if (event.key === "ArrowRight") {
        goByHorizontalDirection("right");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [readingDirection, goToNext, goToPrev]);

  const handleEdgeClick = (event: MouseEvent<HTMLDivElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const edgeWidth = rect.width * EDGE_CLICK_RATIO;

    if (offsetX <= edgeWidth) {
      goByHorizontalDirection("left");
      return;
    }

    if (offsetX >= rect.width - edgeWidth) {
      goByHorizontalDirection("right");
    }
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>): void => {
    const [touch] = Object.values(event.touches);
    if (touch === undefined) {
      return;
    }

    touchStateRef.current = {
      active: true,
      currentX: touch.clientX,
      startX: touch.clientX,
    };
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>): void => {
    if (!touchStateRef.current.active) {
      return;
    }

    const [touch] = Object.values(event.touches);
    if (touch === undefined) {
      return;
    }

    touchStateRef.current.currentX = touch.clientX;
  };

  const handleTouchEnd = (): void => {
    if (!touchStateRef.current.active) {
      return;
    }

    const containerWidth = containerRef.current?.clientWidth ?? 0;
    const threshold = Math.max(
      MIN_SWIPE_THRESHOLD_PX,
      containerWidth * SWIPE_THRESHOLD_RATIO
    );
    const deltaX =
      touchStateRef.current.currentX - touchStateRef.current.startX;

    touchStateRef.current.active = false;

    if (Math.abs(deltaX) < threshold) {
      return;
    }

    goBySwipeDirection(deltaX > 0 ? "right" : "left");
  };

  const visibleIndices: number[] = [currentIndex];
  if (viewMode === "double" && currentIndex + 1 < pages.length) {
    visibleIndices.push(currentIndex + 1);
  }

  // In RTL mode the next page visually appears on the left side
  const orderedIndices =
    readingDirection === "rtl" && visibleIndices.length === 2
      ? [visibleIndices[1], visibleIndices[0]]
      : visibleIndices;

  const pageRenderer = renderPage ?? defaultRenderPage;
  return (
    <div
      ref={containerRef}
      className={`pcv-viewport${className === undefined ? "" : ` ${className}`}`}
      data-reading-direction={readingDirection}
      data-view-mode={viewMode}
      data-page-count={orderedIndices.length}
      onClick={handleEdgeClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {orderedIndices.map((index) => (
        <Fragment key={index}>{pageRenderer(pages[index], index)}</Fragment>
      ))}
    </div>
  );
};
