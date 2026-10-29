import { useCallback, useEffect, useState } from "react";

const CONTROLS_HIDE_DELAY_MS = 2000;

interface ReaderControls {
  areControlsVisible: boolean;
  holdControls: (held: boolean) => void;
  toggleControls: () => void;
}

/**
 * Shows and hides the reader controls, which hide again after a while unless
 * a control holds them open.
 */
export const useReaderControls = (): ReaderControls => {
  const [areControlsVisible, setAreControlsVisible] = useState(false);
  const [controlsHoldCount, setControlsHoldCount] = useState(0);

  const toggleControls = useCallback(() => {
    setAreControlsVisible((areVisible) => !areVisible);
  }, []);

  const holdControls = useCallback((held: boolean) => {
    setControlsHoldCount((count) => Math.max(0, count + (held ? 1 : -1)));
  }, []);

  // A held control keeps its countdown from running at all, so releasing the
  // hold starts a whole fresh window rather than resuming a spent one.
  useEffect(() => {
    if (!areControlsVisible || controlsHoldCount > 0) {
      return;
    }

    const hideTimeout = setTimeout(() => {
      setAreControlsVisible(false);
    }, CONTROLS_HIDE_DELAY_MS);

    return () => {
      clearTimeout(hideTimeout);
    };
  }, [areControlsVisible, controlsHoldCount]);

  return { areControlsVisible, holdControls, toggleControls };
};
