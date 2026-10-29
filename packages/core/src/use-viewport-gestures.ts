import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DOMAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent,
  RefObject,
} from "react";

import type { SpreadPageList } from "./page-spread";
import { getSwipeTargetIndex } from "./use-viewport-layout";
import { useViewportZoom } from "./use-viewport-zoom";
import type { UseViewportZoomResult } from "./use-viewport-zoom";
import type { PageFitMode, ViewMode } from "./viewer-context";
import { getFirstTouch } from "./viewport-touch";
import type { TouchInput } from "./viewport-touch";

const DEFAULT_EDGE_CLICK_RATIO = 0.3;
const MAX_EDGE_CLICK_RATIO = 0.5;
const MIN_SWIPE_THRESHOLD_PX = 48;
const SWIPE_THRESHOLD_RATIO = 0.12;
const INTERACTIVE_ELEMENT_SELECTOR = [
  "a[href]",
  "audio[controls]",
  "button",
  '[contenteditable]:not([contenteditable="false"])',
  "input",
  "select",
  "summary",
  "textarea",
  "video[controls]",
  '[role="button"]',
  '[role="checkbox"]',
  '[role="combobox"]',
  '[role="link"]',
  '[role="listbox"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="radio"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="textbox"]',
].join(", ");

const getHorizontalDirection = (key: string): "left" | "right" | undefined => {
  if (key === "ArrowLeft") {
    return "left";
  }

  return key === "ArrowRight" ? "right" : undefined;
};

const isInteractiveTarget = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  target.closest(INTERACTIVE_ELEMENT_SELECTOR) !== null;

/**
 * Turns the gestures of a viewport on and off, one group per gesture, so that
 * a later setting joins its group instead of widening ViewportProps.
 */
export interface ViewportGestures {
  /** A double tap returns the page to fit-to-width. */
  doubleTap?: { enabled?: boolean };
  /**
   * A click near the left or right edge turns the page. `ratio` is the share of
   * the viewport width each edge takes, from 0 to 0.5, and defaults to 0.3.
   * Disabled, a click anywhere toggles the reader controls.
   */
  edgeClick?: { enabled?: boolean; ratio?: number };
  /**
   * ArrowLeft and ArrowRight turn the page while the viewport is focused, or
   * from anywhere on the page with `scope: "global"`. Enter and Space keep
   * toggling the reader controls either way.
   */
  keyboard?: { enabled?: boolean; scope?: "global" | "viewport" };
  /** A horizontal swipe drags the page rail and turns the page. */
  swipe?: { enabled?: boolean };
}

const getEdgeClickRatio = (ratio: number | undefined): number =>
  ratio === undefined || Number.isNaN(ratio)
    ? DEFAULT_EDGE_CLICK_RATIO
    : Math.max(0, Math.min(MAX_EDGE_CLICK_RATIO, ratio));

interface UseViewportGesturesOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  currentIndex: number;
  displayedIndex: number;
  gestures: ViewportGestures | undefined;
  goToNext: () => void;
  goToPrev: () => void;
  isTransitioning: boolean;
  maxIndex: number;
  minIndex: number;
  pageFitMode: PageFitMode;
  /** The page list the spread pages among the document are read from. */
  pages: SpreadPageList;
  readingDirection: "rtl" | "ltr";
  setDragOffset: (offset: number) => void;
  setPageFitMode: (mode: PageFitMode) => void;
  spreadStartIndex: number;
  toggleControls: () => void;
  usesPageRail: boolean;
  viewMode: ViewMode;
}

interface UseViewportGesturesResult extends Pick<
  UseViewportZoomResult,
  "activePan" | "activeZoom" | "isPannable" | "isPanning"
> {
  isDragging: boolean;
  viewportProps: DOMAttributes<HTMLDivElement>;
}

/**
 * Turns viewport input — keyboard, edge click, and swipe, plus the pan, pinch,
 * and double-tap gestures of useViewportZoom — into navigation, rail state,
 * and reader-control visibility, and returns the handlers that the viewport
 * element attaches.
 */
export const useViewportGestures = ({
  containerRef,
  currentIndex,
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
}: UseViewportGesturesOptions): UseViewportGesturesResult => {
  const isDoubleTapEnabled = gestures?.doubleTap?.enabled ?? true;
  const isEdgeClickEnabled = gestures?.edgeClick?.enabled ?? true;
  const edgeClickRatio = getEdgeClickRatio(gestures?.edgeClick?.ratio);
  const isKeyboardEnabled = gestures?.keyboard?.enabled ?? true;
  const isKeyboardGlobal = gestures?.keyboard?.scope === "global";
  const isSwipeEnabled = gestures?.swipe?.enabled ?? true;
  const touchStateRef = useRef<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    active: boolean;
  }>({
    active: false,
    currentX: 0,
    currentY: 0,
    startX: 0,
    startY: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const {
    activePan,
    activeZoom,
    beginPan,
    beginPinch,
    didPanRef,
    endPan,
    endPinch,
    isPannable,
    isPanning,
    isPinching,
    isTouchPanning,
    movePan,
    movePinch,
    registerTap,
  } = useViewportZoom({
    containerRef,
    currentIndex,
    isDoubleTapEnabled,
    pageFitMode,
    setPageFitMode,
  });

  const goByHorizontalDirection = useCallback(
    (direction: "left" | "right"): void => {
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
    },
    [goToNext, goToPrev, readingDirection]
  );

  useEffect(() => {
    if (!isKeyboardEnabled || !isKeyboardGlobal) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      const direction = getHorizontalDirection(event.key);
      if (direction === undefined || isInteractiveTarget(event.target)) {
        return;
      }

      event.preventDefault();
      goByHorizontalDirection(direction);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [goByHorizontalDirection, isKeyboardEnabled, isKeyboardGlobal]);

  const beginTouch = useCallback(
    (touches: TouchInput, target: EventTarget | null): void => {
      // A control inside a page, such as a link on a slot page, keeps the
      // touch to itself instead of dragging the rail out from under it.
      if (isTransitioning || isInteractiveTarget(target)) {
        return;
      }

      if (beginPinch(touches)) {
        touchStateRef.current.active = false;
        setIsDragging(false);
        return;
      }

      const touch = getFirstTouch(touches);
      if (touch === null) {
        return;
      }

      if (isPannable) {
        beginPan("touch", touch.clientX, touch.clientY);
        return;
      }

      // A disabled swipe is still tracked, so that a drag is never taken for a tap.
      touchStateRef.current = {
        active: true,
        currentX: touch.clientX,
        currentY: touch.clientY,
        startX: touch.clientX,
        startY: touch.clientY,
      };
      setIsDragging(isSwipeEnabled && usesPageRail);
    },
    [
      beginPan,
      beginPinch,
      isPannable,
      isSwipeEnabled,
      isTransitioning,
      usesPageRail,
    ]
  );

  const moveTouch = useCallback(
    (touches: TouchInput): void => {
      if (movePinch(touches)) {
        return;
      }
      const touch = getFirstTouch(touches);
      if (touch === null) {
        return;
      }

      if (movePan("touch", touch.clientX, touch.clientY)) {
        return;
      }
      if (!touchStateRef.current.active) {
        return;
      }

      touchStateRef.current.currentX = touch.clientX;
      touchStateRef.current.currentY = touch.clientY;
      if (isSwipeEnabled && usesPageRail) {
        const offset =
          touchStateRef.current.currentX - touchStateRef.current.startX;
        const containerWidth = containerRef.current?.clientWidth ?? 0;
        setDragOffset(
          containerWidth === 0
            ? offset
            : Math.max(-containerWidth, Math.min(containerWidth, offset))
        );
      }
    },
    [
      containerRef,
      isSwipeEnabled,
      movePan,
      movePinch,
      setDragOffset,
      usesPageRail,
    ]
  );

  const endTouch = useCallback(
    (changedTouches?: TouchInput): void => {
      if (isPinching()) {
        endPinch();
        return;
      }
      const changedTouch =
        changedTouches === undefined ? null : getFirstTouch(changedTouches);
      if (isTouchPanning()) {
        const wasPanned = didPanRef.current;
        endPan("touch");
        if (!wasPanned && changedTouch !== null) {
          registerTap(changedTouch.clientX, changedTouch.clientY);
        }
        return;
      }
      if (!touchStateRef.current.active) {
        if (!didPanRef.current && changedTouch !== null) {
          registerTap(changedTouch.clientX, changedTouch.clientY);
        }
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
      setIsDragging(false);

      if (Math.abs(deltaX) < threshold) {
        setDragOffset(0);
        registerTap(
          changedTouch?.clientX ?? touchStateRef.current.currentX,
          changedTouch?.clientY ?? touchStateRef.current.currentY
        );
        return;
      }
      // A swipe disabled mid-drag would otherwise leave the rail displaced.
      if (!isSwipeEnabled) {
        setDragOffset(0);
        return;
      }

      const direction = deltaX > 0 ? "left" : "right";
      // The target index is only a boundary probe: a swipe past the first or
      // last spread has to snap the rail back instead of leaving it dragged.
      // Navigation itself stays with the viewer context so that a swipe and an
      // arrow key move the reader through exactly the same code path.
      const targetIndex = getSwipeTargetIndex(
        direction,
        displayedIndex,
        minIndex,
        maxIndex,
        readingDirection,
        spreadStartIndex,
        viewMode,
        pages
      );

      if (targetIndex === undefined) {
        setDragOffset(0);
        return;
      }

      goByHorizontalDirection(direction);
    },
    [
      containerRef,
      didPanRef,
      displayedIndex,
      endPan,
      endPinch,
      goByHorizontalDirection,
      isPinching,
      isSwipeEnabled,
      isTouchPanning,
      maxIndex,
      minIndex,
      pages,
      readingDirection,
      registerTap,
      setDragOffset,
      spreadStartIndex,
      viewMode,
    ]
  );

  const cancelTouch = useCallback((): void => {
    if (isPinching()) {
      endPinch();
      return;
    }
    if (isTouchPanning()) {
      endPan("touch");
      return;
    }
    if (!touchStateRef.current.active) {
      return;
    }

    touchStateRef.current.active = false;
    setDragOffset(0);
    setIsDragging(false);
  }, [endPan, endPinch, isPinching, isTouchPanning, setDragOffset]);

  const handleViewportClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (didPanRef.current) {
      didPanRef.current = false;
      return;
    }

    // A link or a button inside a page, such as the ones a slot page holds,
    // takes the click instead of turning the page or revealing the controls.
    if (isInteractiveTarget(event.target)) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const edgeWidth = rect.width * edgeClickRatio;

    // A pannable page reserves its whole surface for panning gestures, so its
    // edges toggle the controls instead of turning the page.
    if (
      isPannable ||
      !isEdgeClickEnabled ||
      (offsetX > edgeWidth && offsetX < rect.width - edgeWidth)
    ) {
      toggleControls();
      return;
    }

    goByHorizontalDirection(offsetX <= edgeWidth ? "left" : "right");
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (isInteractiveTarget(event.target)) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      toggleControls();
      return;
    }

    const direction = getHorizontalDirection(event.key);
    if (!isKeyboardEnabled || direction === undefined) {
      return;
    }

    // Stopping the event keeps a global listener from turning the page twice.
    event.preventDefault();
    event.stopPropagation();
    goByHorizontalDirection(direction);
  };

  const viewportProps: DOMAttributes<HTMLDivElement> = {
    onClick: handleViewportClick,
    onKeyDown: handleKeyDown,
    onPointerCancel: (event) => {
      endPan(event.pointerId);
    },
    onPointerDown: (event) => {
      if (
        !isPannable ||
        !event.isPrimary ||
        (event.pointerType === "mouse" && event.button !== 0)
      ) {
        return;
      }

      beginPan(event.pointerId, event.clientX, event.clientY);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    },
    onPointerMove: (event) => {
      if (movePan(event.pointerId, event.clientX, event.clientY)) {
        event.preventDefault();
      }
    },
    onPointerUp: (event) => {
      endPan(event.pointerId);
    },
    onTouchCancel: (event) => {
      event.stopPropagation();
      cancelTouch();
      didPanRef.current = false;
    },
    onTouchEnd: (event) => {
      event.stopPropagation();
      endTouch(event.changedTouches);
      if (didPanRef.current && event.cancelable) {
        event.preventDefault();
      }
      didPanRef.current = false;
    },
    onTouchMove: (event) => {
      event.stopPropagation();
      moveTouch(event.touches);
      if (isPinching() && event.cancelable) {
        event.preventDefault();
      }
    },
    onTouchStart: (event) => {
      event.stopPropagation();
      beginTouch(event.touches, event.target);
    },
  };

  return {
    activePan,
    activeZoom,
    isDragging,
    isPannable,
    isPanning,
    viewportProps,
  };
};
