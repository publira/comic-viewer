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
 * A StartPage or an EndPage written among its children is shown at that end of
 * the reading sequence rather than where it stands.
 */
export const ComicViewer = <TPage extends ViewerPage>({
  children,
  className,
  initialViewMode = "double",
  initialReadingDirection = "rtl",
  ...viewerProps
}: ComicViewerProps<TPage>) => {
  // The root element holds the reader itself, so the slot pages are lifted out
  // of it and left among the children the provider reads them from.
  const {
    children: content,
    endPage,
    startPage,
  } = extractViewerSlotPages(children);

  return (
    <ViewerProvider
      {...viewerProps}
      initialViewMode={initialViewMode}
      initialReadingDirection={initialReadingDirection}
    >
      {startPage}
      {endPage}
      <div className={composeClassName("pcv-root", className)}>{content}</div>
    </ViewerProvider>
  );
};
