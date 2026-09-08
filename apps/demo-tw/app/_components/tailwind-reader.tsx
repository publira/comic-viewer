"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type {
  PageResolver,
  ReadingDirection,
  ViewerPage,
  ViewerPageListProps,
  ViewerPlugin,
  ViewportProps,
} from "@publira/comic-viewer";
import type { PropsWithChildren } from "react";

import { readerClassNames } from "./reader-class-names";

const encryptionKey = new Uint8Array([
  45, 128, 94, 16, 201, 73, 5, 164, 220, 39, 177, 8, 93, 251, 14, 66, 57, 186,
  109, 34, 240, 12, 154, 80, 28, 198, 71, 115, 9, 166, 42, 203,
]);
const initializationVectorLength = 12;

const getEncryptionKey = (usage: KeyUsage) =>
  crypto.subtle.importKey("raw", encryptionKey, "AES-GCM", false, [usage]);

const decryptPage = async (
  encryptedBuffer: ArrayBuffer
): Promise<ArrayBuffer> => {
  const encryptedPage = new Uint8Array(encryptedBuffer);
  const initializationVector = encryptedPage.slice(
    0,
    initializationVectorLength
  );

  return crypto.subtle.decrypt(
    { iv: initializationVector, name: "AES-GCM" },
    await getEncryptionKey("decrypt"),
    encryptedPage.slice(initializationVectorLength)
  );
};

const encryptedJpegPlugin = ComicViewer.definePlugin({
  afterFetch: ({ buffer }) => decryptPage(buffer),
  customFetch: async ({ signal, url }) => {
    const response = await fetch(url, { signal });

    if (!response.ok) {
      throw new Error(`Failed to fetch encrypted page: ${response.status}`);
    }

    return response.arrayBuffer();
  },
  name: "encrypted-jpeg",
});

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
  context.fillText("PUBLIRA DEMO", canvas.width - 40, canvas.height - 48);
  source.close();

  return canvasToBuffer(canvas);
};

const watermarkPlugin = ComicViewer.definePlugin({
  afterFetch: ({ buffer }) => addWatermark(buffer),
  name: "text-watermark",
});

type ReaderMode = "basic" | "encrypted" | "watermark";

const pluginsForMode: Readonly<Record<ReaderMode, readonly ViewerPlugin[]>> = {
  basic: [],
  encrypted: [encryptedJpegPlugin],
  watermark: [watermarkPlugin],
};

// The reader is given a page list, a page count, or both, exactly as the
// viewer root is, and hands that pair straight through to it. A StartPage or
// an EndPage is composed into it as a child, as it is into the viewer root.
type TailwindReaderProps = PropsWithChildren<ViewerPageListProps> & {
  /** The controlled zero-based page index, for a host that owns the position. */
  currentIndex?: number;
  initialReadingDirection?: ReadingDirection;
  mode?: ReaderMode;
  /** Called as the reader comes within two pages of the last one. */
  onEndReached?: () => void;
  /** Called when navigation requests a different zero-based page index. */
  onIndexChange?: (index: number) => void;
  /** Fills the place of a page whose metadata is still being resolved. */
  renderPendingPage?: ViewportProps<ViewerPage>["renderPendingPage"];
  /** Resolves the metadata of a page the reader is approaching. */
  resolvePage?: PageResolver;
  spreadStartIndex?: number;
};

const NavigationIcon = ({ path }: { path: string }) => (
  <svg
    aria-hidden="true"
    className={readerClassNames.navigationIcon}
    viewBox="0 0 24 24"
  >
    <path d={path} />
  </svg>
);

/** Renders direction-aware navigation icons using the public viewer context. */
const NavigationControls = () => {
  const { readingDirection } = ComicViewer.useViewerContext();
  const previousIcon =
    readingDirection === "rtl" ? "m10 6 6 6-6 6" : "m14 6-6 6 6 6";
  const nextIcon =
    readingDirection === "rtl" ? "m14 6-6 6 6 6" : "m10 6 6 6-6 6";

  return (
    <>
      <ComicViewer.PreviousPageButton
        className={readerClassNames.previousPageButton}
      >
        <NavigationIcon path={previousIcon} />
      </ComicViewer.PreviousPageButton>
      <ComicViewer.NextPageButton className={readerClassNames.nextPageButton}>
        <NavigationIcon path={nextIcon} />
      </ComicViewer.NextPageButton>
    </>
  );
};

/** Renders the viewer entirely with Tailwind utilities and public primitives. */
export const TailwindReader = ({
  children,
  currentIndex,
  initialReadingDirection,
  mode = "basic",
  onEndReached,
  onIndexChange,
  renderPendingPage,
  resolvePage,
  spreadStartIndex,
  ...pageListProps
}: TailwindReaderProps) => (
  <ComicViewer.Root
    {...pageListProps}
    currentIndex={currentIndex}
    onEndReached={onEndReached}
    onIndexChange={onIndexChange}
    resolvePage={resolvePage}
    plugins={pluginsForMode[mode]}
    initialReadingDirection={initialReadingDirection}
    spreadStartIndex={spreadStartIndex}
    className={readerClassNames.root}
  >
    {children}
    <ComicViewer.Viewport
      renderPendingPage={renderPendingPage}
      className={readerClassNames.viewport}
    >
      <ComicViewer.ViewportTrack className={readerClassNames.viewportTrack}>
        <ComicViewer.ViewportPageSet
          className={readerClassNames.viewportPageSet}
        >
          <ComicViewer.ViewportPageSlot
            className={readerClassNames.viewportPageSlot}
          >
            <ComicViewer.ViewportPage className={readerClassNames.viewportPage}>
              <ComicViewer.PageCanvas className={readerClassNames.pageCanvas} />
            </ComicViewer.ViewportPage>
          </ComicViewer.ViewportPageSlot>
        </ComicViewer.ViewportPageSet>
      </ComicViewer.ViewportTrack>
    </ComicViewer.Viewport>
    <ComicViewer.Toolbar className={readerClassNames.toolbar}>
      <ComicViewer.PageProgress className={readerClassNames.pageProgress}>
        <ComicViewer.PageProgressSlider
          className={readerClassNames.pageProgressSlider}
        />
        <ComicViewer.PageStatus className={readerClassNames.pageStatus} />
      </ComicViewer.PageProgress>
    </ComicViewer.Toolbar>
    <ComicViewer.PageNavigation className={readerClassNames.pageNavigation}>
      <NavigationControls />
    </ComicViewer.PageNavigation>
  </ComicViewer.Root>
);
