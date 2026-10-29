import type { JSX } from "react";

import { useViewerContext } from "./viewer-context";

/** Shows the reading position the viewer holds, for a test to read back. */
export const CurrentIndexIndicator = (): JSX.Element => {
  const { currentIndex } = useViewerContext();

  return <div data-testid="current-index">{currentIndex}</div>;
};
