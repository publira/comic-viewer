import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode, TouchEvent } from "react";

import { runDataPipeline, runPageChangeHooks } from "./plugin";
import { useViewMode } from "./use-view-mode";
import { useViewerContext } from "./viewer-context";
import type { ViewerPage } from "./viewer-context";

export const getImageMimeType = (
  url: string,
  mimeType?: string
): string | undefined => {
  if (mimeType?.startsWith("image/")) {
    return mimeType;
  }

  const dataUriMatch = /^data:(?<mimeType>[^;,]+)/u.exec(url);
  if (dataUriMatch?.groups?.mimeType?.startsWith("image/")) {
    return dataUriMatch.groups.mimeType;
  }

  const extension = /\.(?<extension>[a-z0-9]+)(?:[?#]|$)/iu
    .exec(url)
    ?.groups?.extension?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    avif: "image/avif",
    gif: "image/gif",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    svg: "image/svg+xml",
    webp: "image/webp",
  };

  return extension === undefined ? undefined : mimeTypes[extension];
};

type DecodedImage = HTMLImageElement | ImageBitmap;

interface PrefetchedPage {
  buffer: ArrayBuffer;
  src: string;
}

const getImageMimeTypeOrFallback = (
  sourceUrl: string,
  mimeType?: string
): string =>
  getImageMimeType(sourceUrl, mimeType) ?? "application/octet-stream";

const decodeWithImageElement = async (
  buffer: ArrayBuffer,
  mimeType: string
): Promise<HTMLImageElement> => {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += 0x80_00) {
    binary += String.fromCodePoint(...bytes.subarray(offset, offset + 0x80_00));
  }

  const image = new Image();
  image.src = `data:${mimeType};base64,${btoa(binary)}`;
  await image.decode();
  return image;
};

const decodeImage = async (
  buffer: ArrayBuffer,
  sourceUrl: string,
  mimeType?: string
): Promise<DecodedImage> => {
  const imageMimeType = getImageMimeTypeOrFallback(sourceUrl, mimeType);
  const blob = new Blob([buffer], { type: imageMimeType });

  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob);
    } catch {
      // Some browsers cannot decode every image format with createImageBitmap.
    }
  }

  return decodeWithImageElement(buffer, imageMimeType);
};

const closeImageBitmaps = (images: readonly DecodedImage[]): void => {
  for (const image of images) {
    if ("close" in image) {
      image.close();
    }
  }
};

const waitForAnimationFrame = (): Promise<void> =>
  // eslint-disable-next-line promise/avoid-new -- The browser exposes a paint boundary through this callback API.
  new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        resolve();
      });
      return;
    }

    setTimeout(resolve, 0);
  });

const waitForVisiblePaint = async (): Promise<void> => {
  await waitForAnimationFrame();
  await waitForAnimationFrame();
};

interface CanvasPageProps {
  image?: DecodedImage;
  page: ViewerPage;
  placeholder: boolean;
}

const CanvasPage = ({ image, page, placeholder }: CanvasPageProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || image === undefined) {
      return;
    }

    const context = canvas.getContext("2d");
    if (context === null) {
      return;
    }

    const imageHeight =
      "naturalHeight" in image ? image.naturalHeight : image.height;
    const imageWidth =
      "naturalWidth" in image ? image.naturalWidth : image.width;
    canvas.height = page.height ?? imageHeight;
    canvas.width = page.width ?? imageWidth;
    context.filter = placeholder ? "blur(16px)" : "none";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    context.filter = "none";
  }, [image, placeholder]);

  return (
    <canvas
      ref={canvasRef}
      aria-busy={image === undefined || undefined}
      aria-label={page.title ?? page.id}
      data-placeholder={placeholder || undefined}
      height={page.height}
      role="img"
      width={page.width}
    />
  );
};

const defaultRenderPage = (
  page: ViewerPage,
  index: number,
  image: PageImage | undefined
) => (
  <div key={page.id ?? index} className="pcv-page">
    <CanvasPage
      image={image?.bitmap}
      page={page}
      placeholder={image?.placeholder ?? false}
    />
  </div>
);

interface PageImage {
  bitmap: DecodedImage;
  placeholder: boolean;
}

export interface ViewportProps<TPage extends ViewerPage> {
  renderPage?: (page: TPage, index: number) => ReactNode;
  className?: string;
  doublePageThreshold?: number;
}

const EDGE_CLICK_RATIO = 0.3;
const MIN_SWIPE_THRESHOLD_PX = 48;
const SWIPE_THRESHOLD_RATIO = 0.12;

export const Viewport = <TPage extends ViewerPage>({
  renderPage,
  className,
  doublePageThreshold,
}: ViewportProps<TPage>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStateRef = useRef<{
    startX: number;
    currentX: number;
    active: boolean;
  }>({
    active: false,
    currentX: 0,
    startX: 0,
  });
  const { pages, plugins, currentIndex, readingDirection, goToNext, goToPrev } =
    useViewerContext<TPage>();
  const viewMode = useViewMode(containerRef, doublePageThreshold);
  const [pageImages, setPageImages] = useState<ReadonlyMap<number, PageImage>>(
    () => new Map()
  );
  const [pageImagesKey, setPageImagesKey] = useState("");
  const prefetchedPagesRef = useRef<Map<number, PrefetchedPage>>(new Map());

  const goByHorizontalDirection = (direction: "left" | "right"): void => {
    if (direction === "left") {
      if (readingDirection === "rtl") {
        goToNext();
      } else {
        goToPrev();
      }
      return;
    }

    if (readingDirection === "rtl") {
      goToPrev();
    } else {
      goToNext();
    }
  };

  const goBySwipeDirection = (swipeDirection: "left" | "right"): void => {
    if (swipeDirection === "left") {
      goToNext();
      return;
    }

    goToPrev();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "ArrowLeft") {
        goByHorizontalDirection("left");
      } else if (event.key === "ArrowRight") {
        goByHorizontalDirection("right");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [readingDirection, goToNext, goToPrev]);

  const handleEdgeClick = (event: MouseEvent<HTMLDivElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const edgeWidth = rect.width * EDGE_CLICK_RATIO;

    if (offsetX <= edgeWidth) {
      goByHorizontalDirection("left");
      return;
    }

    if (offsetX >= rect.width - edgeWidth) {
      goByHorizontalDirection("right");
    }
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>): void => {
    const [touch] = Object.values(event.touches);
    if (touch === undefined) {
      return;
    }

    touchStateRef.current = {
      active: true,
      currentX: touch.clientX,
      startX: touch.clientX,
    };
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>): void => {
    if (!touchStateRef.current.active) {
      return;
    }

    const [touch] = Object.values(event.touches);
    if (touch === undefined) {
      return;
    }

    touchStateRef.current.currentX = touch.clientX;
  };

  const handleTouchEnd = (): void => {
    if (!touchStateRef.current.active) {
      return;
    }

    const containerWidth = containerRef.current?.clientWidth ?? 0;
    const threshold = Math.max(
      MIN_SWIPE_THRESHOLD_PX,
      containerWidth * SWIPE_THRESHOLD_RATIO
    );
    const deltaX =
      touchStateRef.current.currentX - touchStateRef.current.startX;

    touchStateRef.current.active = false;

    if (Math.abs(deltaX) < threshold) {
      return;
    }

    goBySwipeDirection(deltaX > 0 ? "right" : "left");
  };

  const visibleIndices: number[] = [currentIndex];
  if (viewMode === "double" && currentIndex + 1 < pages.length) {
    visibleIndices.push(currentIndex + 1);
  }

  // In RTL mode the next page visually appears on the left side
  const orderedIndices =
    readingDirection === "rtl" && visibleIndices.length === 2
      ? [visibleIndices[1], visibleIndices[0]]
      : visibleIndices;

  const pageSourceKey = visibleIndices
    .map((index) => `${index}:${pages[index]?.src ?? ""}`)
    .join("|");
  const activePageImages =
    pageImagesKey === pageSourceKey ? pageImages : new Map<number, PageImage>();

  useEffect(() => {
    const notifyPageChange = async (): Promise<void> => {
      try {
        await runPageChangeHooks(plugins, currentIndex, pages.length);
      } catch {
        // Page-change reporting must not make the viewer unusable.
      }
    };

    void notifyPageChange();
  }, [currentIndex, pages.length, plugins]);

  useEffect(() => {
    if (renderPage !== undefined) {
      return;
    }

    let disposed = false;
    const imageBitmaps: DecodedImage[] = [];
    setPageImages(new Map());
    setPageImagesKey(pageSourceKey);

    const getPageBuffer = (
      index: number,
      page: TPage
    ): Promise<ArrayBuffer> => {
      const prefetchedPage = prefetchedPagesRef.current.get(index);
      if (prefetchedPage?.src === page.src) {
        prefetchedPagesRef.current.delete(index);
        return Promise.resolve(prefetchedPage.buffer);
      }

      return runDataPipeline(page.src, plugins);
    };

    const setPageImage = (index: number, image: PageImage): void => {
      if (!disposed) {
        setPageImages(
          (currentImages) => new Map([...currentImages, [index, image]])
        );
      }
    };

    const loadPages = async (): Promise<void> => {
      try {
        await Promise.all(
          visibleIndices.map(async (index) => {
            const page = pages[index];
            const placeholderUrl = page.placeholder;

            if (placeholderUrl !== undefined) {
              const placeholderBuffer = await runDataPipeline(
                placeholderUrl,
                []
              );
              const placeholderBitmap = await decodeImage(
                placeholderBuffer,
                placeholderUrl
              );
              imageBitmaps.push(placeholderBitmap);
              setPageImage(index, {
                bitmap: placeholderBitmap,
                placeholder: true,
              });
              await waitForVisiblePaint();

              if (disposed) {
                return;
              }
            }

            const buffer = await getPageBuffer(index, page);
            const image = await decodeImage(buffer, page.src, page.mimeType);
            imageBitmaps.push(image);
            setPageImage(index, { bitmap: image, placeholder: false });
          })
        );
      } catch {
        // Keep a decoded placeholder visible when the full page cannot load.
      }
    };

    const prefetchPages = async (): Promise<void> => {
      const firstPrefetchIndex = currentIndex + visibleIndices.length;
      const prefetchIndices = [firstPrefetchIndex, firstPrefetchIndex + 1];

      await Promise.all(
        prefetchIndices.map(async (index) => {
          const page = pages[index];
          if (page === undefined) {
            return;
          }

          const existingPage = prefetchedPagesRef.current.get(index);
          if (existingPage?.src === page.src) {
            return;
          }

          try {
            const buffer = await runDataPipeline(page.src, plugins);
            if (!disposed) {
              prefetchedPagesRef.current.set(index, {
                buffer,
                src: page.src,
              });
            }
          } catch {
            // A failed prefetch must not affect the current page.
          }
        })
      );
    };

    void loadPages();
    void prefetchPages();

    return () => {
      disposed = true;
      closeImageBitmaps(imageBitmaps);
    };
  }, [pageSourceKey, plugins, renderPage]);

  return (
    <div
      ref={containerRef}
      className={`pcv-viewport${className === undefined ? "" : ` ${className}`}`}
      data-reading-direction={readingDirection}
      data-view-mode={viewMode}
      data-page-count={orderedIndices.length}
      onClick={handleEdgeClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {orderedIndices.map((index) => (
        <Fragment key={index}>
          {renderPage === undefined
            ? defaultRenderPage(
                pages[index],
                index,
                activePageImages.get(index)
              )
            : renderPage(pages[index], index)}
        </Fragment>
      ))}
    </div>
  );
};
