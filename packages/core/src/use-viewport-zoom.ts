import { useCallback, useRef, useState } from "react";
import type { RefObject } from "react";

import {
  RESTING_VIEWPORT_ZOOM,
  getViewportZoomKey,
  useViewportZoomStore,
} from "./viewer-context";
import type { PageFitMode } from "./viewer-context";
import {
  getTouchCenter,
  getTouchDistance,
  getTouchPair,
} from "./viewport-touch";
import type { TouchInput } from "./viewport-touch";

const MAX_ZOOM_SCALE = 4;
const MIN_ZOOM_SCALE = 0.5;
const DOUBLE_TAP_DELAY_MS = 300;
const DOUBLE_TAP_DISTANCE_PX = 24;

interface UseViewportZoomOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  currentIndex: number;
  pageFitMode: PageFitMode;
  setPageFitMode: (mode: PageFitMode) => void;
}

/**
 * Drives the pan offset and zoom scale of the current spread through the
 * pointer, pinch, and double-tap gestures that change them. The two values
 * are held by the viewer provider, which exposes the scale to consumers, and
 * are scoped to a pan key so that turning the page or changing the fit mode
 * restores the resting position.
 */
export const useViewportZoom = ({
  containerRef,
  currentIndex,
  pageFitMode,
  setPageFitMode,
}: UseViewportZoomOptions) => {
  const panStateRef = useRef<{
    pointerId: number | "touch" | null;
    startPanX: number;
    startPanY: number;
    startX: number;
    startY: number;
  }>({
    pointerId: null,
    startPanX: 0,
    startPanY: 0,
    startX: 0,
    startY: 0,
  });
  const didPanRef = useRef(false);
  const pinchStateRef = useRef<{
    startCenterX: number;
    startCenterY: number;
    startDistance: number;
    startPanX: number;
    startPanY: number;
    startScale: number;
  } | null>(null);
  const lastTapRef = useRef<{
    key: string;
    time: number;
    x: number;
    y: number;
  } | null>(null);
  const [panningKey, setPanningKey] = useState<string | null>(null);
  const { setZoom, zoom } = useViewportZoomStore();
  const panKey = getViewportZoomKey(currentIndex, pageFitMode);
  const isCurrentZoom = zoom.key === panKey;
  const activePan = isCurrentZoom
    ? { x: zoom.panX, y: zoom.panY }
    : { x: 0, y: 0 };
  const activeZoom = { scale: isCurrentZoom ? zoom.scale : 1 };
  // Actual-size can exceed the viewport. A pinch may also zoom any fit mode
  // beyond its initial size. Fit-to-width remains swipeable after a double tap.
  const isPannable = pageFitMode === "actual" || activeZoom.scale > 1;

  const getPanLimits = useCallback(
    (scale: number) => {
      const viewport = containerRef.current;
      const currentPageSet = viewport?.querySelector<HTMLDivElement>(
        '.pcv-viewport-page-set[data-rail-slot="current"]'
      );
      if (viewport === null || viewport === undefined) {
        return { x: 0, y: 0 };
      }
      if (currentPageSet === null || currentPageSet === undefined) {
        return { x: 0, y: 0 };
      }

      return {
        x: Math.max(
          0,
          (currentPageSet.scrollWidth * scale - viewport.clientWidth) / 2
        ),
        y: Math.max(
          0,
          (currentPageSet.scrollHeight * scale - viewport.clientHeight) / 2
        ),
      };
    },
    [containerRef]
  );

  // The pan offset and the scale are written together, because the limits the
  // offset is held within are the ones the scale it is applied with gives it.
  const updateZoom = useCallback(
    (x: number, y: number, scale: number): void => {
      const limits = getPanLimits(scale);
      setZoom({
        key: panKey,
        panX: Math.max(-limits.x, Math.min(limits.x, x)),
        panY: Math.max(-limits.y, Math.min(limits.y, y)),
        scale,
      });
    },
    [getPanLimits, panKey, setZoom]
  );

  const beginPan = useCallback(
    (pointerId: number | "touch", clientX: number, clientY: number): void => {
      if (!isPannable || panStateRef.current.pointerId !== null) {
        return;
      }

      didPanRef.current = false;
      panStateRef.current = {
        pointerId,
        startPanX: activePan.x,
        startPanY: activePan.y,
        startX: clientX,
        startY: clientY,
      };
      setPanningKey(panKey);
    },
    [activePan.x, activePan.y, isPannable, panKey]
  );

  const movePan = useCallback(
    (
      pointerId: number | "touch",
      clientX: number,
      clientY: number
    ): boolean => {
      const panState = panStateRef.current;
      if (panState.pointerId !== pointerId) {
        return false;
      }

      const deltaX = clientX - panState.startX;
      const deltaY = clientY - panState.startY;
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        didPanRef.current = true;
      }
      updateZoom(
        panState.startPanX + deltaX,
        panState.startPanY + deltaY,
        activeZoom.scale
      );
      return true;
    },
    [activeZoom.scale, updateZoom]
  );

  const endPan = useCallback((pointerId: number | "touch"): void => {
    if (panStateRef.current.pointerId !== pointerId) {
      return;
    }

    panStateRef.current.pointerId = null;
    setPanningKey(null);
  }, []);

  const resetToFitWidth = useCallback((): void => {
    didPanRef.current = true;
    pinchStateRef.current = null;
    setPageFitMode("width");
    setPanningKey(null);
    setZoom(RESTING_VIEWPORT_ZOOM);
  }, [setPageFitMode, setZoom]);

  const registerTap = useCallback(
    (clientX: number, clientY: number): void => {
      const now = Date.now();
      const previousTap = lastTapRef.current;
      if (
        previousTap !== null &&
        previousTap.key === panKey &&
        now - previousTap.time <= DOUBLE_TAP_DELAY_MS &&
        Math.hypot(clientX - previousTap.x, clientY - previousTap.y) <=
          DOUBLE_TAP_DISTANCE_PX
      ) {
        lastTapRef.current = null;
        resetToFitWidth();
        return;
      }

      lastTapRef.current = { key: panKey, time: now, x: clientX, y: clientY };
    },
    [panKey, resetToFitWidth]
  );

  const beginPinch = useCallback(
    (touches: TouchInput): boolean => {
      const pair = getTouchPair(touches);
      if (pair === null) {
        return false;
      }

      const [first, second] = pair;
      const startDistance = getTouchDistance(first, second);
      if (startDistance === 0) {
        return false;
      }

      const center = getTouchCenter(first, second);
      didPanRef.current = false;
      pinchStateRef.current = {
        startCenterX: center.x,
        startCenterY: center.y,
        startDistance,
        startPanX: activePan.x,
        startPanY: activePan.y,
        startScale: activeZoom.scale,
      };
      panStateRef.current.pointerId = null;
      setPanningKey(panKey);
      return true;
    },
    [activePan.x, activePan.y, activeZoom.scale, panKey]
  );

  const movePinch = useCallback(
    (touches: TouchInput): boolean => {
      const pinchState = pinchStateRef.current;
      const pair = getTouchPair(touches);
      if (pinchState === null || pair === null) {
        return false;
      }

      const [first, second] = pair;
      const distance = getTouchDistance(first, second);
      const center = getTouchCenter(first, second);
      const scale = Math.max(
        MIN_ZOOM_SCALE,
        Math.min(
          MAX_ZOOM_SCALE,
          pinchState.startScale * (distance / pinchState.startDistance)
        )
      );
      if (
        Math.abs(center.x - pinchState.startCenterX) > 2 ||
        Math.abs(center.y - pinchState.startCenterY) > 2 ||
        Math.abs(scale - pinchState.startScale) > 0.01
      ) {
        didPanRef.current = true;
      }
      updateZoom(
        pinchState.startPanX + center.x - pinchState.startCenterX,
        pinchState.startPanY + center.y - pinchState.startCenterY,
        scale
      );
      return true;
    },
    [updateZoom]
  );

  const endPinch = useCallback((): void => {
    if (pinchStateRef.current === null) {
      return;
    }

    pinchStateRef.current = null;
    setPanningKey(null);
  }, []);

  const isPinching = useCallback(() => pinchStateRef.current !== null, []);
  const isTouchPanning = useCallback(
    () => panStateRef.current.pointerId === "touch",
    []
  );

  return {
    activePan,
    activeZoom,
    beginPan,
    beginPinch,
    didPanRef,
    endPan,
    endPinch,
    isPannable,
    isPanning: panningKey === panKey,
    isPinching,
    isTouchPanning,
    movePan,
    movePinch,
    registerTap,
  };
};
