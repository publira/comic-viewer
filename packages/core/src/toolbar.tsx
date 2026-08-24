import type { PropsWithChildren } from "react";

import { PageProgress, PageProgressTrack, PageStatus } from "./page-navigation";
import { useControlsHold } from "./use-controls-hold";
import { useViewerContext } from "./viewer-context";

export interface ToolbarProps extends PropsWithChildren {
  className?: string;
}

/**
 * The reader control bar. Supply children to arrange the controls yourself, or
 * omit them to render the reading progress. It follows the reader-control
 * visibility it shares with PageNavigation, and lays its controls out along
 * the reading direction so progress runs the way the reader turns pages.
 */
export const Toolbar = ({ children, className }: ToolbarProps) => {
  const { areControlsVisible, readingDirection } = useViewerContext();
  const holdHandlers = useControlsHold();

  return (
    <div
      {...holdHandlers}
      aria-hidden={!areControlsVisible}
      className={`pcv-toolbar${className === undefined ? "" : ` ${className}`}`}
      data-reading-direction={readingDirection}
      dir={readingDirection}
      inert={!areControlsVisible}
    >
      {children ?? (
        <PageProgress>
          <PageProgressTrack />
          <PageStatus />
        </PageProgress>
      )}
    </div>
  );
};
