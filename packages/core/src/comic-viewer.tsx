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
  pages,
  plugins,
  initialIndex = 0,
  initialViewMode = "double",
  initialReadingDirection = "rtl",
  spreadStartIndex,
}: ComicViewerProps<TPage>) => (
  <ViewerProvider
    pages={pages}
    plugins={plugins}
    initialIndex={initialIndex}
    initialViewMode={initialViewMode}
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
  Toolbar: typeof Toolbar;
};
