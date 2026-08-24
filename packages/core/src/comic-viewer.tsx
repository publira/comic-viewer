import { composeClassName } from "./class-names";
import { ViewerProvider } from "./viewer-context";
import type { ViewerPage, ViewerProviderProps } from "./viewer-context";

export interface ComicViewerProps<
  TPage extends ViewerPage,
> extends ViewerProviderProps<TPage> {
  className?: string;
}

/**
 * The viewer root. Import the rest of the API as independent named exports
 * (or via `import * as ComicViewer from "@publira/comic-viewer"` and
 * `ComicViewer.Viewport`, `ComicViewer.PageNavigation`, etc.) so bundlers can
 * tree-shake subcomponents that a consumer never renders.
 */
export const ComicViewer = <TPage extends ViewerPage>({
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
    <div className={composeClassName("pcv-root", className)}>{children}</div>
  </ViewerProvider>
);
