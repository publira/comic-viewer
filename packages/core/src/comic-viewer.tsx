import {
  NextPageButton,
  PageNavigation,
  PageProgress,
  PageProgressTrigger,
  PageStatus,
  PreviousPageButton,
} from "./page-navigation";
import { Toolbar } from "./toolbar";
import { ViewerProvider } from "./viewer-context";
import type { ViewerPage, ViewerProviderProps } from "./viewer-context";
import { Viewport } from "./viewport";

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
  PageNavigation,
  PageProgress,
  PageProgressTrigger,
  PageStatus,
  PreviousPageButton,
  Toolbar,
  Viewport,
}) as typeof ComicViewerRoot & {
  NextPageButton: typeof NextPageButton;
  PageNavigation: typeof PageNavigation;
  PageProgress: typeof PageProgress;
  PageProgressTrigger: typeof PageProgressTrigger;
  PageStatus: typeof PageStatus;
  PreviousPageButton: typeof PreviousPageButton;
  Viewport: typeof Viewport;
  Toolbar: typeof Toolbar;
};
