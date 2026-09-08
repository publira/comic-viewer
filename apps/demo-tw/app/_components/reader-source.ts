import { readerClassNames } from "./reader-class-names";

/**
 * The reader every demo page builds on, as source for a code panel.
 *
 * The classes are interpolated from the same constants the component itself
 * uses, so the snippet stays in step with what the demo renders. The other
 * pages show only what their topic adds and import this reader as `./reader`.
 */
export const readerSourceCode = `import * as ComicViewer from "@publira/comic-viewer";
import { Children, isValidElement } from "react";

const NavigationIcon = ({ path }) => (
  <svg
    aria-hidden="true"
    className="${readerClassNames.navigationIcon}"
    viewBox="0 0 24 24"
  >
    <path d={path} />
  </svg>
);

// The icons point the way a page turn goes, which the viewer context reports.
const NavigationControls = () => {
  const { readingDirection } = ComicViewer.useViewerContext();
  const previousIcon =
    readingDirection === "rtl" ? "m10 6 6 6-6 6" : "m14 6-6 6 6 6";
  const nextIcon =
    readingDirection === "rtl" ? "m14 6-6 6 6 6" : "m10 6 6 6-6 6";

  return (
    <>
      <ComicViewer.PreviousPageButton className="${readerClassNames.previousPageButton}">
        <NavigationIcon path={previousIcon} />
      </ComicViewer.PreviousPageButton>
      <ComicViewer.NextPageButton className="${readerClassNames.nextPageButton}">
        <NavigationIcon path={nextIcon} />
      </ComicViewer.NextPageButton>
    </>
  );
};

// A Toolbar written among the children takes the place of the default one, so
// a page adds controls by composing a toolbar rather than through a prop.
const extractToolbar = (children) => {
  let toolbar;
  const rest = Children.toArray(children).filter((child) => {
    if (isValidElement(child) && child.type === ComicViewer.Toolbar) {
      toolbar = child;
      return false;
    }

    return true;
  });

  return { children: rest, toolbar };
};

// A StartPage or an EndPage is composed into the reader as a child, exactly as
// it is into the viewer root, and every other prop is handed straight through.
export const Reader = ({ children, renderPendingPage, ...props }) => {
  const { children: content, toolbar } = extractToolbar(children);

  return (
    <ComicViewer.Root {...props} className="${readerClassNames.root}">
      {content}
      <ComicViewer.Viewport
        renderPendingPage={renderPendingPage}
        className="${readerClassNames.viewport}"
      >
        <ComicViewer.ViewportTrack className="${readerClassNames.viewportTrack}">
          <ComicViewer.ViewportPageSet className="${readerClassNames.viewportPageSet}">
            <ComicViewer.ViewportPageSlot className="${readerClassNames.viewportPageSlot}">
              <ComicViewer.ViewportPage className="${readerClassNames.viewportPage}">
                <ComicViewer.PageCanvas className="${readerClassNames.pageCanvas}" />
              </ComicViewer.ViewportPage>
            </ComicViewer.ViewportPageSlot>
          </ComicViewer.ViewportPageSet>
        </ComicViewer.ViewportTrack>
      </ComicViewer.Viewport>
      {toolbar ?? (
        <ComicViewer.Toolbar className="${readerClassNames.toolbar}">
          <ComicViewer.PageProgress className="${readerClassNames.pageProgress}">
            <ComicViewer.PageProgressSlider className="${readerClassNames.pageProgressSlider}" />
            <ComicViewer.PageStatus className="${readerClassNames.pageStatus}" />
          </ComicViewer.PageProgress>
        </ComicViewer.Toolbar>
      )}
      <ComicViewer.PageNavigation className="${readerClassNames.pageNavigation}">
        <NavigationControls />
      </ComicViewer.PageNavigation>
    </ComicViewer.Root>
  );
};`;
