"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type {
  DecodedPageImage,
  PageResolver,
  ReadingDirection,
  ViewerPage,
  ViewerPageListProps,
  ViewerPlugin,
  ViewportProps,
} from "@publira/comic-viewer";
import { Children, isValidElement, useMemo } from "react";
import type { PropsWithChildren, ReactNode } from "react";

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
  context.fillText("PUBLIRA DEMO", width - 40, height - 48);

  // The viewer releases the image this one replaces, so the page it was drawn
  // from is not closed here.
  return createImageBitmap(canvas);
};

const watermarkPlugin = ComicViewer.definePlugin({
  afterDecode: ({ image }) => addWatermark(image),
  name: "text-watermark",
});

type ReaderMode = "basic" | "encrypted" | "watermark";

const pluginsForMode: Readonly<Record<ReaderMode, readonly ViewerPlugin[]>> = {
  basic: [],
  encrypted: [encryptedJpegPlugin],
  watermark: [watermarkPlugin],
};

// The reader is given a page list, a page count, or both, exactly as the
// viewer root is, and hands that pair straight through to it. A StartPage, an
// EndPage, or a Toolbar is composed into it as a child, as it is into the
// viewer root.
type TailwindReaderProps = PropsWithChildren<ViewerPageListProps> & {
  /** The controlled zero-based page index, for a host that owns the position. */
  currentIndex?: number;
  /** How many spreads beyond the viewport are loaded ahead of the reader. */
  imagePreloadSpreads?: number;
  initialReadingDirection?: ReadingDirection;
  mode?: ReaderMode;
  /** Called as the reader comes within two pages of the last one. */
  onEndReached?: () => void;
  /** Called when navigation requests a different zero-based page index. */
  onIndexChange?: (index: number) => void;
  /** Plugins composed with the ones the reader mode brings of its own. */
  plugins?: readonly ViewerPlugin[];
  /** Fills the place of a page whose metadata is still being resolved. */
  renderPendingPage?: ViewportProps<ViewerPage>["renderPendingPage"];
  /** Resolves the metadata of a page the reader is approaching. */
  resolvePage?: PageResolver;
  spreadStartIndex?: number;
};

interface ReaderChildren {
  /** The children left once the toolbar is taken out of the tree. */
  children: ReactNode;
  /** The Toolbar written among them, if the page composed one. */
  toolbar?: ReactNode;
}

/**
 * Splits a Toolbar written among the reader children out of the rest of the
 * tree, so a page that wants extra controls composes a toolbar of its own
 * instead of handing its contents to the reader through a prop.
 */
const extractToolbar = (children: ReactNode): ReaderChildren => {
  let toolbar: ReactNode;
  // oxlint-disable-next-line react/no-react-children -- Only Children enumerates the reader children without losing the keys they are rendered with.
  const rest = Children.toArray(children).filter((child) => {
    if (isValidElement(child) && child.type === ComicViewer.Toolbar) {
      toolbar = child;
      return false;
    }

    return true;
  });

  return { children: rest, toolbar };
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
  imagePreloadSpreads,
  initialReadingDirection,
  mode = "basic",
  onEndReached,
  onIndexChange,
  plugins: extraPlugins,
  renderPendingPage,
  resolvePage,
  spreadStartIndex,
  ...pageListProps
}: TailwindReaderProps) => {
  const { children: content, toolbar } = extractToolbar(children);
  // The viewer reloads its pages whenever the plugin list changes identity,
  // so the composed list is only rebuilt when the reader is given a new one.
  const plugins = useMemo(
    () =>
      extraPlugins === undefined
        ? pluginsForMode[mode]
        : [...pluginsForMode[mode], ...extraPlugins],
    [extraPlugins, mode]
  );

  return (
    <ComicViewer.Root
      {...pageListProps}
      currentIndex={currentIndex}
      imagePreloadSpreads={imagePreloadSpreads}
      onEndReached={onEndReached}
      onIndexChange={onIndexChange}
      resolvePage={resolvePage}
      plugins={plugins}
      initialReadingDirection={initialReadingDirection}
      spreadStartIndex={spreadStartIndex}
      className={readerClassNames.root}
    >
      {content}
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
              <ComicViewer.ViewportPage
                className={readerClassNames.viewportPage}
              >
                <ComicViewer.PageCanvas
                  className={readerClassNames.pageCanvas}
                />
              </ComicViewer.ViewportPage>
            </ComicViewer.ViewportPageSlot>
          </ComicViewer.ViewportPageSet>
        </ComicViewer.ViewportTrack>
      </ComicViewer.Viewport>
      {toolbar ?? (
        <ComicViewer.Toolbar className={readerClassNames.toolbar}>
          <ComicViewer.PageProgress className={readerClassNames.pageProgress}>
            <ComicViewer.PageProgressSlider
              className={readerClassNames.pageProgressSlider}
            />
            <ComicViewer.PageStatus className={readerClassNames.pageStatus} />
          </ComicViewer.PageProgress>
        </ComicViewer.Toolbar>
      )}
      <ComicViewer.PageNavigation className={readerClassNames.pageNavigation}>
        <NavigationControls />
      </ComicViewer.PageNavigation>
    </ComicViewer.Root>
  );
};
