import type { PropsWithChildren } from "react";

import { PageProgress, PageProgressTrack, PageStatus } from "./page-navigation";
import { useViewerContext } from "./viewer-context";

export interface ToolbarProps extends PropsWithChildren {
  className?: string;
}

/**
 * The reader control bar. Supply children to arrange the controls yourself, or
 * omit them to render the reading progress. It follows the reader-control
 * visibility it shares with PageNavigation.
 */
export const Toolbar = ({ children, className }: ToolbarProps) => {
  const { areControlsVisible } = useViewerContext();

  return (
    <div
      aria-hidden={!areControlsVisible}
      className={`pcv-toolbar${className === undefined ? "" : ` ${className}`}`}
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
