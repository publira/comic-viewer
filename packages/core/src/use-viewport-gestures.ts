import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DOMAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent,
  RefObject,
} from "react";

import { getSwipeTargetIndex } from "./use-viewport-layout";
import { useViewportZoom } from "./use-viewport-zoom";
import type { PageFitMode, ViewMode } from "./viewer-context";
import { getFirstTouch } from "./viewport-touch";
import type { TouchInput } from "./viewport-touch";

const EDGE_CLICK_RATIO = 0.3;
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

const isInteractiveTarget = (
  target: EventTarget | null,
  viewport: HTMLElement | null
): boolean => {
  if (!(target instanceof Element)) {
    return false;
  }

  const interactiveElement = target.closest(INTERACTIVE_ELEMENT_SELECTOR);
  return interactiveElement !== null && interactiveElement !== viewport;
};

interface UseViewportGesturesOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  currentIndex: number;
  displayedIndex: number;
  goToNext: () => void;
  goToPrev: () => void;
  isTransitioning: boolean;
  maxIndex: number;
  minIndex: number;
  pageFitMode: PageFitMode;
  readingDirection: "rtl" | "ltr";
  setDragOffset: (offset: number) => void;
  setPageFitMode: (mode: PageFitMode) => void;
  spreadStartIndex: number;
  toggleControls: () => void;
  usesPageRail: boolean;
  viewMode: ViewMode;
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
  goToNext,
  goToPrev,
  isTransitioning,
  maxIndex,
  minIndex,
  pageFitMode,
  readingDirection,
  setDragOffset,
  setPageFitMode,
  spreadStartIndex,
  toggleControls,
  usesPageRail,
  viewMode,
}: UseViewportGesturesOptions) => {
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
    const onKeyDown = (event: KeyboardEvent): void => {
      const direction = getHorizontalDirection(event.key);
      if (
        direction === undefined ||
        isInteractiveTarget(event.target, containerRef.current)
      ) {
        return;
      }

      event.preventDefault();
      goByHorizontalDirection(direction);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [containerRef, goByHorizontalDirection]);

  const beginTouch = useCallback(
    (touches: TouchInput, target: EventTarget | null): void => {
      // A control inside a page, such as a link on a slot page, keeps the
      // touch to itself instead of dragging the rail out from under it.
      if (
        isTransitioning ||
        isInteractiveTarget(target, containerRef.current)
      ) {
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

      touchStateRef.current = {
        active: true,
        currentX: touch.clientX,
        currentY: touch.clientY,
        startX: touch.clientX,
        startY: touch.clientY,
      };
      setIsDragging(usesPageRail);
    },
    [
      beginPan,
      beginPinch,
      containerRef,
      isPannable,
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
      if (usesPageRail) {
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
    [containerRef, movePan, movePinch, setDragOffset, usesPageRail]
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
        viewMode
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
      isTouchPanning,
      maxIndex,
      minIndex,
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
    if (isInteractiveTarget(event.target, event.currentTarget)) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const edgeWidth = rect.width * EDGE_CLICK_RATIO;

    // A pannable page reserves its whole surface for panning gestures, so its
    // edges toggle the controls instead of turning the page.
    if (
      isPannable ||
      (offsetX > edgeWidth && offsetX < rect.width - edgeWidth)
    ) {
      toggleControls();
      return;
    }

    goByHorizontalDirection(offsetX <= edgeWidth ? "left" : "right");
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (isInteractiveTarget(event.target, event.currentTarget)) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      toggleControls();
      return;
    }

    const direction = getHorizontalDirection(event.key);
    if (direction === undefined) {
      return;
    }

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
