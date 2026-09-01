import { composeClassName } from "./class-names";
import { ViewerProvider } from "./viewer-context";
import type { ViewerPage, ViewerProviderProps } from "./viewer-context";
import { extractViewerSlotPages } from "./viewer-slots";

export type ComicViewerProps<TPage extends ViewerPage> =
  ViewerProviderProps<TPage> & {
    className?: string;
  };

/**
 * The viewer root. Import the rest of the API as independent named exports
 * (or via `import * as ComicViewer from "@publira/comic-viewer"` and
 * `ComicViewer.Viewport`, `ComicViewer.PageNavigation`, etc.) so bundlers can
 * tree-shake subcomponents that a consumer never renders.
 *
 * A StartPage or an EndPage written among its children is taken out of the
 * tree and handed to the viewport, which shows it at that end of the reading
 * sequence.
 */
export const ComicViewer = <TPage extends ViewerPage>({
  children,
  className,
  initialViewMode = "double",
  initialReadingDirection = "rtl",
  startPage,
  endPage,
  ...viewerProps
}: ComicViewerProps<TPage>) => {
  const slotPages = extractViewerSlotPages(children);

  return (
    <ViewerProvider
      {...viewerProps}
      endPage={endPage ?? slotPages.endPage}
      initialViewMode={initialViewMode}
      initialReadingDirection={initialReadingDirection}
      startPage={startPage ?? slotPages.startPage}
    >
      <div className={composeClassName("pcv-root", className)}>
        {slotPages.children}
      </div>
    </ViewerProvider>
  );
};
