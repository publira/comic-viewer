import type { PropsWithChildren } from "react";

import { composeClassName } from "./class-names";
import {
  PageProgress,
  PageProgressSlider,
  PageStatus,
} from "./page-navigation";
import { useControlsHold } from "./use-controls-hold";
import { useViewerContext } from "./viewer-context";

export interface ToolbarProps extends PropsWithChildren {
  className?: string;
}

/**
 * The reader control bar. Supply children to arrange the controls yourself, or
 * omit them to render the reading progress as a draggable slider. It follows
 * the reader-control visibility it shares with PageNavigation, and lays its
 * controls out along the reading direction so progress runs the way the reader
 * turns pages. Compose PageProgressTrack in place of the slider for a
 * display-only progress bar.
 */
export const Toolbar = ({ children, className }: ToolbarProps) => {
  const { areControlsVisible, readingDirection } = useViewerContext();
  const holdHandlers = useControlsHold();

  return (
    <div
      {...holdHandlers}
      aria-hidden={!areControlsVisible}
      className={composeClassName("pcv-toolbar", className)}
      data-reading-direction={readingDirection}
      dir={readingDirection}
      inert={!areControlsVisible}
    >
      {children ?? (
        <PageProgress>
          <PageProgressSlider />
          <PageStatus />
        </PageProgress>
      )}
    </div>
  );
};
