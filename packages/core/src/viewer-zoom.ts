import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Context, Dispatch, RefObject, SetStateAction } from "react";

import type { PageFitMode } from "./viewer-context";

/**
 * The pan offset and zoom scale one spread carries. `key` names the spread
 * and the fit mode the gesture was made in, so a state left over from another
 * one falls back to the resting position instead of being applied to a spread
 * it was never meant for.
 */
export interface ViewportZoomState {
  key: string;
  panX: number;
  panY: number;
  scale: number;
}

/** A point on screen, in client coordinates. */
export interface ZoomFocalPoint {
  x: number;
  y: number;
}

export const MIN_ZOOM_SCALE = 0.5;
export const MAX_ZOOM_SCALE = 4;

/** The position every spread starts from, and the one `resetZoom` restores. */
export const RESTING_VIEWPORT_ZOOM: ViewportZoomState = {
  key: "",
  panX: 0,
  panY: 0,
  scale: 1,
};

/** Names the spread and fit mode a zoom state belongs to. */
export const getViewportZoomKey = (
  currentIndex: number,
  pageFitMode: PageFitMode
): string => `${currentIndex}:${pageFitMode}`;

export type ViewportZoomTo = (
  scale: number,
  focalPoint?: ZoomFocalPoint
) => void;

export interface ViewportZoomStore {
  setZoom: Dispatch<SetStateAction<ViewportZoomState>>;
  zoom: ViewportZoomState;
  /** Where the viewport registers how it zooms its current spread. */
  zoomToRef: RefObject<ViewportZoomTo | null>;
}

export const ViewportZoomContext: Context<ViewportZoomStore | null> =
  createContext<ViewportZoomStore | null>(null);

/**
 * Reads the zoom state the provider holds on behalf of the viewport. It stays
 * inside the library, because the viewport is the only thing that writes it:
 * a consumer goes through `zoomScale`, `setZoomScale`, and `resetZoom` on the
 * viewer context.
 */
export const useViewportZoomStore = (): ViewportZoomStore => {
  const store = useContext(ViewportZoomContext);

  if (store === null) {
    throw new Error(
      "The viewport zoom state must be read within a ViewerProvider"
    );
  }

  return store;
};

interface UseViewerZoomOptions {
  currentIndex: number;
  isScrubbing: boolean;
  pageFitMode: PageFitMode;
}

interface ViewerZoom {
  resetZoom: () => void;
  setZoomScale: (scale: number, focalPoint?: ZoomFocalPoint) => void;
  zoomScale: number;
  zoomStore: ViewportZoomStore;
}

/**
 * Holds the zoom state of the viewport on behalf of the viewer, so that the
 * context can carry the scale and offer the reset a consumer builds on.
 */
export const useViewerZoom = ({
  currentIndex,
  isScrubbing,
  pageFitMode,
}: UseViewerZoomOptions): ViewerZoom => {
  const [zoom, setZoom] = useState<ViewportZoomState>(RESTING_VIEWPORT_ZOOM);
  // Only the viewport can measure the bounds a pan offset is held within, so
  // it registers how a programmatic zoom is applied.
  const zoomToRef = useRef<ViewportZoomTo | null>(null);
  const zoomStore = useMemo(() => ({ setZoom, zoom, zoomToRef }), [zoom]);

  const resetZoom = useCallback(() => {
    setZoom(RESTING_VIEWPORT_ZOOM);
  }, []);

  // A zoom state left on another spread, or on the same spread under another
  // fit mode, no longer applies, so the scale reads as unzoomed again.
  const zoomScale =
    zoom.key === getViewportZoomKey(currentIndex, pageFitMode) && !isScrubbing
      ? zoom.scale
      : 1;

  // A step taken from the scale a scrub reports as 1 would land on the wrong
  // spread's scale, so a scrub ignores programmatic zoom.
  const setZoomScale = useCallback(
    (scale: number, focalPoint?: ZoomFocalPoint) => {
      if (isScrubbing || !Number.isFinite(scale)) {
        return;
      }

      zoomToRef.current?.(
        Math.min(MAX_ZOOM_SCALE, Math.max(MIN_ZOOM_SCALE, scale)),
        focalPoint
      );
    },
    [isScrubbing]
  );

  return { resetZoom, setZoomScale, zoomScale, zoomStore };
};
