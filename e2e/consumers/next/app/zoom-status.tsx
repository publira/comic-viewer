"use client";

import * as ComicViewer from "@publira/comic-viewer";

export const ZoomStatus = () => {
  const { resetZoom, zoomScale } = ComicViewer.useViewerContext();

  return (
    <button disabled={zoomScale === 1} onClick={resetZoom} type="button">
      {Math.round(zoomScale * 100)}%
    </button>
  );
};
