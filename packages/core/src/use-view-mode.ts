import { useEffect } from "react";
import type { RefObject } from "react";

import { useViewerContext } from "./viewer-context";
import type { ViewMode } from "./viewer-context";

const DEFAULT_DOUBLE_PAGE_THRESHOLD = 768;

export const useViewMode = (
  containerRef: RefObject<HTMLElement | null>,
  doublePageThreshold: number = DEFAULT_DOUBLE_PAGE_THRESHOLD
): ViewMode => {
  const { viewMode, setViewMode } = useViewerContext();

  useEffect(() => {
    const el = containerRef.current;
    if (el === null || el === undefined) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewMode(
          entry.contentRect.width >= doublePageThreshold ? "double" : "single"
        );
      }
    });

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [containerRef, doublePageThreshold, setViewMode]);

  return viewMode;
};
