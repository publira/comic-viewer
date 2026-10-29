import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

import { useViewModeSwitch, useViewerContext } from "./viewer-context";
import type { ViewMode } from "./viewer-context";

const DEFAULT_DOUBLE_PAGE_THRESHOLD = 768;

export const useViewMode = (
  containerRef: RefObject<HTMLElement | null>,
  doublePageThreshold: number = DEFAULT_DOUBLE_PAGE_THRESHOLD
): ViewMode => {
  const { setDoublePageAvailable, viewMode } = useViewerContext();
  const switchViewMode = useViewModeSwitch();
  // The width picks the mode as it crosses the threshold rather than on every
  // observation, so a mode the reader chose with ViewModeToggle survives the
  // resizes that leave a spread just as possible as it already was.
  const isDoublePageAvailableRef = useRef<boolean | null>(null);

  // A laid-out width is read before paint, so the first spread is shown, and
  // its page images chosen, in the mode the viewport will keep.
  useLayoutEffect(() => {
    const el = containerRef.current;

    if (el === null || el === undefined) {
      return;
    }

    const applyWidth = (width: number): void => {
      const isAvailable = width >= doublePageThreshold;
      setDoublePageAvailable(isAvailable);

      if (isDoublePageAvailableRef.current === isAvailable) {
        return;
      }

      isDoublePageAvailableRef.current = isAvailable;
      switchViewMode(isAvailable ? "double" : "single");
    };

    // A viewport with no width yet is left to the observer to report.
    if (el.clientWidth > 0) {
      applyWidth(el.clientWidth);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        applyWidth(entry.contentRect.width);
      }
    });

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [
    containerRef,
    doublePageThreshold,
    setDoublePageAvailable,
    switchViewMode,
  ]);

  return viewMode;
};
