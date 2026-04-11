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
  initialIndex = 0,
  initialViewMode = "double",
  initialReadingDirection = "rtl",
}: ComicViewerProps<TPage>) => (
  <ViewerProvider
    pages={pages}
    initialIndex={initialIndex}
    initialViewMode={initialViewMode}
    initialReadingDirection={initialReadingDirection}
  >
    <div
      className={`pcv-root${className === undefined ? "" : ` ${className}`}`}
    >
      {children}
    </div>
  </ViewerProvider>
);

export const ComicViewer = Object.assign(ComicViewerRoot, {
  Toolbar,
  Viewport,
}) as typeof ComicViewerRoot & {
  Viewport: typeof Viewport;
  Toolbar: typeof Toolbar;
};
