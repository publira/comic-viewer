import type { ViewerPage } from "@publira/comic-viewer";
import type { CSSProperties } from "react";

type ViewerStyle = CSSProperties & Record<`--${string}`, string>;

export const getViewerStyle = (
  pages: readonly ViewerPage[]
): ViewerStyle | undefined => {
  const [page] = pages;

  if (
    page?.width === undefined ||
    page.height === undefined ||
    page.width <= 0 ||
    page.height <= 0
  ) {
    return undefined;
  }

  return {
    "--demo-double-page-aspect-ratio": `${page.width * 2} / ${page.height}`,
    "--demo-single-page-aspect-ratio": `${page.width} / ${page.height}`,
  };
};
