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
        const { height, width } = entry.contentRect;
        update(width, height);
      }
    });

    observer.observe(el);

    // Moving to a display of another density leaves the CSS size as it was,
    // so the density is watched on its own, one resolution at a time.
    const densityQuery = {
      current: window.matchMedia?.(`(resolution: ${getDensity()}dppx)`),
    };

    const onDensityChange = (): void => {
      update();
      densityQuery.current?.removeEventListener?.("change", onDensityChange);
      densityQuery.current = window.matchMedia?.(
        `(resolution: ${getDensity()}dppx)`
      );
      densityQuery.current?.addEventListener?.("change", onDensityChange);
    };

    densityQuery.current?.addEventListener?.("change", onDensityChange);

    return () => {
      observer.disconnect();
      densityQuery.current?.removeEventListener?.("change", onDensityChange);
    };
  }, [containerRef]);

  return size;
};
