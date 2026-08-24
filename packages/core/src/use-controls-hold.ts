import { useCallback, useEffect, useRef, useState } from "react";

import { useViewerContext } from "./viewer-context";

export interface ControlsHoldHandlers {
  onBlur: () => void;
  onFocus: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

/**
 * Returns the handlers that keep a reader-control container from hiding while
 * a pointer rests on it or focus sits inside it. A touch reports the same
 * pointer hold for the length of the tap, so releasing a button restarts the
 * countdown instead of letting it run out mid-interaction.
 */
export const useControlsHold = (): ControlsHoldHandlers => {
  const { holdControls } = useViewerContext();
  const [isHeld, setIsHeld] = useState(false);
  const hasFocusRef = useRef(false);
  const hasPointerRef = useRef(false);

  // Releasing the hold through the cleanup keeps the provider's hold count
  // balanced even when the container unmounts while it is still held.
  useEffect(() => {
    if (!isHeld) {
      return;
    }

    holdControls(true);
    return () => {
      holdControls(false);
    };
  }, [holdControls, isHeld]);

  const syncHold = useCallback(() => {
    setIsHeld(hasFocusRef.current || hasPointerRef.current);
  }, []);

  const onBlur = useCallback(() => {
    hasFocusRef.current = false;
    syncHold();
  }, [syncHold]);
  const onFocus = useCallback(() => {
    hasFocusRef.current = true;
    syncHold();
  }, [syncHold]);
  const onPointerEnter = useCallback(() => {
    hasPointerRef.current = true;
    syncHold();
  }, [syncHold]);
  const onPointerLeave = useCallback(() => {
    hasPointerRef.current = false;
    syncHold();
  }, [syncHold]);

  return { onBlur, onFocus, onPointerEnter, onPointerLeave };
};
