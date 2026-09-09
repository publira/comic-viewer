"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { DecodedPageImage, ViewerPage } from "@publira/comic-viewer";

import styles from "../page.module.css";

const watermarkText = "PUBLIRA DEMO";

/** Draws the watermark onto the decoded page and hands back the new image. */
const addWatermark = (image: DecodedPageImage): Promise<ImageBitmap> => {
  const height = "naturalHeight" in image ? image.naturalHeight : image.height;
  const width = "naturalWidth" in image ? image.naturalWidth : image.width;
  const canvas = document.createElement("canvas");
  canvas.height = height;
  canvas.width = width;

  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("Canvas 2D rendering is unavailable.");
  }

  context.drawImage(image, 0, 0);
  context.fillStyle = "rgba(0, 0, 0, 0.45)";
  context.fillRect(0, height - 96, width, 96);
  context.fillStyle = "rgba(255, 255, 255, 0.88)";
  context.font = "600 32px system-ui, sans-serif";
  context.textAlign = "right";
  context.textBaseline = "middle";
  context.fillText(watermarkText, width - 40, height - 48);

  // The viewer releases the image this one replaces, so the page it was drawn
  // from is not closed here.
  return createImageBitmap(canvas);
};

const watermarkPlugin = ComicViewer.definePlugin({
  afterDecode: ({ image }) => addWatermark(image),
  name: "text-watermark",
});

const plugins = [watermarkPlugin] as const;

interface WatermarkedComicViewerProps {
  pages: readonly ViewerPage[];
}

/** Renders the watermarking plugin demo with the shared canvas viewer. */
export const WatermarkedComicViewer = ({
  pages,
}: WatermarkedComicViewerProps) => (
  <ComicViewer.Root
    pages={pages}
    plugins={plugins}
    className={styles.viewerContent}
  >
    <ComicViewer.Viewport />
    <ComicViewer.Toolbar />
    <ComicViewer.PageNavigation />
  </ComicViewer.Root>
);
