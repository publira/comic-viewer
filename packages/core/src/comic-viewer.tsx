import {
  ActualSizeButton,
  FitHeightButton,
  FitWidthButton,
  PageFitModeControls,
} from "./page-fit-mode";
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
import { PageCanvas, Viewport, ViewportPage } from "./viewport";

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
  ActualSizeButton,
  FitHeightButton,
  FitWidthButton,
  NextPageButton,
  PageCanvas,
  PageFitModeControls,
  PageNavigation,
  PageProgress,
  PageProgressTrack,
  PageProgressTrigger,
  PageStatus,
  PreviousPageButton,
  Toolbar,
  Viewport,
  ViewportPage,
}) as typeof ComicViewerRoot & {
  ActualSizeButton: typeof ActualSizeButton;
  FitHeightButton: typeof FitHeightButton;
  FitWidthButton: typeof FitWidthButton;
  NextPageButton: typeof NextPageButton;
  PageNavigation: typeof PageNavigation;
  PageProgress: typeof PageProgress;
  PageProgressTrack: typeof PageProgressTrack;
  PageProgressTrigger: typeof PageProgressTrigger;
  PageStatus: typeof PageStatus;
  PreviousPageButton: typeof PreviousPageButton;
  PageCanvas: typeof PageCanvas;
  PageFitModeControls: typeof PageFitModeControls;
  Viewport: typeof Viewport;
  ViewportPage: typeof ViewportPage;
  Toolbar: typeof Toolbar;
};
