import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

import type { ViewportSize } from "./page-image-request";

const getDensity = (): number => window.devicePixelRatio || 1;

/**
 * Measures the viewport, or returns `null` until it has been measured. The
 * first measurement is taken before paint, so no page load starts from a
 * guess at the size.
 */
export const useViewportSize = (
  containerRef: RefObject<HTMLElement | null>
): ViewportSize | null => {
  const [size, setSize] = useState<ViewportSize | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (el === null) {
      return;
    }

    const update = (width: number, height: number): void => {
      const density = getDensity();
      setSize((current) =>
        current?.width === width &&
        current.height === height &&
        current.density === density
          ? current
          : { density, height, width }
      );
    };

    update(el.clientWidth, el.clientHeight);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        update(entry.contentRect.width, entry.contentRect.height);
      }
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [containerRef]);

  return size;
};
