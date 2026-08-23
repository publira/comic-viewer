import {
  NextPageButton,
  PageNavigation,
  PageProgress,
  PageProgressTrack,
  PageProgressTrigger,
  PageStatus,
  PreviousPageButton,
} from "./page-navigation";
import { Toolbar } from "./toolbar";
import { ViewerProvider } from "./viewer-context";
import type { ViewerPage, ViewerProviderProps } from "./viewer-context";
import {
  PageCanvas,
  Viewport,
  ViewportPage,
  ViewportPageSet,
  ViewportPageSlot,
  ViewportTrack,
} from "./viewport";

export interface ComicViewerProps<
  TPage extends ViewerPage,
> extends ViewerProviderProps<TPage> {
  className?: string;
}

const ComicViewerRoot = <TPage extends ViewerPage>({
  children,
  className,
  currentIndex,
  onIndexChange,
  pages,
  plugins,
  initialIndex = 0,
  initialViewMode = "double",
  initialPageFitMode,
  initialReadingDirection = "rtl",
  spreadStartIndex,
}: ComicViewerProps<TPage>) => (
  <ViewerProvider
    pages={pages}
    plugins={plugins}
    currentIndex={currentIndex}
    initialIndex={initialIndex}
    onIndexChange={onIndexChange}
    initialViewMode={initialViewMode}
    initialPageFitMode={initialPageFitMode}
    initialReadingDirection={initialReadingDirection}
    spreadStartIndex={spreadStartIndex}
  >
    <div
      className={`pcv-root${className === undefined ? "" : ` ${className}`}`}
    >
      {children}
    </div>
  </ViewerProvider>
);

export const ComicViewer = Object.assign(ComicViewerRoot, {
  NextPageButton,
  PageCanvas,
  PageNavigation,
  PageProgress,
  PageProgressTrack,
  PageProgressTrigger,
  PageStatus,
  PreviousPageButton,
  Toolbar,
  Viewport,
  ViewportPage,
  ViewportPageSet,
  ViewportPageSlot,
  ViewportTrack,
}) as typeof ComicViewerRoot & {
  NextPageButton: typeof NextPageButton;
  PageNavigation: typeof PageNavigation;
  PageProgress: typeof PageProgress;
  PageProgressTrack: typeof PageProgressTrack;
  PageProgressTrigger: typeof PageProgressTrigger;
  PageStatus: typeof PageStatus;
  PreviousPageButton: typeof PreviousPageButton;
  PageCanvas: typeof PageCanvas;
  Viewport: typeof Viewport;
  ViewportPage: typeof ViewportPage;
  ViewportPageSet: typeof ViewportPageSet;
  ViewportPageSlot: typeof ViewportPageSlot;
  ViewportTrack: typeof ViewportTrack;
  Toolbar: typeof Toolbar;
};
