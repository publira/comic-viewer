import { composeClassName } from "./class-names";
import { ViewerProvider } from "./viewer-context";
import type { ViewerPage, ViewerProviderProps } from "./viewer-context";

export type ComicViewerProps<TPage extends ViewerPage> =
  ViewerProviderProps<TPage> & {
    className?: string;
  };

/**
 * The viewer root. Import the rest of the API as independent named exports
 * (or via `import * as ComicViewer from "@publira/comic-viewer"` and
 * `ComicViewer.Viewport`, `ComicViewer.PageNavigation`, etc.) so bundlers can
 * tree-shake subcomponents that a consumer never renders.
 */
export const ComicViewer = <TPage extends ViewerPage>({
  children,
  className,
  initialIndex = 0,
  initialViewMode = "double",
  initialReadingDirection = "rtl",
  ...viewerProps
}: ComicViewerProps<TPage>) => (
  <ViewerProvider
    {...viewerProps}
    initialIndex={initialIndex}
    initialViewMode={initialViewMode}
    initialReadingDirection={initialReadingDirection}
  >
    <div className={composeClassName("pcv-root", className)}>{children}</div>
  </ViewerProvider>
);
