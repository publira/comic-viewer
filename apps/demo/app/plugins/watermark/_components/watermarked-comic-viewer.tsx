"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage } from "@publira/comic-viewer";

import styles from "../page.module.css";

const watermarkText = "PUBLIRA DEMO";

/** Encodes the composited canvas as a JPEG buffer for the render pipeline. */
const canvasToBuffer = (canvas: HTMLCanvasElement): Promise<ArrayBuffer> =>
  // eslint-disable-next-line promise/avoid-new -- HTMLCanvasElement exposes encoding through this callback API.
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob === null) {
          reject(new Error("Failed to encode the watermarked page."));
          return;
        }

        void (async () => {
          try {
            resolve(await blob.arrayBuffer());
          } catch (error) {
            reject(error);
          }
        })();
      },
      "image/jpeg",
      0.92
    );
  });

/** Draws the watermark before returning the transformed JPEG page buffer. */
const addWatermark = async (buffer: ArrayBuffer): Promise<ArrayBuffer> => {
  const source = await createImageBitmap(
    new Blob([buffer], { type: "image/jpeg" })
  );
  const canvas = document.createElement("canvas");
  canvas.height = source.height;
  canvas.width = source.width;

  const context = canvas.getContext("2d");
  if (context === null) {
    source.close();
    throw new Error("Canvas 2D rendering is unavailable.");
  }

  context.drawImage(source, 0, 0);
  context.fillStyle = "rgba(0, 0, 0, 0.45)";
  context.fillRect(0, canvas.height - 96, canvas.width, 96);
  context.fillStyle = "rgba(255, 255, 255, 0.88)";
  context.font = "600 32px system-ui, sans-serif";
  context.textAlign = "right";
  context.textBaseline = "middle";
  context.fillText(watermarkText, canvas.width - 40, canvas.height - 48);
  source.close();

  return canvasToBuffer(canvas);
};

const watermarkPlugin = ComicViewer.definePlugin({
  afterFetch: ({ buffer }) => addWatermark(buffer),
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
